import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const roles = { user: "user", host: "host" } as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mode: string }> },
) {
  const { mode } = await params;
  const role = roles[mode as keyof typeof roles];
  if (!role) return NextResponse.json({ error: "Invalid account type." }, { status: 400 });

  const form = await request.formData();

  const legalName = String(form.get("legal_name") ?? "").trim();
  const dateOfBirth = String(form.get("date_of_birth") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const aadhaarLast4 = String(form.get("aadhaar_last4") ?? "").replace(/\\D/g, "").slice(-4);
  const payoutUpi = String(form.get("payout_upi") ?? "").trim();
  const payoutBankName = String(form.get("payout_bank_name") ?? "").trim();
  const payoutAccountHolder = String(form.get("payout_account_holder") ?? "").trim();
  const payoutAccountLast4 = String(form.get("payout_account_last4") ?? "").replace(/\\D/g, "").slice(-4);
  const payoutIfsc = String(form.get("payout_ifsc") ?? "").trim().toUpperCase();
  const agreementVersion = String(form.get("agreement_version") ?? "").trim();
  const agreementAccepted = form.get("agreement_accepted") === "true";

  if (role === "host") {
    if (!legalName || !dateOfBirth || !phone) {
      return NextResponse.json({ error: "Legal name, date of birth and mobile number are required." }, { status: 400 });
    }

    const dob = new Date(`${dateOfBirth}T00:00:00`);
    if (Number.isNaN(dob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }

    const today = new Date();
    let age = today.getUTCFullYear() - dob.getUTCFullYear();
    const month = today.getUTCMonth() - dob.getUTCMonth();
    if (month < 0 || (month === 0 && today.getUTCDate() < dob.getUTCDate())) age--;

    if (age < 18) {
      return NextResponse.json({ error: "Host registration is restricted to users aged 18 or above." }, { status: 403 });
    }

    if (!aadhaarLast4 || aadhaarLast4.length !== 4) {
      return NextResponse.json({ error: "Aadhaar last 4 digits are required for KYC verification." }, { status: 400 });
    }

    if (!payoutUpi && (!payoutBankName || !payoutAccountHolder || !payoutAccountLast4 || !payoutIfsc)) {
      return NextResponse.json({ error: "Enter a valid UPI ID or complete bank payout details." }, { status: 400 });
    }

    if (!agreementAccepted || !agreementVersion) {
      return NextResponse.json({ error: "You must accept the current Host Agreement before submitting." }, { status: 400 });
    }
  }
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const signupIntent = crypto.randomUUID();
  const { error: intentError } = await admin.from("ishqiya_signup_intents").insert({
    token: signupIntent,
    email,
    role,
  });
  if (intentError) return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { signup_intent: signupIntent } },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data.user) return NextResponse.json({ error: "Account creation failed." }, { status: 500 });

  if (role === "host") {
    const { error: profileUpdateError } = await admin
      .from("host_profiles")
      .update({
        phone: phone || null,
      legal_name: legalName,
        date_of_birth: dateOfBirth,
        age_verified: true,
        kyc_status: "submitted",
        kyc_reference: `AADHAAR-LAST4:${aadhaarLast4}`,
        payout_upi: payoutUpi || null,
        payout_bank_name: payoutBankName || null,
        payout_account_holder: payoutAccountHolder || null,
        payout_account_last4: payoutAccountLast4 || null,
        payout_ifsc: payoutIfsc || null,
        onboarding_status: "under_review",
        agreement_required: false,
      })
      .eq("id", data.user.id);

    if (profileUpdateError) {
      return NextResponse.json({ error: "Host onboarding details could not be saved." }, { status: 500 });
    }

    const { data: agreement } = await admin
      .from("host_agreement_versions")
      .select("id")
      .eq("version", agreementVersion)
      .eq("active", true)
      .maybeSingle();

    if (!agreement) {
      return NextResponse.json({ error: "The selected Host Agreement is no longer active." }, { status: 400 });
    }

    const { error: acceptanceError } = await admin
      .from("host_agreement_acceptances")
      .insert({
        host_id: data.user.id,
        agreement_version_id: agreement.id,
        accepted: true,
      });

    if (acceptanceError && acceptanceError.code !== "23505") {
      return NextResponse.json({ error: "Host Agreement acceptance could not be recorded." }, { status: 500 });
    }

    for (let index = 0; index < 3; index += 1) {
      const photo = form.get(`photo-${index + 1}`);
      if (!(photo instanceof File) || photo.size === 0) {
        return NextResponse.json({ error: "All 3 Host photos are required." }, { status: 400 });
      }
      const storagePath = `${data.user.id}/${crypto.randomUUID()}-${index + 1}`;
      const { error: uploadError } = await admin.storage.from("host-verification").upload(storagePath, photo, { contentType: photo.type, upsert: false });
      if (uploadError) return NextResponse.json({ error: `Photo ${index + 1} could not be uploaded.` }, { status: 500 });
      const { error: photoError } = await admin.from("host_verification_photos").insert({ host_id: data.user.id, photo_number: index + 1, storage_path: storagePath });
      if (photoError) return NextResponse.json({ error: `Photo ${index + 1} could not be registered.` }, { status: 500 });
    }
  }

  return NextResponse.json({ user: data.user, session: data.session, role });
}
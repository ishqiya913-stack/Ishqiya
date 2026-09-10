import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function calculateAge(dateOfBirth: string) {
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const month = today.getUTCMonth() - dob.getUTCMonth();
  if (month < 0 || (month === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const dateOfBirth = typeof body?.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
    if (!dateOfBirth) return NextResponse.json({ error: "Date of birth is required." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });

    const dob = new Date(`${dateOfBirth}T00:00:00Z`);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }
    const age = calculateAge(dateOfBirth);
    if (age < 18) return NextResponse.json({ error: "Ishqiya is restricted to users aged 18 or above." }, { status: 403 });

    const admin = createAdminClient();
    const token = crypto.randomUUID();
    const internalEmail = `fast-login:${token}@internal.ishqiya`;

    const { error: intentError } = await admin.from("ishqiya_signup_intents").insert({ token, email: internalEmail, role: "user" });
    if (intentError) return NextResponse.json({ error: "Fast Login could not be prepared." }, { status: 503 });

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInAnonymously({ options: { data: { signup_intent: token } } });
    if (error || !data.user || !data.session) {
      await admin.from("ishqiya_signup_intents").delete().eq("token", token).is("consumed_at", null);
      return NextResponse.json({ error: error?.message || "Fast Login could not be completed." }, { status: 503 });
    }

    // user_profiles uses user_id as its primary key; never write the auth id into a non-existent id column.
    const { error: profileError } = await admin.from("user_profiles").upsert(
      { user_id: data.user.id, date_of_birth: dateOfBirth, age_verified: true, age_verified_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (profileError) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Age verification could not be recorded." }, { status: 503 });
    }

    return NextResponse.json({ userId: data.user.id, redirect: "/user/discover" });
  } catch {
    return NextResponse.json({ error: "Fast Login could not be completed." }, { status: 503 });
  }
}

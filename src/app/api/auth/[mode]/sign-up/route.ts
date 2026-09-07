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
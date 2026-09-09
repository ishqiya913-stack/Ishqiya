import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const admin = createAdminClient();
  const token = crypto.randomUUID();
  const internalEmail = `fast-login:${token}@internal.ishqiya`;
  const { error: intentError } = await admin.from("ishqiya_signup_intents").insert({
    token,
    email: internalEmail,
    role: "user",
  });
  if (intentError) return NextResponse.json({ error: "Fast Login is temporarily unavailable." }, { status: 503 });

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously({
    options: { data: { signup_intent: token } },
  });
  if (error || !data.user || !data.session) {
    await admin.from("ishqiya_signup_intents").delete().eq("token", token).is("consumed_at", null);
    return NextResponse.json({ error: error?.message || "Fast Login could not be completed." }, { status: 503 });
  }

  return NextResponse.json({ userId: data.user.id, redirect: "/user/discover" });
}

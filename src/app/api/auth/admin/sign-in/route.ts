import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "ishqiya913@gmail.com";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password =
    typeof body?.password === "string" ? body.password : "";

  if (email !== ADMIN_EMAIL || !password) {
    return NextResponse.json(
      { error: "Admin access denied." },
      { status: 401 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Invalid Admin credentials." },
      { status: 401 }
    );
  }

  const adminUserId = process.env.ISHQIYA_ADMIN_USER_ID;

  if (!adminUserId || data.user.id !== adminUserId) {
    await supabase.auth.signOut();

    return NextResponse.json(
      { error: "Admin access denied." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}

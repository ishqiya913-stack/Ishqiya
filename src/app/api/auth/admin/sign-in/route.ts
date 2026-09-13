import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "ishqiya913@gmail.com";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (email !== ADMIN_EMAIL || !password) {
      return NextResponse.json({ error: "Admin access denied." }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      console.error("Admin sign-in authentication failed:", error?.message || "No user returned");
      return NextResponse.json({ error: "Invalid Admin credentials." }, { status: 401 });
    }

    const adminUserId = process.env.ISHQIYA_ADMIN_USER_ID?.trim();
    if (!adminUserId) {
      await supabase.auth.signOut();
      console.error("Admin sign-in configuration error: ISHQIYA_ADMIN_USER_ID is missing.");
      return NextResponse.json({ error: "Admin sign-in is not configured on this deployment." }, { status: 503 });
    }

    if (data.user.id !== adminUserId) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Admin access denied." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,account_status")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Admin profile lookup failed:", profileError.message);
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Admin profile verification failed." }, { status: 500 });
    }

    if (!profile || profile.account_status !== "active") {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Admin account is not active." }, { status: 403 });
    }

    return NextResponse.json({ ok: true, redirectTo: "/admin" });
  } catch (error) {
    console.error("Admin sign-in server error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Admin sign-in failed. Check the server configuration." }, { status: 500 });
  }
}

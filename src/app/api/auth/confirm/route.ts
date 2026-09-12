import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "ishqiya913@gmail.com";

const ALLOWED_NEXT = new Set([
  "/auth/admin/reset-password",
  "/auth/host/reset-password",
  "/auth/user/reset-password",
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tokenHash = typeof body?.token_hash === "string" ? body.token_hash.trim() : "";
  const requestedNext = typeof body?.next === "string" ? body.next : "/";
  const next = ALLOWED_NEXT.has(requestedNext) ? requestedNext : "/";

  if (!tokenHash) {
    return NextResponse.json({ error: "Recovery token is missing." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.json(
      { error: "This recovery link has expired or is no longer valid." },
      { status: 400 }
    );
  }

  if (next === "/auth/admin/reset-password") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Admin recovery is not authorized for this account." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ ok: true, next });
}

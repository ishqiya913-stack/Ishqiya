import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const { profile } = await requireAccount();
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const { profile } = await requireAccount();
  const input = await request.json() as Record<string, unknown>;
  const supabase = await createClient();
  const result = profile.role === "user"
    ? await supabase.rpc("ishqiya_update_profile", { new_display_name: String(input.displayName || ""), new_bio: String(input.bio || ""), new_city: String(input.city || "") })
    : await supabase.rpc("ishqiya_update_host_profile", { new_display_name: String(input.displayName || ""), new_headline: String(input.headline || ""), new_bio: String(input.bio || ""), new_city: String(input.city || ""), new_age: input.age ? Number(input.age) : null });
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
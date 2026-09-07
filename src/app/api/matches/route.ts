import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  await requireRole("user");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ishqiya_my_matches");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ matches: data || [] });
}
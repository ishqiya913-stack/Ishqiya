import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  await requireRole("user");
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 20);
  const offset = Number(url.searchParams.get("offset") || 0);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ishqiya_discover_hosts", { page_size: limit, page_offset: offset });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data || [] });
}

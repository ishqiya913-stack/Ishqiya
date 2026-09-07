import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user } = await requireRole("user");
  const body = await request.json() as { targetId?: string; action?: "like" | "pass" };
  if (!body.targetId || !["like", "pass"].includes(body.action || "")) return NextResponse.json({ error: "Invalid discovery action." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(body.action === "like" ? "ishqiya_like" : "ishqiya_pass", { target: body.targetId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ matchId: data || null, userId: user.id });
}

import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  await requireAccount();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("id,kind,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data || [] });
}

export async function PATCH(request: Request) {
  const { user } = await requireAccount();
  const body = await request.json() as { notificationId?: string };
  if (!body.notificationId) return NextResponse.json({ error: "Notification is required." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", body.notificationId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ read: true });
}
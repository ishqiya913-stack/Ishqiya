import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SITE_CONTENT } from "@/lib/admin-content";

export async function GET() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from("site_settings").select("key,value,updated_at,updated_by").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const settings: Record<string, string> = { ...DEFAULT_SITE_CONTENT };
  for (const row of data || []) settings[row.key] = String(row.value ?? "");
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const adminUser = await requireAdmin();
  const body = await request.json().catch(() => null) as { settings?: Record<string, unknown> } | null;
  if (!body?.settings || typeof body.settings !== "object") return NextResponse.json({ error: "Settings are required." }, { status: 400 });

  const allowedKeys = new Set(Object.keys(DEFAULT_SITE_CONTENT));
  const rows = Object.entries(body.settings)
    .filter(([key]) => allowedKeys.has(key))
    .map(([key, value]) => ({ key, value: String(value ?? "").slice(0, 10000), updated_by: adminUser.id, updated_at: new Date().toISOString() }));
  if (!rows.length) return NextResponse.json({ error: "No editable settings supplied." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("audit_logs").insert({ admin_id: adminUser.id, action: "site_settings_updated", target_type: "site_settings", before_data: null, after_data: Object.fromEntries(rows.map((row) => [row.key, row.value])) });
  return NextResponse.json({ ok: true });
}

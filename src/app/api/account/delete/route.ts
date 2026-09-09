import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  try {
    const { user, profile } = await requireAccount();

    if (profile.role !== "user") {
      return NextResponse.json({ error: "Only User accounts can be deleted here." }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: "Account could not be deleted." }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "You must be signed in to delete your account." }, { status: 401 });
  }
}

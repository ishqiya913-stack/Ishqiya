import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminApiUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const adminUserId = process.env.ISHQIYA_ADMIN_USER_ID;
  if (error || !userId || !adminUserId || userId !== adminUserId) return null;

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,account_status")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || profile?.account_status !== "active") return null;

  return { id: userId };
}

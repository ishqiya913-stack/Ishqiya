import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type IshqiyaRole = "user" | "host";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return user;
}

export async function requireRole(role: IshqiyaRole) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();

  if (!user) redirect(`/auth/${role}/sign-in`);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, email, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) redirect("/not-found");
  if (data.role !== role) redirect("/forbidden");
  if (data.account_status !== "active") redirect("/forbidden");

  return { user, profile: data };
}

export async function requireAdmin() {
  const user = await getAuthenticatedUser();
  const adminUserId = process.env.ISHQIYA_ADMIN_USER_ID;

  if (!adminUserId || !user || user.id !== adminUserId) {
    redirect("/not-found");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).maybeSingle();
  if (profile?.account_status !== "active") redirect("/not-found");

  return user;
}

export async function requireAccount() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser();
  if (!user) redirect("/");
  const { data, error } = await supabase.from("profiles").select("id, role, email, display_name, bio, city, avatar_path, account_status").eq("id", user.id).maybeSingle();
  if (error || !data) redirect("/not-found");
  if (data.account_status !== "active") redirect("/forbidden");
  return { user, profile: data as typeof data & { role: IshqiyaRole } };
}

import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_SITE_CONTENT = {
  brand_tagline: "TERE ISHQ KA JUNOON",
  hero_eyebrow: "A little closer to something real",
  hero_title: "Find someone who feels like home.",
  hero_intro: "Meet people who make conversation feel effortless, and let a meaningful connection unfold at its own pace.",
  hero_feature_1: "Enjoy 1-on-1 video chat with Hosts.",
  hero_feature_2: "Join as a Host & start earning.",
  chat_price_coins: "100",
  video_price_coins_per_minute: "100",
  host_share_percent: "20",
  support_email: "",
  child_safety_contact: "",
  maintenance_mode: "false",
} as const;

export async function getSiteContent() {
  // Never use the service-role client during static prerender/build.
  // The homepage must remain build-safe when Supabase runtime secrets
  // are unavailable to the Next.js build worker.
  if (typeof window !== "undefined") return { ...DEFAULT_SITE_CONTENT };

  try {
    const admin = createAdminClient();
    const { data } = await admin.from("site_settings").select("key,value");
    const result: Record<string, string> = { ...DEFAULT_SITE_CONTENT };
    for (const row of data || []) result[row.key] = String(row.value ?? "");
    return result;
  } catch {
    return { ...DEFAULT_SITE_CONTENT };
  }
}

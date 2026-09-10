export type DemoHost = {
  host_id: string;
  display_name: string;
  headline: string;
  bio: string;
  city: string;
  age: number;
  avatar_path: string;
  is_demo: true;
};

// Development-only preview identities. They are never persisted as real Hosts,
// never eligible for payments/earnings, and are excluded from production discovery.
// Portrait URLs are used only to exercise the real image/card UI locally.
export const DEMO_HOSTS: DemoHost[] = [
  { host_id: "demo-host-01", display_name: "Aanya", headline: "Romantic soul • Great conversations", bio: "A warm conversation awaits.", city: "Mumbai", age: 24, avatar_path: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-02", display_name: "Kiara", headline: "Coffee, music & midnight talks", bio: "Good energy and easy conversation.", city: "Mumbai", age: 26, avatar_path: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-03", display_name: "Meera", headline: "Travel • Fashion • Good energy", bio: "Travel stories, style and good energy.", city: "Pune", age: 25, avatar_path: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-04", display_name: "Riya", headline: "Soft heart, bold personality", bio: "Soft heart, bold personality.", city: "Mumbai", age: 27, avatar_path: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-05", display_name: "Tara", headline: "Beach days & meaningful chats", bio: "Beach days and meaningful chats.", city: "Goa", age: 23, avatar_path: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-06", display_name: "Ira", headline: "Books, brunch & chemistry", bio: "Books, brunch and chemistry.", city: "Mumbai", age: 28, avatar_path: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-07", display_name: "Naina", headline: "Designer • Dreamer • Dancer", bio: "Designer, dreamer and dancer.", city: "Bengaluru", age: 25, avatar_path: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-08", display_name: "Sana", headline: "Late-night conversations welcome", bio: "Easy conversations and late-night stories.", city: "Delhi", age: 26, avatar_path: "https://images.unsplash.com/photo-1541101767792-f9b2b1c4f127?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-09", display_name: "Anaya", headline: "Art, sunsets & playful banter", bio: "Art, sunsets and playful banter.", city: "Mumbai", age: 24, avatar_path: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85", is_demo: true },
  { host_id: "demo-host-10", display_name: "Zoya", headline: "Independent • Warm • Curious", bio: "Independent, warm and curious.", city: "Hyderabad", age: 27, avatar_path: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85", is_demo: true },
];

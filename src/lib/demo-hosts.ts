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

// Development-only preview identities. Never persisted as real Hosts,
// never eligible for payments/earnings, and excluded from production discovery.
export const DEMO_HOSTS: DemoHost[] = [
  { host_id: "demo-host-01", display_name: "Aarohi", headline: "Romantic soul • Great conversations", bio: "Sweet, spicy and always up for good conversation.", city: "Mumbai", age: 23, avatar_path: "/demo-hosts/01.png", is_demo: true },
  { host_id: "demo-host-02", display_name: "Kiara", headline: "Coffee, music & midnight talks", bio: "Naughty by nature. Good vibes, hot chats and unforgettable moments.", city: "Delhi", age: 25, avatar_path: "/demo-hosts/02.jpg", is_demo: true },
  { host_id: "demo-host-03", display_name: "Meera", headline: "Travel • Fashion • Good energy", bio: "Music, movies, meaningful conversations and a little bit of madness.", city: "Bangalore", age: 24, avatar_path: "/demo-hosts/03.jpg", is_demo: true },
  { host_id: "demo-host-04", display_name: "Nisha", headline: "Soft heart, bold personality", bio: "Confident, caring and always ready to make your day special.", city: "Hyderabad", age: 24, avatar_path: "/demo-hosts/04.jpg", is_demo: true },
  { host_id: "demo-host-05", display_name: "Simran", headline: "Warm • Playful • Engaging", bio: "Warm energy, playful conversations and memorable moments.", city: "Mumbai", age: 26, avatar_path: "/demo-hosts/05.jpg", is_demo: true },
  { host_id: "demo-host-06", display_name: "Riya", headline: "Fun • Music • Good vibes", bio: "Fun, expressive and always ready for a great conversation.", city: "Mumbai", age: 23, avatar_path: "/demo-hosts/06.jpg", is_demo: true },
  { host_id: "demo-host-07", display_name: "Tanya", headline: "Classy • Warm • Curious", bio: "Elegant, warm and easy to talk to.", city: "Mumbai", age: 25, avatar_path: "/demo-hosts/07.jpg", is_demo: true },
  { host_id: "demo-host-08", display_name: "Pooja", headline: "Friendly • Confident • Fun", bio: "Friendly, confident and full of good energy.", city: "Mumbai", age: 24, avatar_path: "/demo-hosts/08.jpg", is_demo: true },
  { host_id: "demo-host-09", display_name: "Ananya", headline: "Art, sunsets & playful banter", bio: "Art, sunsets and playful banter.", city: "Mumbai", age: 22, avatar_path: "/demo-hosts/09.jpg", is_demo: true },
  { host_id: "demo-host-10", display_name: "Kavya", headline: "Independent • Warm • Curious", bio: "Independent, warm and curious.", city: "Mumbai", age: 27, avatar_path: "/demo-hosts/10.jpg", is_demo: true },
];

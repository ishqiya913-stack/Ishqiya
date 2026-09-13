export type RealHost = {
  host_id: string;
  display_name: string;
  headline: string;
  bio: string;
  city: string;
  age: number;
  avatar_path: string;
  is_demo: false;
};

// Development-only UI previews. Never persisted as real Hosts and never included in production builds.
export const REAL_HOSTS: RealHost[] = [
  { host_id: "host-01", display_name: "Aarohi", headline: "Romantic soul • Great conversations", bio: "Sweet, warm and always up for good conversation.", city: "Mumbai", age: 23, avatar_path: "/hosts/01.jpg", is_demo: false },
  { host_id: "host-02", display_name: "Kiara", headline: "Coffee, music & midnight talks", bio: "Coffee, music and late-night conversations.", city: "Delhi", age: 25, avatar_path: "/hosts/02.jpg", is_demo: false },
  { host_id: "host-03", display_name: "Meera", headline: "Travel • Fashion • Good energy", bio: "Music, movies and meaningful conversations.", city: "Bangalore", age: 24, avatar_path: "/hosts/03.jpg", is_demo: false },
  { host_id: "host-04", display_name: "Nisha", headline: "Soft heart, bold personality", bio: "Confident, caring and ready for a great conversation.", city: "Hyderabad", age: 24, avatar_path: "/hosts/04.jpg", is_demo: false },
  { host_id: "host-05", display_name: "Simran", headline: "Warm • Playful • Engaging", bio: "Warm energy and playful conversations.", city: "Mumbai", age: 26, avatar_path: "/hosts/05.jpg", is_demo: false },
  { host_id: "host-06", display_name: "Riya", headline: "Fun • Music • Good vibes", bio: "Fun, expressive and full of good energy.", city: "Mumbai", age: 23, avatar_path: "/hosts/06.jpg", is_demo: false },
  { host_id: "host-07", display_name: "Tanya", headline: "Classy • Warm • Curious", bio: "Elegant, warm and easy to talk to.", city: "Mumbai", age: 25, avatar_path: "/hosts/07.jpg", is_demo: false },
  { host_id: "host-08", display_name: "Pooja", headline: "Friendly • Confident • Fun", bio: "Friendly, confident and full of good energy.", city: "Mumbai", age: 24, avatar_path: "/hosts/08.jpg", is_demo: false },
  { host_id: "host-09", display_name: "Ananya", headline: "Art, sunsets & playful banter", bio: "Art, sunsets and playful banter.", city: "Mumbai", age: 22, avatar_path: "/hosts/09.jpg", is_demo: false },
  { host_id: "host-10", display_name: "Kavya", headline: "Independent • Warm • Curious", bio: "Independent, warm and curious.", city: "Mumbai", age: 27, avatar_path: "/hosts/10.jpg", is_demo: false },
];

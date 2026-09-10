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

// Clearly fictional launch/demo identities. These are never persisted as real Hosts,
// never eligible for payments/earnings, and are removed from the UI once real Hosts exist.
export const DEMO_HOSTS: DemoHost[] = [
  { host_id: "demo-host-01", display_name: "Aanya", headline: "Romantic soul • Great conversations", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Mumbai", age: 24, avatar_path: "/demo-hosts/01.svg", is_demo: true },
  { host_id: "demo-host-02", display_name: "Kiara", headline: "Coffee, music & midnight talks", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Mumbai", age: 26, avatar_path: "/demo-hosts/02.svg", is_demo: true },
  { host_id: "demo-host-03", display_name: "Meera", headline: "Travel • Fashion • Good energy", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Pune", age: 25, avatar_path: "/demo-hosts/03.svg", is_demo: true },
  { host_id: "demo-host-04", display_name: "Riya", headline: "Soft heart, bold personality", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Mumbai", age: 27, avatar_path: "/demo-hosts/04.svg", is_demo: true },
  { host_id: "demo-host-05", display_name: "Tara", headline: "Beach days & meaningful chats", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Goa", age: 23, avatar_path: "/demo-hosts/05.svg", is_demo: true },
  { host_id: "demo-host-06", display_name: "Ira", headline: "Books, brunch & chemistry", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Mumbai", age: 28, avatar_path: "/demo-hosts/06.svg", is_demo: true },
  { host_id: "demo-host-07", display_name: "Naina", headline: "Designer • Dreamer • Dancer", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Bengaluru", age: 25, avatar_path: "/demo-hosts/07.svg", is_demo: true },
  { host_id: "demo-host-08", display_name: "Sana", headline: "Late-night conversations welcome", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Delhi", age: 26, avatar_path: "/demo-hosts/08.svg", is_demo: true },
  { host_id: "demo-host-09", display_name: "Anaya", headline: "Art, sunsets & playful banter", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Mumbai", age: 24, avatar_path: "/demo-hosts/09.svg", is_demo: true },
  { host_id: "demo-host-10", display_name: "Zoya", headline: "Independent • Warm • Curious", bio: "A fictional Ishqiya demo profile for previewing the discovery experience.", city: "Hyderabad", age: 27, avatar_path: "/demo-hosts/10.svg", is_demo: true },
];

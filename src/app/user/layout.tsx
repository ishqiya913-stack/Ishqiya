import { requireRole } from "@/lib/auth";

export default async function UserLayout({ children }: LayoutProps<"/">) {
  await requireRole("user");
  return children;
}
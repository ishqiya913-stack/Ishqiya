import { requireRole } from "@/lib/auth";

export default async function HostLayout({ children }: LayoutProps<"/">) {
  await requireRole("host");
  return children;
}
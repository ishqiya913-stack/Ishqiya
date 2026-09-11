import React from "react";
import { requireRole } from "@/lib/auth";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  await requireRole("user");
  return children;
}
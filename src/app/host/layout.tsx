import React from "react";
import { requireRole } from "@/lib/auth";

export default async function HostLayout({ children }: { children: React.ReactNode }) {
  await requireRole("host");
  return children;
}
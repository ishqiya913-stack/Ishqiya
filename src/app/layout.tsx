import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import "./brand-theme.css";
import "./full-theme.css";

export const metadata: Metadata = { title: "IshqMe", description: "A considered space for meaningful connection." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }

// Keep the variant preview deployment synced with the latest visual system.
// Preview trigger: 2026-09-15

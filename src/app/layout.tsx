import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import "./brand-theme.css";
export const metadata: Metadata = { title: "PYAAR", description: "A considered space for meaningful connection." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }

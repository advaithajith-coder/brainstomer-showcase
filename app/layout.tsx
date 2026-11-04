import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brainstomer — public project demo",
  description: "A no-login demo of voice ideas, short AI starting points, and prompts for Claude or ChatGPT.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

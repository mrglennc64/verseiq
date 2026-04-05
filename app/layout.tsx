import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "VerseIQ",
  description: "Gap analysis for European artists using Spotify metadata.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
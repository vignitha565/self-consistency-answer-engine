import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Self-Consistency Answer Engine",
  description: "Compare multiple AI answers and synthesize a stronger final response.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

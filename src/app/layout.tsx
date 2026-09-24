import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Memory",
  description:
    "Career memory that builds targeted resumes from experience you've confirmed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}

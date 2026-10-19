import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicSync — Smart City Infrastructure Coordination Platform",
  description:
    "One City. One Plan. Zero Rework. A shared infrastructure coordination system that prevents repeated road excavation through deterministic conflict detection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}

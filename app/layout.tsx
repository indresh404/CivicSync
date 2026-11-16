import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicSync — Cross-Department Road-Work Coordination Platform",
  description:
    "One City. One Plan. Zero Rework. A shared municipal infrastructure coordination system that prevents repeated road excavation through deterministic conflict detection.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister();
                  }
                });
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var j = 0; j < names.length; j++) {
                      if (names[j].indexOf('workbox') !== -1 || names[j].indexOf('vite') !== -1 || names[j].indexOf('pwa') !== -1) {
                        caches.delete(names[j]);
                      }
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}

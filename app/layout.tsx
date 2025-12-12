// app/layout.tsx
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext";
import PWASetup from "./components/PWASetup";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Netta Logistics",
  description: "Courier and logistics management application",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Netta" />
      </head>
      <body>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <UserProvider>
          <PWASetup />
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
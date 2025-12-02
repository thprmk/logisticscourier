// app/layout.tsx
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext";
import PWASetup from "./components/PWASetup";
import { Lexend } from 'next/font/google';

import type { Metadata } from "next";

const lexend = Lexend({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['Arial', 'sans-serif'],
});

export const metadata: Metadata = {
  title: "Netta Logistics",
  description: "Courier and logistics management application",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={lexend.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
// app/layout.tsx
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "./context/ThemeContext";
import PWASetup from "./components/PWASetup";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nettaa Logistics",
  description: "Courier and logistics management application",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/nettaa-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#25D366" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nettaa" />
      </head>
      <body>
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              // Default styling for all toasts
              style: {
                background: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              },
              // Success toast styling
              success: {
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid rgb(34, 197, 94)',
                },
                iconTheme: {
                  primary: 'rgb(34, 197, 94)',
                  secondary: 'var(--background)',
                },
              },
              // Error toast styling
              error: {
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid rgb(239, 68, 68)',
                },
                iconTheme: {
                  primary: 'rgb(239, 68, 68)',
                  secondary: 'var(--background)',
                },
              },
              // Loading toast styling
              loading: {
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid rgb(59, 130, 246)',
                },
                iconTheme: {
                  primary: 'rgb(59, 130, 246)',
                  secondary: 'var(--background)',
                },
              },
            }}
          />
          <UserProvider>
            <PWASetup />
            {children}
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
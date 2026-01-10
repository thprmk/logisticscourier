// app/layout.tsx
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "./context/ThemeContext";
import PWASetup from "./components/PWASetup";
import { Inter } from 'next/font/google';

import type { Metadata } from "next";

// Optimize Inter font with Next.js
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Nettaa Logistics",
  description: "Courier and logistics management application",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
        <link rel="shortcut icon" href="/nettaa-logo.png" type="image/png" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nettaa" />
      </head>
      <body className={inter.className}>
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
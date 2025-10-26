// app/layout.tsx
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext"; // Use @ alias here

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" />
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
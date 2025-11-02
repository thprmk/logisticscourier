// app/layout.tsx
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import { UserProvider } from "./context/UserContext"; // Use @ alias here

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
       <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
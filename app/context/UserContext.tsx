// app/context/UserContext.tsx
"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

// The User interface is correct
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
  tenantName?: string;
  isManager?: boolean;
}

// Define the shape of the CONTEXT VALUE
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

// Create the context with a default value that matches the type
const UserContext = createContext<UserContextType | undefined>(undefined);

// The provider will hold the state
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start as loading

  // 👇 THIS IS THE FIX: Check for session on app load
  useEffect(() => {
    const checkSession = async () => {
      try {
        // 👇 FIX 1: Add timestamp (?t=...) and headers to force fresh request
        const response = await fetch(`/api/auth/me?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // 👇 FIX 2: Handle both { user: ... } and direct object responses
          // Your 'me' endpoint returns the object directly, so 'data' is the user.
          setUser(data.user || data); 
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Session check failed', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  
  // The value provided is an object with both user and setUser
  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

// The hook will provide a clean way to access the context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context; // This now correctly returns the object { user, setUser }
}
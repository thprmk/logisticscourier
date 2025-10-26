// app/context/UserContext.tsx
"use client";

import { createContext, useContext, ReactNode, useState } from 'react';

// The User interface is correct
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Define the shape of the CONTEXT VALUE
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

// Create the context with a default value that matches the type
const UserContext = createContext<UserContextType | undefined>(undefined);

// The provider will hold the state
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // The value provided is an object with both user and setUser
  return (
    <UserContext.Provider value={{ user, setUser }}>
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
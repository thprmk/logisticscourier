// app/components/DashboardLayout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, GitFork, LayoutGrid, Package, Users, User as UserIcon } from 'lucide-react'; 
import toast from 'react-hot-toast';

interface NavLink { href: string; label: string; icon: React.ElementType; }
interface DashboardLayoutProps { children: React.ReactNode; }

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Get the user and setUser from our context hook
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This effect runs on the client to fetch user data if it's not already there
    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (!res.ok) {
                throw new Error('Session expired');
            }
            const userData = await res.json();
            setUser(userData); // Update the global context
        } catch (error) {
            // If fetching fails, the session is bad, redirect to login
            router.push('/login');
        }
    };

    // Only run the fetch if we don't already have the user data in our context
    if (!user) {
        fetchUser();
    }
  }, [user, router, setUser]);

  // While we are fetching the user for the first time, show a loading screen.
  if (!user) {
    return <div className="flex h-screen items-center justify-center bg-gray-100"><p>Loading Session...</p></div>;
  }
    
  // --- Once the user is loaded, we can define the UI ---
  let navLinks: NavLink[] = [];
  let pageTitle = '';
  let userRole = '';

  if (user.role === 'superAdmin') {
    userRole = 'Platform Owner';
    pageTitle = 'Branch Management';
    navLinks = [{ href: '/superadmin/dashboard', label: 'Branches', icon: GitFork }];
  } else {
    userRole = 'Branch Manager';
    if (pathname.startsWith('/dashboard/shipments')) pageTitle = 'Shipment Management';
    else if (pathname.startsWith('/dashboard/staff')) pageTitle = 'Staff Management';
    else pageTitle = 'Branch Overview';
    navLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { href: '/dashboard/shipments', label: 'Shipments', icon: Package },
        { href: '/dashboard/staff', label: 'Staff', icon: Users},
    ];
  }
  
  const handleLogout = async () => {
    const toastId = toast.loading('Logging out...');
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        toast.success('Logged out successfully!', { id: toastId });
        setUser(null); // Clear user from context
        router.push('/login');
    } catch (error) {
        toast.error('Logout failed.', { id: toastId });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-20 flex items-center px-6"><h1 className="text-xl font-bold text-gray-800 tracking-tight">[Logistics]</h1></div>
        <nav className="flex-grow px-4 py-2">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}><Link href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard') ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}><link.icon className="h-5 w-5" strokeWidth={1.5} /><span>{link.label}</span></Link></li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full"><UserIcon size={20} className="text-gray-600" /></div>
                <div><p className="text-sm font-semibold text-gray-800">{user.name}</p><p className="text-xs text-gray-500">{userRole}</p></div>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full mt-4 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"><LogOut className="h-5 w-5" strokeWidth={1.5} /><span>Sign Out</span></button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
            <header className="mb-8"><h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1><p className="text-gray-500 mt-1">Welcome back, {user.name}.</p></header>
            {children}
        </div>
      </main>
    </div>
  );
}
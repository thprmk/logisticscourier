// app/deliverystaff/layout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Package, User as UserIcon, Truck, Building } from 'lucide-react'; 
import toast from 'react-hot-toast';

interface NavLink { href: string; label: string; icon: React.ElementType; }
interface DeliveryStaffLayoutProps { children: React.ReactNode; }

export default function DeliveryStaffLayout({ children }: DeliveryStaffLayoutProps) {
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          throw new Error('Session expired');
        }
        const userData = await res.json();
        setUser(userData);
      } catch (error) {
        router.push('/login');
      }
    };

    if (!user) {
      fetchUser();
    }
  }, [user, router, setUser]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading your session...</p>
        </div>
      </div>
    );
  }

  // Redirect non-delivery staff users
  if (user.role !== 'staff') {
    router.push('/dashboard');
    return null;
  }

  let navLinks: NavLink[] = [
    { href: '/deliverystaff', label: 'My Deliveries', icon: Package },
  ];

  const handleLogout = async () => {
    const toastId = toast.loading('Logging out...');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully!', { id: toastId });
      setUser(null);
      router.push('/login');
    } catch (error) {
      toast.error('Logout failed.', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Logistics</h1>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    pathname === link.href 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-4 w-4" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Delivery Staff</p>
              </div>
              <div className="h-10 w-10 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md">
                <Truck size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

// app/components/DashboardLayout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LogOut, 
  GitFork, 
  LayoutGrid, 
  Package, 
  Users, 
  User as UserIcon,
  Building,
  Truck,
  Bell,
  Store
} from 'lucide-react'; 
import toast from 'react-hot-toast';

interface NavLink { href: string; label: string; icon: React.ElementType; }
interface DashboardLayoutProps { children: React.ReactNode; }

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Get the user and setUser from our context hook
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    // This effect runs on the client to fetch user data if it's not already there
    const fetchUser = async () => {
        try {
            const res = await fetch('/api/auth/me', {
                credentials: 'include', // Ensure cookies are included
            });
            if (!res.ok) {
                throw new Error('Session expired');
            }
            const userData = await res.json();
            setUser(userData); // Update the global context
            
            // Redirect delivery staff to their专属 page
            if (userData.role === 'staff') {
                router.push('/deliverystaff');
            }
        } catch (error) {
            // If fetching fails, the session is bad, redirect to login
            router.push('/login');
        }
    };

    // Only run the fetch if we don't already have the user data in our context
    if (!user) {
        fetchUser();
    } else if (user.role === 'staff') {
        // Redirect delivery staff to their专属 page
        router.push('/deliverystaff');
    }
  }, [user, router, setUser]);

  // Fetch notifications for admin and delivery staff
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch('/api/notifications', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            const unreadNotifications = data.filter((n: any) => !n.read);
            setNotifications(unreadNotifications.length);
            setNotificationList(data.slice(0, 10)); // Show last 10 notifications
          }
        } catch (error) {
          console.error('Failed to fetch notifications');
        }
      };
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // While we are fetching the user for the first time, show a loading screen.
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
    
  // --- Once the user is loaded, we can define the UI ---
  let navLinks: NavLink[] = [];
  let pageTitle = '';
  let userRole = '';
  const UserIconComponent = user.role === 'superAdmin' ? GitFork : user.role === 'admin' ? Building : Truck;

  if (user.role === 'superAdmin') {
    userRole = 'Platform Owner';
    pageTitle = 'Branch Management';
    navLinks = [{ href: '/superadmin/dashboard', label: 'Branches', icon: Building }];
  } else {
    userRole = user.role === 'admin' ? 'Branch Manager' : 'Delivery Staff';
    
    if (pathname.startsWith('/dashboard/shipments')) pageTitle = 'Shipment Management';
    else if (pathname.startsWith('/dashboard/staff')) pageTitle = 'Staff Management';
    else pageTitle = 'Branch Overview';
    
    navLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { href: '/dashboard/shipments', label: 'Shipments', icon: Package },
        { href: '/dashboard/staff', label: 'Staff', icon: Users },
    ];
  }
  
  const handleLogout = async () => {
    setShowLogoutModal(true);
  };
  
  const confirmLogout = async () => {
    const toastId = toast.loading('Signing you out...');
    try {
        await fetch('/api/auth/logout', { 
          method: 'POST',
          credentials: 'include',
        });
        toast.success('Successfully logged out', { id: toastId });
        setUser(null); // Clear user from context
        router.push('/login');
    } catch (error) {
        toast.error('Logout failed. Please try again', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md">
                <Truck className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Logistics</h1>
                {user?.tenantName && (
                  <p className="text-xs text-gray-500 font-medium">{user.tenantName}</p>
                )}
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard') 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-4 w-4" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              {(user.role === 'admin' || user.role === 'staff') && (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Bell className="h-5 w-5" strokeWidth={2} />
                  {notifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {notifications}
                    </span>
                  )}
                </button>
              )}
              
              {/* User Info - Desktop */}
              <div className="hidden lg:flex items-center gap-3 pl-2">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
                <div className="h-10 w-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                  <UserIconComponent size={18} className="text-white" strokeWidth={2.5} />
                </div>
              </div>
              
              {/* Sign Out Button */}
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
      
      {/* Notification Dropdown */}
      {showNotifications && (user.role === 'admin' || user.role === 'staff') && (
        <div className="fixed top-16 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Notifications</h3>
              <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                {notifications}
              </span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-80">
            {notificationList.length > 0 ? (
              <div className="p-3 space-y-2">
                {notificationList.map((notification: any) => (
                  <div 
                    key={notification._id}
                    className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-200' 
                        : notification.type === 'assignment'
                          ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                          : 'bg-green-50 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        notification.type === 'assignment' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {notification.type === 'assignment' ? (
                          <Bell className={`h-4 w-4 ${
                            notification.type === 'assignment' ? 'text-blue-600' : 'text-green-600'
                          }`} />
                        ) : (
                          <Package className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold text-gray-900 ${
                          !notification.read && 'font-bold'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <Link 
                  href={user.role === 'admin' ? '/dashboard/shipments' : '/deliverystaff'}
                  onClick={() => setShowNotifications(false)}
                  className="block p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors mt-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {user.role === 'admin' ? 'View All Shipments' : 'View My Deliveries'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {user.role === 'admin' 
                          ? 'Manage and track all deliveries' 
                          : 'Track and update your assigned deliveries'}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">No new notifications</p>
                <p className="text-xs text-gray-500 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-gray-900/20 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <LogOut className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Sign Out</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to sign out of your account?
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
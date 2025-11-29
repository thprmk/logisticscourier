// app/components/DashboardLayout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useEffect, useState, useRef } from 'react';
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
  Store,
  Boxes,
  Menu,
  X,
  ChevronDown
} from 'lucide-react'; 
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fetchedRef = useRef(false);

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
            
            // Redirect delivery staff BEFORE setting user to prevent flash
            if (userData.role === 'staff') {
                router.replace('/deliverystaff');
                return; // Don't set user in this context
            }
            
            setUser(userData); // Update the global context
        } catch (error) {
            // If fetching fails, the session is bad, redirect to login
            router.push('/login');
        }
    };

    // Only fetch once on mount
    if (!fetchedRef.current) {
        fetchedRef.current = true;
        if (!user) {
            fetchUser();
        }
    } else if (user?.role === 'staff') {
        // Redirect delivery staff to their page immediately
        router.replace('/deliverystaff');
    }
  }, []);

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
  
  // If user is delivery staff, don't render this layout at all (they should be redirected)
  if (user.role === 'staff') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Redirecting...</p>
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
    else if (pathname.startsWith('/dashboard/dispatch')) pageTitle = 'Branch Dispatch';
    else if (pathname.startsWith('/dashboard/staff')) pageTitle = 'Staff Management';
    else pageTitle = 'Branch Overview';
    
    navLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { href: '/dashboard/shipments', label: 'Shipments', icon: Package },
        { href: '/dashboard/dispatch', label: 'Dispatch', icon: Boxes },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">Netta Logistics</h1>
                {user?.tenantName && (
                  <p className="text-xs text-gray-500 font-medium hidden sm:block">{user.tenantName}</p>
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
                      ? 'bg-blue-600 text-white shadow-md hover:shadow-lg hover:bg-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-4 w-4" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Notification Bell */}
              {(user.role === 'admin' || user.role === 'staff') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative h-10 w-10"
                >
                  <Bell className="h-5 w-5" strokeWidth={2} />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {notifications}
                    </span>
                  )}
                </Button>
              )}
              
              {/* Branch Manager Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden lg:flex h-10 px-3 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-4 w-4 text-white" strokeWidth={2} />
                    </div>
                    <div className="text-left min-w-max">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 -mt-0.5">{userRole}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-500 ml-1 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{userRole}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Sign Out Button - Mobile */}
              <Button 
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="lg:hidden text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 h-10 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        <div className={`md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg overflow-hidden transition-all duration-300 ease-in-out z-40 ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div>
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-5 w-5" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
              
              {/* Mobile User Info */}
              <div className="flex items-center gap-3 px-4 py-3 mt-2 border-t border-gray-200 pt-3">
                <div className="h-10 w-10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                  <UserIconComponent size={18} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Notification Dropdown */}
      {showNotifications && (user.role === 'admin' || user.role === 'staff') && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-16 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Notifications</h3>
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
        </>
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
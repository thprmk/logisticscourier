// app/deliverystaff/layout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Package, User as UserIcon, Truck, Building, Bell, Menu, X, ChevronDown } from 'lucide-react'; 
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import PWASetup from '@/app/components/PWASetup';
import NotificationItem from '@/app/components/NotificationItem';
import { getNotificationPresentation, formatNotificationTime } from '@/app/lib/notificationPresentation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/app/components/ui/dropdown-menu';

interface NavLink { href: string; label: string; icon: React.ElementType; }
interface DeliveryStaffLayoutProps { children: React.ReactNode; }

export default function DeliveryStaffLayout({ children }: DeliveryStaffLayoutProps) {
  const { user, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });
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

  // Fetch notifications for delivery staff
  useEffect(() => {
    if (user && user.role === 'staff') {
      const fetchNotifications = async () => {
        try {
          console.log('[Notifications] Fetching for user:', user.id);
          const res = await fetch('/api/notifications', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            console.log('[Notifications] Received:', data.length, 'notifications');
            const unreadNotifications = data.filter((n: any) => !n.read);
            console.log('[Notifications] Unread count:', unreadNotifications.length);
            setNotifications(unreadNotifications.length);
            setNotificationList(data.slice(0, 10)); // Show last 10 notifications
          } else {
            console.error('[Notifications] API returned status:', res.status);
          }
        } catch (error) {
          console.error('[Notifications] Fetch error:', error);
        }
      };
      // Fetch immediately on load
      fetchNotifications();
      // Refresh notifications every 10 seconds for faster updates
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleNotificationDropdownOpen = async () => {
    setShowNotifications(true);
    // Mark all unread as read when dropdown opens
    const unreadNotifs = notificationList.filter((n: any) => !n.read);
    
    // Send all mark-as-read requests
    await Promise.all(
      unreadNotifs.map((notif) =>
        fetch('/api/notifications', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif._id.toString() }),
        }).catch(error => console.error('Failed to mark notification as read:', error))
      )
    );
    
    // Update local state AFTER all requests are done
    setNotificationList(notificationList.map(n => ({ ...n, read: true })));
    setNotifications(0);
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 border-r-orange-500 animate-spin" style={{
              animation: 'spin 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}></div>
          </div>
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
    setShowLogoutModal(true);
  };
  
  const confirmLogout = async () => {
    const toastId = toast.loading('Logging out...');
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      toast.success('Logged out successfully!', { id: toastId });
      setUser(null);
      router.push('/login');
    } catch (error) {
      toast.error('Logout failed.', { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PWASetup />
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 relative">
          <div className="flex items-center justify-between h-16 sm:h-16">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-10 w-10"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Package className="h-7 w-7 sm:h-6 sm:w-6 text-orange-500" strokeWidth={2} />
              <div>
                <h1 className="text-lg sm:text-lg font-bold text-gray-900 tracking-tight">Netta</h1>
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
                    pathname === link.href 
                      ? 'bg-orange-600 text-white shadow-md hover:shadow-lg hover:bg-orange-700' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-4 w-4" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Notification Bell */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNotificationDropdownOpen}
                className="relative h-10 w-10 sm:h-9 sm:w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Bell className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={2} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 sm:h-4 sm:w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {notifications}
                  </span>
                )}
              </Button>
              
              {/* Delivery Staff Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden lg:flex h-10 px-4 sm:h-9 sm:px-3 flex-shrink-0 text-gray-700 hover:bg-gray-100">
                    <UserIcon className="h-6 w-6 text-orange-500" strokeWidth={1.5} />
                    <div className="text-left min-w-max">
                      <p className="text-sm sm:text-xs font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 -mt-0.5">Delivery Staff</p>
                    </div>
                    <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-gray-400 ml-1 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-52">
                  <div className="px-4 sm:px-3 py-3 sm:py-2 border-b border-gray-100">
                    <p className="text-sm sm:text-xs font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Delivery Staff</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer text-base sm:text-sm">
                    <LogOut className="h-5 w-5 sm:h-4 sm:w-4 mr-2" strokeWidth={1.5} />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Sign Out Button - Mobile */}
              <Button 
                onClick={handleLogout}
                variant="ghost"
                size="icon"
                className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-10 w-10 sm:h-9 sm:w-9 flex-shrink-0"
              >
                <LogOut className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu - Drawer Effect */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed top-16 inset-x-0 bottom-0 bg-black/30 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        <div className={`md:hidden fixed top-16 left-0 h-[calc(100vh-64px)] w-64 bg-white border-r border-gray-200 shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <nav className="px-3 sm:px-4 py-4 sm:py-3 space-y-2 sm:space-y-1">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-4 sm:py-3 rounded-lg text-base sm:text-sm font-medium transition-all duration-150 ${
                  pathname === link.href 
                    ? 'bg-orange-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <link.icon className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={2} />
                <span>{link.label}</span>
              </Link>
            ))}
            
            {/* Mobile User Info */}
            <div className="flex items-center gap-3 px-4 py-4 sm:py-3 mt-2 border-t border-gray-200 pt-4 sm:pt-3">
              <UserIcon className="h-8 w-8 text-orange-600 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-base sm:text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">Delivery Staff</p>
              </div>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Notification Dropdown */}
      {showNotifications && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-16 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Notifications</h3>
              </div>
            </div>
          <div className="overflow-y-auto max-h-80">
            {notificationList.length > 0 ? (
              <div className="p-3 space-y-3">
                {notificationList.map((notification: any) => {
                  const presentation = getNotificationPresentation(notification.type);
                  const formattedTime = formatNotificationTime(notification.createdAt);
                  
                  return (
                    <NotificationItem
                      key={notification._id}
                      id={notification._id.toString()}
                      type={presentation.type}
                      title={presentation.title}
                      message={notification.message}
                      timestamp={formattedTime}
                      read={notification.read}
                      pill={presentation.pill}
                    />
                  );
                })}
                <Link 
                  href="/deliverystaff"
                  onClick={() => setShowNotifications(false)}
                  className="block p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors mt-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">View My Deliveries</p>
                      <p className="text-xs text-gray-600 mt-1">Track and update your assigned deliveries</p>
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

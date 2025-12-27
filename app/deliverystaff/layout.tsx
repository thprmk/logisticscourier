// app/deliverystaff/layout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Package, User as UserIcon, Truck, Building, Bell, Menu, X, ChevronDown, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import NotificationItem from '@/app/components/NotificationItem';
import { getNotificationPresentation, formatNotificationTime } from '@/app/lib/notificationPresentation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/app/components/ui/dropdown-menu';
import { ScrollArea } from '@/app/components/ui/scroll-area';

interface NavLink { href: string; label: string; icon: React.ElementType; }
interface DeliveryStaffLayoutProps { children: React.ReactNode; }

export default function DeliveryStaffLayout({ children }: DeliveryStaffLayoutProps) {
  const { user, setUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState(0);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPollingPaused, setIsPollingPaused] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

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
            setNotificationList(data); // Display ALL notifications, not just 10
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
      const interval = setInterval(() => {
        // 👇 FIX: Only fetch if polling is NOT paused
        if (!isPollingPaused) {
          fetchNotifications();
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user, isPollingPaused]);

  const handleNotificationDropdownOpen = async (isOpen: boolean) => {
    // If the menu is opening and there are unread notifications
    if (isOpen && notifications > 0) {
      // 👇 FIX: Pause the background polling
      setIsPollingPaused(true);

      const unreadIds = notificationList
        .filter((n: any) => !n.read)
        .map((n: any) => n._id.toString());

      if (unreadIds.length === 0) return;

      // Optimistic UI updates
      setNotifications(0);
      setNotificationList(prev => prev.map(n => ({ ...n, read: true })));

      // Send request to backend
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: unreadIds }),
        });
        console.log('Marked', unreadIds.length, 'notifications as read for staff.');
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    }

    // 👇 FIX: When the menu closes, resume polling
    if (!isOpen) {
      setIsPollingPaused(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-black">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-[#333333]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 dark:border-t-green-500 border-r-green-600 dark:border-r-green-500 animate-spin" style={{ animationDuration: '0.6s' }}></div>
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Loading...</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A1A]">
      {/* Top Header */}
      <header className="bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-900/50 sticky top-0 z-50 shadow-sm dark:shadow-gray-900/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 relative">
          <div className="flex items-center justify-between h-16 sm:h-16">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 h-10 w-10"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img src="/nettaa-logo.png" alt="Nettaa" className="h-14 w-14 sm:h-16 sm:w-16 object-contain" />
              <div>
                <h1 className="text-lg sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">Nettaa</h1>
                {user?.tenantName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium hidden sm:block">{user.tenantName}</p>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${pathname === link.href
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <link.icon className="h-4 w-4" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-10 w-10 sm:h-9 sm:w-9 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={2} />
                ) : (
                  <Moon className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={2} />
                )}
              </Button>

              {/* Notification Bell */}
              {user.role === 'staff' && (
                <DropdownMenu onOpenChange={handleNotificationDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-10 w-10 sm:h-9 sm:w-9 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900"
                    >
                      <Bell className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={2} />
                      {notifications > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 sm:h-4 sm:w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                          {notifications}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0 bg-white dark:bg-[#1C1C1C] border-gray-200 dark:border-gray-900">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-900">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="p-2 space-y-1">
                        {notificationList.length > 0 ? (
                          notificationList.map((notification: any) => {
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
                          })
                        ) : (
                          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            You're all caught up!
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Delivery Staff Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden lg:flex h-10 px-4 sm:h-9 sm:px-3 flex-shrink-0 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white transition-colors data-[state=open]:bg-orange-50 dark:data-[state=open]:bg-orange-900/30 data-[state=open]:text-orange-600 dark:data-[state=open]:text-orange-400">
                    <UserIcon className="h-6 w-6 text-orange-500 dark:text-orange-400" strokeWidth={1.5} />
                    <div className="text-left min-w-max">
                      <p className="text-sm sm:text-xs font-semibold text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">Delivery Staff</p>
                    </div>
                    <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-gray-400 dark:text-gray-500 ml-1 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-52 bg-white dark:bg-[#1C1C1C] border-gray-200 dark:border-gray-900">
                  <div className="px-4 sm:px-3 py-3 sm:py-2 border-b border-gray-100 dark:border-gray-900">
                    <p className="text-sm sm:text-xs font-semibold text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Delivery Staff</p>
                  </div>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-900" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/30 focus:text-red-600 dark:focus:text-red-400 cursor-pointer text-base sm:text-sm">
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
                className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 h-10 w-10 sm:h-9 sm:w-9 flex-shrink-0"
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
        <div className={`md:hidden fixed top-16 left-0 w-64 h-screen bg-white dark:bg-[#1C1C1C] border-r border-gray-200 dark:border-gray-900 shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          <nav className="px-3 sm:px-4 py-4 sm:py-3 space-y-2 sm:space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-4 sm:py-3 rounded-lg text-base sm:text-sm font-medium transition-all duration-150 ${pathname === link.href
                  ? 'bg-orange-600 dark:bg-orange-500 text-white shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <link.icon className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={2} />
                <span>{link.label}</span>
              </Link>
            ))}

            {/* Mobile User Info */}
            <div className="flex items-center gap-3 px-4 py-4 sm:py-3 mt-2 border-t border-gray-200 dark:border-gray-900 pt-4 sm:pt-3">
              <UserIcon className="h-8 w-8 text-orange-600 dark:text-orange-400 flex-shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-base sm:text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Delivery Staff</p>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-[#1A1A1A]/40 [backdrop-filter:blur(4px)] flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-lg shadow-xl dark:shadow-gray-900/50 border border-gray-200 dark:border-[#333333] w-full max-w-md transform transition-all">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <LogOut className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sign Out</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Are you sure you want to sign out of your account?
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-[#1A1A1A] rounded-b-lg border-t border-gray-100 dark:border-[#333333]">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#222222] border border-gray-300 dark:border-[#333333] rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-[#2A2A2A] focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 border border-transparent rounded-md shadow-sm hover:bg-red-700 dark:hover:bg-red-600 focus:outline-none"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="md:max-w-7xl md:mx-auto px-4 sm:px-6 py-6 sm:py-8 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
}

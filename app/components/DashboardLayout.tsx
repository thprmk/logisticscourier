// app/components/DashboardLayout.tsx
"use client";

import { useUser } from '../context/UserContext';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import PWASetup from '@/app/components/PWASetup';
import { ScrollArea } from '@/app/components/ui/scroll-area';
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
  const [isPollingPaused, setIsPollingPaused] = useState(false);
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
    if (user && (user.role === 'admin' || user.role === 'dispatcher')) {
      const fetchNotifications = async () => {
        try {
          const res = await fetch('/api/notifications', {
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            const unreadNotifications = data.filter((n: any) => !n.read);
            setNotifications(unreadNotifications.length);
            setNotificationList(data); // Display ALL notifications, not just 10
          }
        } catch (error) {
          console.error('Failed to fetch notifications');
        }
      };
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

  // While we are fetching the user for the first time, show a loading screen.
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin" style={{ animationDuration: '0.6s' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  // If user is delivery staff, don't render this layout at all (they should be redirected)
  if (user.role === 'staff') {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 border-r-blue-500 animate-spin" style={{ animationDuration: '0.6s' }}></div>
          </div>
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
    // For admin role: check isManager to distinguish between Branch Manager and Dispatcher
    if (user.role === 'admin' && user.isManager) {
      userRole = 'Branch Manager';
    } else if (user.role === 'admin' && !user.isManager) {
      userRole = 'Dispatcher';
    } else {
      userRole = 'Delivery Staff';
    }
    
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
  
  const handleNotificationDropdownOpen = async (isOpen: boolean) => {
    setShowNotifications(isOpen);

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

      // Send the API request
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationIds: unreadIds }),
        });
        console.log('Marked', unreadIds.length, 'notifications as read.');
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    }

    // 👇 FIX: When the menu closes, resume polling
    if (!isOpen) {
      setIsPollingPaused(false);
    }
  };
  
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
            <div className="flex items-center gap-3 sm:gap-3">
              <Package className="h-7 w-7 sm:h-6 sm:w-6 text-blue-600" strokeWidth={2} />
              <div>
                <h1 className="text-lg sm:text-lg md:text-lg font-bold text-gray-900 tracking-tight">Netta</h1>
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
                  className={`flex items-center gap-2 px-4 py-2 sm:px-3 sm:py-2 rounded-lg text-base sm:text-sm font-medium transition-all duration-150 ${
                    pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-5 w-5 sm:h-4 sm:w-4" strokeWidth={1.5} />
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {(user.role === 'admin' || user.role === 'dispatcher') && (
                <DropdownMenu onOpenChange={handleNotificationDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-10 w-10 sm:h-9 sm:w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Bell className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={1.5} />
                      {notifications > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 sm:h-4 sm:w-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                          {notifications}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 p-0">
                    <div className="p-3 border-b">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
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
                          <div className="p-8 text-center text-sm text-gray-500">
                            You're all caught up!
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Branch Manager Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 hidden lg:flex h-10 px-4 sm:h-9 sm:px-3 flex-shrink-0 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors data-[state=open]:bg-blue-50 data-[state=open]:text-blue-700">
                    <UserIcon className="h-6 w-6 sm:h-6 sm:w-6 text-blue-600" strokeWidth={1.5} />
                    <div className="text-left min-w-max">
                      <p className="text-sm sm:text-xs font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 -mt-0.5">{userRole}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-gray-400 ml-1 flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 sm:w-52">
                  <div className="px-4 sm:px-3 py-3 sm:py-2 border-b border-gray-100">
                    <p className="text-sm sm:text-xs font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{userRole}</p>
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
        <div className={`md:hidden fixed top-16 left-0 w-64 h-screen bg-white border-r border-gray-200 shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
            <nav className="px-3 sm:px-4 py-4 sm:py-3 space-y-2 sm:space-y-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 sm:py-3 rounded-lg text-base sm:text-sm font-medium transition-all duration-150 ${
                    pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard')
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <link.icon className="h-6 w-6 sm:h-5 sm:w-5" strokeWidth={2} />
                  <span>{link.label}</span>
                </Link>
              ))}
              
              {/* Mobile User Info */}
              <div className="flex items-center gap-3 px-4 py-4 sm:py-3 mt-2 border-t border-gray-200 pt-4 sm:pt-3">
                <UserIcon className="h-8 w-8 text-blue-600 flex-shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-base sm:text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              </div>
            </nav>
        </div>
      </header>
      
      
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
      <main className="md:max-w-7xl md:mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
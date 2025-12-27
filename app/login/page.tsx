"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Package, AtSign, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Force light mode on login page
  useEffect(() => {
    // Save current theme
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    // Force light mode
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');

    // Restore theme when component unmounts
    return () => {
      document.documentElement.classList.remove('light');
      if (currentTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned invalid response format');
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      // Optimize redirect - use router.push for faster navigation
      if (data.redirectTo) {
        router.push(data.redirectTo);
      } else {
        window.location.href = '/dashboard';
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Request timeout. Please check your connection and try again.');
      } else {
        console.error('Login error:', error);
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen relative overflow-hidden bg-white"
      style={{
        backgroundImage: 'url(/bg-login.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-white/10"></div>

      {/* Centered Container */}
      <div className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 lg:py-12">
        <div className="w-full max-w-[25rem] sm:max-w-md bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-9 shadow-2xl border border-gray-200/50 mx-auto">
          {/* Logo and Header */}
          <div className="text-center mb-5 sm:mb-7">
            <div className="inline-flex items-center justify-center w-28 h-28 mb-2">
              <img src="/nettaa-logo.png" alt="Nettaa Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 sm:mb-1.5">Login to Nettaa</h2>
            <p className="text-xs sm:text-sm text-gray-600">Logistics Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-gray-700">Email address</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3.5">
                  <AtSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" strokeWidth={1.5} />
                </div>
                <Input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 sm:pl-11 h-11 sm:h-12 bg-white border-gray-300 rounded-lg sm:rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm sm:text-base"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3.5">
                  <KeyRound className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" strokeWidth={1.5} />
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 sm:pl-11 pr-11 sm:pr-12 h-11 sm:h-12 bg-white border-gray-300 rounded-lg sm:rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm sm:text-base"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none touch-manipulation"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <Eye className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} /> : <EyeOff className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 sm:p-3.5 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl text-red-700 text-xs sm:text-sm font-medium">
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 sm:h-12 bg-[#1A9D4A] hover:bg-[#158A3F] active:bg-[#127835] text-white font-semibold rounded-lg sm:rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed mt-2 text-sm sm:text-base touch-manipulation"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  <div className="relative h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white animate-spin"></div>
                  </div>
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-gray-200">
            <p className="text-[10px] xs:text-xs text-center text-gray-600 px-2 break-words">
              Admin: superadmin@logistics.com / superpassword123
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
// app/login/page.tsx

"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Package } from 'lucide-react';
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned invalid response format');
      }
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      
      window.location.href = data.redirectTo || '/dashboard';
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50">
      {/* Main Content */}
      <div className="flex h-screen flex-col lg:flex-row">
        {/* Left Side - Illustration Background - Hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-gradient-to-br from-blue-100 via-blue-50 to-cyan-50 items-center justify-center p-8 relative overflow-hidden" style={{backgroundImage: 'url(/bg-login.png)', backgroundSize: 'cover', backgroundPosition: 'center'}}>
          {/* Decorative elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-cyan-200/20 rounded-full blur-3xl"></div>
        </div>

        {/* Right Side - Login Form - Full width on mobile, half on desktop */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-4 sm:p-6 md:p-8 min-h-screen lg:min-h-auto">
          <div className="w-full max-w-sm md:max-w-md space-y-6 md:space-y-8">
            {/* Header */}
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 md:h-8 md:w-8 text-blue-600" strokeWidth={2} />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Netta</h1>
              </div>
              <p className="text-gray-600 text-sm md:text-base">Welcome back to your logistics dashboard. Sign in to continue.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 md:space-y-5">
              {/* Email Input */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="email" className="text-xs md:text-sm font-medium text-gray-700">Email Address</Label>
                <div className="relative">
                  <Input
                    type="email"
                    id="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="h-10 md:h-12 text-sm border border-gray-300 rounded-full focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all pl-4"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="password" className="text-xs md:text-sm font-medium text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-10 md:h-12 text-sm border border-gray-300 rounded-full focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50 transition-all pl-4 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 md:px-4 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <Eye size={18} strokeWidth={1.5} /> : <EyeOff size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs md:text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 md:h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-75 text-sm md:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-4 w-4 md:h-5 md:w-5">
                      <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white animate-spin" style={{ animationDuration: '0.6s' }}></div>
                    </div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Login'
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center space-y-2 md:space-y-3 pt-4 border-t border-gray-200">
              <p className="text-xs md:text-xs text-gray-500">
                Demo: superadmin@logistics.com / superpassword123
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
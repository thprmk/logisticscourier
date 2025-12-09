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

  const [showPassword, setShowPassword] =useState(false);
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
      
      // Check if response is valid JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned invalid response format');
      }
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');
      
      // Use window.location for a full page reload to ensure cookies are set
      window.location.href = data.redirectTo || '/dashboard';
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-sm space-y-6 sm:space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 sm:h-6 sm:w-6 text-blue-600" strokeWidth={2} />
              <h2 className="text-3xl sm:text-2xl font-bold text-gray-900" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'}}>Netta</h2>
            </div>
          </div>
          <h1 className="text-2xl sm:text-2xl font-semibold text-gray-900 leading-tight">Sign in to your account</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5 sm:space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base sm:text-sm font-medium text-gray-900">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-12 sm:h-11 text-base sm:text-sm border border-gray-300 rounded-lg focus:border-gray-400 focus:ring-0"
              required
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base sm:text-sm font-medium text-gray-900">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-12 sm:h-11 text-base sm:text-sm border border-gray-300 rounded-lg focus:border-gray-400 focus:ring-0 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <Eye size={20} strokeWidth={1.5} /> : <EyeOff size={20} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Login Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 sm:h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base sm:text-sm rounded-lg transition-colors"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        {/* Dev Credentials */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-4 bg-gray-100 rounded-lg text-center space-y-2 sm:space-y-1">
          <p className="text-sm sm:text-xs text-gray-600 font-medium">For development use</p>
          <p className="text-sm sm:text-xs text-gray-700">Email: <span className="font-mono font-semibold break-all">superadmin@logistics.com</span></p>
          <p className="text-sm sm:text-xs text-gray-700">Pwd: <span className="font-mono font-semibold">superpassword123</span></p>
        </div>
      </div>
    </main>
  );
}
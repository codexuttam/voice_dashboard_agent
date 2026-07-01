'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.bitlancetechhub.com/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  
  const [token, setToken] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  const [resetting, setResetting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Extract token from URL hash (Supabase default)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    // Also check standard query parameters in case it was modified
    const queryParams = new URLSearchParams(window.location.search);
    const queryToken = queryParams.get('token');
    
    const finalToken = accessToken || queryToken;
    if (finalToken) {
      setToken(finalToken);
    } else {
      setError('Invalid or missing password reset token. Please request a new link.');
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid reset token.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setResetting(true);
    setError('');
    
    try {
      const res = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError('Network error while resetting password');
    }
    setResetting(false);
  };

  return (
    <div className={`min-h-screen font-sans bg-white dark:bg-slate-900 transition-colors duration-300`}>
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8">
          
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src="/logo.jpg" alt="Logo" className="h-12 w-auto rounded-xl" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1">
              Reset Password
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Create a new password for your account</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-650 dark:text-emerald-400 p-6 rounded-lg text-center space-y-3">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
              <h3 className="font-bold text-lg">Password Reset Successfully!</h3>
              <p className="text-sm">You can now login with your new password. Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 pl-4 pr-12 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 rounded-lg py-3 pl-4 pr-12 text-sm text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-350 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={resetting || !token}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 py-3 rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-cyan-500/20 text-white flex items-center justify-center gap-2"
                >
                  {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {resetting ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </div>
              
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

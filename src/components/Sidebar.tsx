"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, PhoneCall, Home, Menu, X, Sun, Moon } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const email = sessionStorage.getItem('billing_user_email');
      setUserEmail(email);
      
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Also listen to storage events to update dynamically if logged in
      const handleStorage = () => {
        setUserEmail(sessionStorage.getItem('billing_user_email'));
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const isAuthorized = !!userEmail;

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 flex items-center justify-between px-4 z-40">
        <Link href="/" className="flex items-center">
          <div className="h-8">
            <Logo theme={theme} className="h-full w-auto" />
          </div>
        </Link>
        <button onClick={toggleSidebar} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 focus:outline-none">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 flex flex-col shadow-2xl z-50 shrink-0 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      <div className="p-6 border-b border-slate-200 dark:border-slate-900 flex items-center justify-between md:block">
        <Link href="/" className="flex items-center">
          <div className="h-9">
            <Logo theme={theme} className="h-full w-auto" />
          </div>
        </Link>
        <button onClick={toggleSidebar} className="md:hidden p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-3">
          Menu
        </div>
        <nav className="space-y-1.5">
          <Link 
            href="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          {isAuthorized && (
            <>
              <Link 
                href="/dashboard" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <LayoutDashboard className="w-4 h-4" />
                Analytics
              </Link>
              <Link 
                href="/leads" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <Users className="w-4 h-4" />
                Leads
              </Link>
              <Link 
                href="/voice-leads" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <PhoneCall className="w-4 h-4" />
                Voice Leads
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Theme Toggle Button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-900">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
        >
          <span className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            Theme Mode
          </span>
          <span className="text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {theme}
          </span>
        </button>
      </div>
      
      <div className="p-4 border-t border-slate-200 dark:border-slate-900 text-xs text-slate-400 dark:text-slate-500 text-center font-medium">
        &copy; 2026 All Rights Reserved
      </div>
    </aside>
    </>
  );
}

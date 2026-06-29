"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Users, PhoneCall, Home, Menu, X } from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-4 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
            <PhoneCall className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Bitlance
          </h2>
        </Link>
        <button onClick={toggleSidebar} className="p-2 text-slate-400 hover:text-slate-100 focus:outline-none">
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
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-950 border-r border-slate-900 flex flex-col shadow-2xl z-50 shrink-0 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      <div className="p-6 border-b border-slate-900 flex items-center justify-between md:block">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
            <PhoneCall className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Bitlance
          </h2>
        </Link>
        <button onClick={toggleSidebar} className="md:hidden p-1 text-slate-400 hover:text-slate-100">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
          Menu
        </div>
        <nav className="space-y-1.5">
          <Link 
            href="/" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
          >
            <LayoutDashboard className="w-4 h-4" />
            Analytics
          </Link>
          <Link 
            href="/leads" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
          >
            <Users className="w-4 h-4" />
            Leads
          </Link>
          <Link 
            href="/voice-leads" 
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
          >
            <PhoneCall className="w-4 h-4" />
            Voice Leads
          </Link>
        </nav>
      </div>
      
      <div className="p-4 border-t border-slate-900 text-xs text-slate-500 text-center font-medium">
        &copy; 2026 Bitlance Tech Hub
      </div>
    </aside>
    </>
  );
}

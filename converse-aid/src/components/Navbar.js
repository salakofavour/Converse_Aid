'use client';

import { signOut } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function Navbar({ user }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/view-jobs', label: 'Create/View Job' },
    { href: '/dashboard/send-email', label: 'Send Email' },
    { href: '/dashboard/settings', label: 'Settings' }
  ];

  return (
    <nav className="bg-white shadow-md sticky border-b border-gray-200 rounded-b-2xl top-0 z-50">
      <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-12 py-3 max-w-none">
        <Link href="/dashboard" className="text-2xl font-bold text-primary hover:text-primary-dark transition-colors flex items-center space-x-3">
          <span>Converse-Aid</span>
        </Link>
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`py-2 px-4 rounded-lg transition-all ${
                pathname === link.href
                  ? 'bg-primary text-white font-medium shadow-md'
                  : 'text-gray-600 hover:bg-blue-50 hover:text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        {/* User Menu */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="text-sm text-gray-600 bg-blue-50 py-1 px-3 rounded-full">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="btn btn-outline-primary btn-sm hover:bg-primary hover:text-white transition-all"
          >
            Sign Out
          </button>
        </div>
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 hover:text-primary focus:outline-none focus:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-100 animate-fade-in">
          <div className="pt-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2 px-4 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-primary text-white font-medium'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-gray-100">
              <div className="mb-3 text-sm text-gray-600 px-4">
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return(
    <footer className="bg-white py-4 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          © {new Date().getFullYear()} Converse-Aid. All rights reserved.
        </div>
      </footer>
  )
}
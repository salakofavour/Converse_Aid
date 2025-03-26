'use client';

import { signOut } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar({ user }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/view-jobs', label: 'View Jobs' },
    { href: '/dashboard/settings', label: 'Settings' },
  ];

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-2xl font-bold text-primary mr-8">
              RecruitAid
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-2 ${
                    pathname === link.href
                      ? 'text-primary font-medium border-b-2 border-primary'
                      : 'text-gray-600 hover:text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center">
            <div className="hidden md:flex items-center">
              <div className="mr-4 text-sm text-gray-600">
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="btn btn-outline-primary btn-sm"
              >
                Sign Out
              </button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 focus:outline-none"
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
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-gray-200">
            <div className="pt-3 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block py-2 ${
                    pathname === link.href
                      ? 'text-primary font-medium'
                      : 'text-gray-600'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-200">
                <div className="mb-2 text-sm text-gray-600">
                  {user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="btn btn-outline-primary btn-sm w-full"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 
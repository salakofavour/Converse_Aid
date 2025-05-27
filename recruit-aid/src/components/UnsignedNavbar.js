'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import logo from '../../public/logo.png';

export function UnsignedNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return(
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm rounded-b-2xl">
      <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-12 py-3 max-w-none">
        <Link href="/" className="flex items-center space-x-3 flex-shrink-0 md:pl-0">
          <Image src={logo} alt="Logo" width={40} height={40} />
          <span className="font-bold text-xl text-blue-500">Converse-Aid</span>
        </Link>
        <nav className="hidden md:flex flex-1 justify-center space-x-8 text-base font-medium">
          <Link href="/" className={`hover:text-blue-500 transition ${pathname === '/' ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`}>Home</Link>
          <Link href="/pricing-contact?section=pricing" className={`hover:text-blue-500 transition ${pathname.includes('/pricing-contact') && pathname.includes('pricing') ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`}>Pricing</Link>
          <Link href="/about" className={`hover:text-blue-500 transition ${pathname === '/about' ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`}>About</Link>
          <Link href="/pricing-contact?section=contact" className={`hover:text-blue-500 transition ${pathname.includes('/pricing-contact') && pathname.includes('contact') ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`}>Contact</Link>
        </nav>
        <div className="hidden md:flex flex-shrink-0 md:pr-0">
          <Link href="/signup">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-full shadow transition-all text-base">Start for Free</button>
          </Link>
        </div>
        <button
          className="md:hidden ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Open menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="h-7 w-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow animate-fade-in">
          <nav className="flex flex-col items-center space-y-4 py-4">
            <Link href="/" className={`w-full text-center py-2 hover:text-blue-500 transition ${pathname === '/' ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`} onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/pricing-contact?section=pricing" className={`w-full text-center py-2 hover:text-blue-500 transition ${pathname.includes('/pricing-contact') && pathname.includes('pricing') ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`} onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link href="/about" className={`w-full text-center py-2 hover:text-blue-500 transition ${pathname === '/about' ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`} onClick={() => setMenuOpen(false)}>About</Link>
            <Link href="/pricing-contact?section=contact" className={`w-full text-center py-2 hover:text-blue-500 transition ${pathname.includes('/pricing-contact') && pathname.includes('contact') ? 'text-blue-500 font-semibold underline underline-offset-4' : 'text-gray-600'}`} onClick={() => setMenuOpen(false)}>Contact</Link>
            <Link href="/signup" className="w-full flex justify-center" onClick={() => setMenuOpen(false)}>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-full shadow transition-all text-base w-full max-w-xs">Start for Free</button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function UnsignedFooter() {
  return(
    <footer className="bg-white py-8 border-t border-gray-200">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-blue-300 tracking-tight">Converse-Aid</span>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            Converse-Aid is a conversational AI platform for any industry. Create AI Agents ("Jobs") to automate and personalize your communication via email.
          </p>
        </div>
        <div className="flex space-x-6">
          <a href="/pricing-contact?section=contact" className="text-gray-600 hover:text-[#3b82f6]">
            Contact Us
          </a>
          <a href="/pricing-contact?section=pricing" className="text-gray-600 hover:text-[#3b82f6]">
            Pricing
          </a>
          <a href="#" className="text-gray-600 hover:text-[#3b82f6]">
            Privacy Policy
          </a>
          <a href="#" className="text-gray-600 hover:text-[#3b82f6]">
            Terms of Service
          </a>
          <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#3b82f6]">
            <span className="sr-only">Twitter</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.93 9.93 0 01-2.828.775 4.932 4.932 0 002.165-2.724c-.951.564-2.005.974-3.127 1.195A4.92 4.92 0 0016.616 3c-2.73 0-4.942 2.21-4.942 4.932 0 .386.045.762.127 1.124C7.728 8.807 4.1 6.884 1.671 3.965c-.423.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 01-2.237-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.936 4.936 0 01-2.224.084c.627 1.956 2.444 3.377 4.6 3.417A9.867 9.867 0 010 21.543a13.94 13.94 0 007.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0024 4.557z"/></svg>
          </a>
          <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#3b82f6]">
            <span className="sr-only">LinkedIn</span>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.29c-.966 0-1.75-.79-1.75-1.75s.784-1.75 1.75-1.75 1.75.79 1.75 1.75-.784 1.75-1.75 1.75zm13.5 10.29h-3v-4.5c0-1.08-.02-2.47-1.5-2.47-1.5 0-1.73 1.17-1.73 2.38v4.59h-3v-9h2.89v1.23h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.59v4.74z"/></svg>
          </a>
        </div>
      </div>
    </div>
  </footer>
  );
}
'use client';
import { Footer } from '@/components/Navbar';
import { UnsignedFooter, UnsignedNavbar } from '@/components/UnsignedNavbar';
import { usePathname } from 'next/navigation';




export function LayoutFooterHelper() {
  const pathname = usePathname();
  return (
    <footer>
        {pathname === '/signup' || pathname === '/signin' ? <Footer /> : <UnsignedFooter />}
    </footer>
  );
}
export function LayoutHeaderHelper() {
  const pathname = usePathname();
  return (
    <header>
        {pathname !== '/signup' && pathname !== '/signin' && <UnsignedNavbar />}
    </header>
  );
}

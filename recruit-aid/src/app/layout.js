import { LayoutFooterHelper, LayoutHeaderHelper } from '@/app/layout-helper';
import { Footer, Navbar } from '@/components/Navbar';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: "Converse-Aid - Streamline Your Communication",
  description: "A powerful platform to manage your communication process efficiently",
};

export default async function RootLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {user ? <Navbar user={user} /> : <LayoutHeaderHelper />}
        {/* <header> <UnsignedNavbar /> </header> */}
        {/* <header> <LayoutHeaderHelper /> </header> */}
        <main>{children}</main>
        <Toaster richColors position="top-right" />
        {/* <footer> <LayoutFooterHelper /> </footer> */}
        {user ? <Footer /> : <LayoutFooterHelper />}
      </body>
    </html>
  );
}

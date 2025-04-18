'use client';

import Navbar from '@/components/Navbar';
import { getUser } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// const navigation = [
//   { name: 'Dashboard', href: '/dashboard' },
//   { name: 'Create Job', href: '/dashboard/create-job' },
//   { name: 'View Jobs', href: '/dashboard/view-jobs' },
//   { name: 'Send Email', href: '/dashboard/send-email' },
//   { name: 'Settings', href: '/dashboard/settings' }
// ];

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const { user, error } = await getUser();
      
      if (error || !user) {
        router.push('/');
        return;
      }
      
      setUser(user);
      setLoading(false);
    }
    
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
} 
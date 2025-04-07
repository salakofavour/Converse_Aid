'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateJob() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/view-jobs');
  }, [router]);

  return null;
} 
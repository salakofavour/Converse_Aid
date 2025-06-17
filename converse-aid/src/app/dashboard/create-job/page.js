'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateJob() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/create-job/template');
  }, [router]);

  return null;
} 
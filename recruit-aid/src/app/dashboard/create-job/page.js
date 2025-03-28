'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateJob() {
  const router = useRouter();
  
  // Handle proceeding to template
  const handleProceed = () => {
    router.push('/dashboard/create-job/template');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Create New Job</h1>
        <Link href="/dashboard" className="btn btn-outline-primary transition-all hover:shadow-md">
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        <div className="space-y-6">
          {/* Proceed Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleProceed}
              className="btn btn-primary btn-lg transition-all hover:scale-105 hover:shadow-md px-8 py-3 text-lg"
            >
              Create Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
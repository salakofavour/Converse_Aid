'use client';

import { getJobs } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ViewJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load jobs data from Supabase
  useEffect(() => {
    async function loadJobs() {
      try {
        setIsLoading(true);
        const { jobs: jobsData, error: jobsError } = await getJobs();
        
        if (jobsError) {
          throw new Error(jobsError.message);
        }
        
        setJobs(jobsData || []);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setError(err.message || 'Failed to load jobs');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadJobs();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Handle creating a new job
  const handleCreateJob = () => {
    router.push('/dashboard/create-job');
  };

  // Handle clicking on a job card
  const handleJobClick = (jobId) => {
    router.push(`/dashboard/view-jobs/${jobId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">View Jobs</h1>
        <button 
          onClick={handleCreateJob}
          className="btn btn-primary transition-all hover:shadow-md"
        >
          Create New Job
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-pulse flex flex-col items-center">
              <div className="rounded-full bg-primary-light h-12 w-12 mb-4"></div>
              <div className="text-gray-600">Loading jobs...</div>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No jobs found</div>
            <button 
              onClick={handleCreateJob}
              className="btn btn-outline-primary"
            >
              Create Your First Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleJobClick(job.id)}
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">{job.title}</h2>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      job.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : job.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status === 'active' 
                        ? 'Active' 
                        : job.status === 'scheduled' 
                          ? 'Scheduled' 
                          : 'Closed'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 mr-2">Department:</span>
                      <span className="text-gray-700">{job.department}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 mr-2">Location:</span>
                      <span className="text-gray-700">{job.location}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 mr-2">Type:</span>
                      <span className="text-gray-700 capitalize">{job.job_type.replace('-', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="text-sm">
                      <span className="text-gray-500 mr-1">Start:</span>
                      <span className="text-gray-700">{formatDate(job.flow_start_date)}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-sm text-gray-600 mr-3">
                        <span className="font-medium">{job.applicants?.length || 0}</span>
                        <span className="ml-1">applicants</span>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
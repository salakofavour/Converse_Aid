'use client';

import { JobLimitModal } from '@/components/modals/JobLimitModal';
import { deletePineconeNamespace } from '@/lib/pinecone-callRoute';
import { createClient, deleteJob, getJobs, getMembers } from '@/lib/supabase';
import { TrashIcon } from '@heroicons/react/24/outline';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ViewJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobMembers, setJobMembers] = useState({});
  const [deletingJobs, setDeletingJobs] = useState(new Set()); // Track jobs being deleted
  const [selectedActions, setSelectedActions] = useState({}); // Track selected action for each job
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Load jobs data from Supabase
  useEffect(() => {
    async function loadJobs() {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { jobs: jobsData, error: jobsError } = await getJobs();
        
        if (jobsError) {
          throw new Error(jobsError.message);
        }
        
        // Get subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('status')
          .single();
        
        setIsSubscribed(subscription?.status === 'active' || subscription?.status === 'trialing');
        setJobs(jobsData || []);

        // Load applicant counts for each job
        const applicantCounts = {};
        await Promise.all((jobsData || []).map(async (job) => {
          const { members } = await getMembers(job.id);
          applicantCounts[job.id] = members?.length || 0;
        }));
        setJobMembers(applicantCounts);

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
    if (jobs.length >= 5) {
      setShowLimitModal(true);
    } else {
      router.push('/dashboard/create-job');
    }
  };

  // Handle clicking on a job card
  const handleJobClick = (jobId) => {
    router.push(`/dashboard/view-jobs/${jobId}`);
  };

  // Handle action selection
  const handleActionSelect = (jobId, action) => {
    setSelectedActions(prev => ({
      ...prev,
      [jobId]: action
    }));
  };

  // Handle action button click
  const handleActionClick = async (e, jobId) => {
    e.stopPropagation(); // Prevent job card click
    const selectedAction = selectedActions[jobId];
    
    if (!selectedAction) return;

    try {
      const response = await fetch('/api/update-agent-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          jobId,
          action: selectedAction
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update job state');
      }

      // Show success toast and refresh jobs
      toast.success('Job state updated successfully');
      const { jobs: updatedJobs, error: jobsError } = await getJobs();
      
      if (jobsError) {
        throw new Error(jobsError.message);
      }
      
      setJobs(updatedJobs || []);

    } catch (error) {
      console.error('Error updating job state:', error);
      toast.error(error.message || 'Failed to update job state');
    }
  };

  // Handle job deletion
  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation(); // Prevent job card click when clicking delete

    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    setDeletingJobs(prev => new Set([...prev, jobId]));
    setError(null);

    try {
      // Delete from Supabase
      const { error: supabaseError } = await deleteJob(jobId);
      if (supabaseError) throw new Error('Failed to delete job from database');

      // Delete from Pinecone
      try {
        await deletePineconeNamespace(jobId.toString());
      } catch (pineconeError) {
        console.error('Error deleting Pinecone namespace:', pineconeError);
        // Don't throw here as the job is already deleted from Supabase
      }

      // Update local state
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      setJobMembers(prev => {
        const updated = { ...prev };
        delete updated[jobId];
        return updated;
      });

    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job. Please try again.');
    } finally {
      setDeletingJobs(prev => {
        const updated = new Set(prev);
        updated.delete(jobId);
        return updated;
      });
    }
  };

  // Before the return statement, define a function to truncate the about text
  function truncateAbout(text) {
    if (!text) return '';
    const words = text.split(' ');
    return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : text;
  }

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

      {/* Add JobLimitModal */}
      <JobLimitModal 
        isOpen={showLimitModal} 
        onClose={() => setShowLimitModal(false)} 
      />

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
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                onClick={() => handleJobClick(job.id)}
              >
                {/* Delete button - appears on hover */}
                <button
                  onClick={(e) => handleDeleteJob(e, job.id)}
                  disabled={deletingJobs.has(job.id)}
                  className={`absolute top-2 right-2 p-2 rounded-full 
                    ${deletingJobs.has(job.id) 
                      ? 'bg-gray-100 cursor-not-allowed' 
                      : 'bg-white hover:bg-red-50'} 
                    hidden group-hover:block z-10`}
                  aria-label="Delete job"
                >
                  <TrashIcon 
                    className={`h-5 w-5 ${
                      deletingJobs.has(job.id) 
                        ? 'text-gray-400' 
                        : 'text-red-500 hover:text-red-600'
                    }`} 
                  />
                </button>

                {/* Deletion overlay */}
                {deletingJobs.has(job.id) && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">{job.title}</h2>
                    <div className="flex items-center space-x-2">
                      {job.agent_state && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          job.agent_state === 'running' ? 'bg-green-100 text-green-800' :
                          job.agent_state === 'stopped' ? 'bg-red-100 text-red-800' :
                          job.agent_state === 'paused' ? 'bg-gray-100 text-gray-800' : ''
                        }`}>
                          {job.agent_state}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        new Date() <= new Date(job.job_end_date)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {new Date() <= new Date(job.job_end_date)
                          ? 'Active'
                          : 'Closed'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    
                    {/* If file is uploaded, show file name, otherwise show about preview */}
                    {job.file_uploaded ? (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 mr-2">File:</span>
                        <span
                          className="text-gray-700 max-w-[120px] truncate"
                          title={job.original_filename}
                        >
                          {job.original_filename}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-500 mr-2">About:</span>
                        <span className="text-gray-700">{truncateAbout(job.about)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="text-sm">
                      <span className="text-gray-500 mr-1">Start:</span>
                      <span className="text-gray-700">{formatDate(job.job_start_date)}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="text-sm text-gray-600 mr-3">
                        <span className="font-medium">{jobMembers[job.id] || 0}</span>
                        <span className="ml-1">members</span>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="mt-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end space-x-2">
                      <div className="relative w-48">
                        <select
                          className={`form-select w-full focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all
                            ${!isSubscribed || new Date() > new Date(job.job_end_date)
                              ? 'bg-gray-100 cursor-not-allowed opacity-60'
                              : 'hover:border-gray-400'
                            }`}
                          value={selectedActions[job.id] || ''}
                          onChange={(e) => handleActionSelect(job.id, e.target.value)}
                          disabled={new Date() > new Date(job.job_end_date) || !isSubscribed}
                        >
                          <option value="">Choose an action</option>
                          <option value="Start">Start</option>
                          <option value="Stop">Stop</option>
                          <option value="Pause">Pause</option>
                          <option value="Resume">Resume</option>
                        </select>
                        {(!isSubscribed || new Date() > new Date(job.job_end_date)) && (
                          <div className="absolute top-1/2 -translate-y-1/2 right-8">
                            <Tooltip.Provider>
                              <Tooltip.Root>
                                <Tooltip.Trigger asChild>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 cursor-help">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                  </svg>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                  <Tooltip.Content
                                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm leading-tight text-white shadow-lg"
                                    sideOffset={5}
                                  >
                                    {!isSubscribed
                                      ? "Upgrade to Pro to manage job actions"
                                      : "Cannot modify actions for expired jobs"}
                                    <Tooltip.Arrow className="fill-gray-900" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              </Tooltip.Root>
                            </Tooltip.Provider>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`btn px-4 py-2 transition-all
                          ${!selectedActions[job.id] || new Date() > new Date(job.job_end_date) || !isSubscribed
                            ? 'btn-secondary bg-gray-100 cursor-not-allowed opacity-60'
                            : 'btn-primary hover:bg-primary-dark'
                          }`}
                        onClick={(e) => handleActionClick(e, job.id)}
                        disabled={!selectedActions[job.id] || new Date() > new Date(job.job_end_date) || !isSubscribed}
                      >
                        Go
                      </button>
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
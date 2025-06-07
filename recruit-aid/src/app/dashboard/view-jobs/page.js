'use client';

import { DeleteJobModal } from '@/components/modals/DeleteJobModal';
import { JobLimitModal } from '@/components/modals/JobLimitModal';
import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  // const [isDeleting, setIsDeleting] = useState(false);
  const [updatingJobs, setUpdatingJobs] = useState(new Set());
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 12;
  const [jobStatuses, setJobStatuses] = useState({});
  
  // Load jobs data from API
  const loadJobs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch jobs
      const jobsResponse = await fetchWithCSRF('/api/jobs');
      if (!jobsResponse.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const { jobs: jobsData } = await jobsResponse.json();
      setJobs(jobsData);

      // Fetch members for each job
      const membersPromises = jobsData.map(job => 
        fetchWithCSRF(`/api/members?jobId=${job.id}`)
          .then(res => res.json())
          .then(data => ({ jobId: job.id, members: data.members || [] }))
          .catch(() => ({ jobId: job.id, members: [] }))
      );

      const membersResults = await Promise.all(membersPromises);
      const membersMap = membersResults.reduce((acc, { jobId, members }) => {
        acc[jobId] = members.length;
        return acc;
      }, {});
      setJobMembers(membersMap);

    } catch (err) {
      console.error('Error loading jobs:', err);
      setError('Failed to load jobs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Separate useEffect for subscription check
  useEffect(() => {
    async function checkSubscription() {
      try {
        const subscriptionResponse = await fetchWithCSRF('/api/subscriptions/check-subscription');
        if (!subscriptionResponse.ok) {
          console.error('Failed to fetch subscription status');
          return;
        }

        const { subscription } = await subscriptionResponse.json();
        // Check for both active and trialing states
        const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
        setIsSubscribed(hasActiveSubscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
        // Don't set error state here as it's not critical for the main functionality
      }
    }

    checkSubscription();
  }, []);

  // Add a debug log for isSubscribed state changes
  useEffect(() => {
    console.log('isSubscribed:', isSubscribed);
  }, [isSubscribed]);

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

  // Handle job deletion
  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation(); // Prevent job card click when clicking delete
    const job = jobs.find(j => j.id === jobId);
    setJobToDelete({ id: jobId, title: job?.title });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;

    setDeletingJobs(prev => new Set([...prev, jobToDelete.id]));
    setError(null);

    try {
      // setIsDeleting(true);
      const response = await fetchWithCSRF(`/api/jobs/${jobToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete job');
      }

      setJobs(jobs.filter(job => job.id !== jobToDelete.id));
      setJobMembers(prev => {
        const updated = { ...prev };
        delete updated[jobToDelete.id];
        return updated;
      });

      toast.success('Job deleted successfully');
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Failed to delete job. Please try again.');
    } finally {
      setDeletingJobs(prev => {
        const updated = new Set(prev);
        updated.delete(jobToDelete.id);
        return updated;
      });
      setShowDeleteModal(false);
      setJobToDelete(null);
      // setIsDeleting(false);
    }
  };

  // Before the return statement, define a function to truncate the about text
  function truncateAbout(text) {
    if (!text) return '';
    const words = text.split(' ');
    return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : text;
  }

  // Add function to get valid actions based on current state
  function getValidActions(job) {
    // If job is closed, no actions are allowed
    if (job.status === 'closed') {
      return [];
    }

    // Get valid transitions based on current agent state
    const stateTransitions = {
      'running': ['Stop', 'Pause'],
      'stopped': ['Start'],
      'paused': ['Resume', 'Stop']
    };

    const currentState = job.agent_state || 'stopped';
    return stateTransitions[currentState] || [];
  }

  // Update handleActionClick to handle invalid transitions
  const handleActionClick = async (e, jobId) => {
    e.stopPropagation();
    const selectedAction = selectedActions[jobId];
    const job = jobs.find(j => j.id === jobId);
    if (!selectedAction) return;
    const validActions = getValidActions(job);
    if (!validActions.includes(selectedAction)) {
      toast.error(`Cannot ${selectedAction.toLowerCase()} from ${job.agent_state || 'current'} state`);
      return;
    }
    setUpdatingJobs(prev => new Set(prev).add(jobId));
    try {
      const response = await fetchWithCSRF('/api/jobs/update-agent-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: selectedAction })
      });
      if (!response.ok) throw new Error('Failed to update job state');
      setJobs(jobs.map(j => j.id === jobId ? { ...j, agent_state: selectedAction } : j));
      toast.success('Job state updated successfully');
      // Reset dropdown for this card
      setSelectedActions(prev => ({ ...prev, [jobId]: '' }));
    } catch (error) {
      console.error('Error updating job state:', error);
      toast.error(error.message || 'Failed to update job state');
    } finally {
      setUpdatingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  // const handleRefresh = async () => {
  //   try {
  //     setIsLoading(true);
  //     const jobsResponse = await fetchWithCSRF('/api/jobs');
  //     if (!jobsResponse.ok) {
  //       throw new Error('Failed to fetch jobs');
  //     }
  //     const { jobs: jobsData } = await jobsResponse.json();
  //     setJobs(jobsData);
  //     toast.success('Jobs refreshed successfully');
  //   } catch (err) {
  //     console.error('Error refreshing jobs:', err);
  //     toast.error('Failed to refresh jobs');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };


  // Add pagination calculation functions
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = jobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(jobs.length / jobsPerPage);

  // Add pagination controls component
  const PaginationControls = () => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded-md ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Previous
        </button>
        
        {pageNumbers.map(number => (
          <button
            key={number}
            onClick={() => setCurrentPage(number)}
            className={`px-3 py-1 rounded-md ${
              currentPage === number
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {number}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded-md ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Next
        </button>
      </div>
    );
  };

  // Update job statuses when jobs change
  useEffect(() => {
    const updateJobStatuses = async () => {
      const newStatuses = {};
      for (const job of jobs) {
        if (job?.status === "active") {
          const isActive = new Date() <= new Date(job.job_end_date);
          if (!isActive) {
            try {
              await fetchWithCSRF(`/api/jobs/${job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'closed' })
              });
            } catch (error) {
              console.error('Error updating job status:', error);
            }
          }
          newStatuses[job.id] = isActive;
        } else {
          newStatuses[job.id] = false;
        }
      }
      setJobStatuses(newStatuses);
    };

    updateJobStatuses();
  }, [jobs]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
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
        isSubscribed={isSubscribed}
      />

      {/* Add DeleteJobModal */}
      <DeleteJobModal 
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setJobToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        jobTitle={jobToDelete?.title}
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentJobs.map((job) => (
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
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full
                              ${job.agent_state === 'running' ? 'bg-green-100 text-green-800 border border-green-400'
                                : job.agent_state === 'stopped' ? 'bg-red-100 text-red-700 border border-red-400'
                                : job.agent_state === 'paused' ? 'bg-gray-900 text-white border border-gray-900'
                                : ''}
                            `}
                            style={{ minWidth: 70, display: 'inline-block', textAlign: 'center' }}
                          >
                            {job.agent_state}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          jobStatuses[job.id]
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {jobStatuses[job.id] ? 'Active' : 'Closed'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
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
                              ${!isSubscribed || !jobStatuses[job.id]
                                ? 'bg-gray-100 cursor-not-allowed opacity-60'
                                : 'hover:border-gray-400 cursor-pointer'
                              }`}
                            value={selectedActions[job.id] || ''}
                            onChange={(e) => handleActionSelect(job.id, e.target.value)}
                            disabled={!jobStatuses[job.id] || !isSubscribed}
                          >
                            <option value="">Choose an action</option>
                            {getValidActions(job).map(action => (
                              <option key={action} value={action}>{action}</option>
                            ))}
                          </select>
                          {(!isSubscribed || !jobStatuses[job.id]) && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-2">
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
                            ${!selectedActions[job.id] || !jobStatuses[job.id] || !isSubscribed
                              ? 'btn-secondary bg-gray-100 cursor-not-allowed opacity-60'
                              : 'btn-primary hover:bg-primary-dark'
                            }`}
                          onClick={(e) => handleActionClick(e, job.id)}
                          disabled={!selectedActions[job.id] || !jobStatuses[job.id] || !isSubscribed || updatingJobs.has(job.id)}
                        >
                          {updatingJobs.has(job.id) ? (
                            <div className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Updating...
                            </div>
                          ) : (
                            'Go'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && <PaginationControls />}
          </>
        )}
      </div>
    </div>
  );
} 
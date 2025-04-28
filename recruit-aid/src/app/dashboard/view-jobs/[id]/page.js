'use client';

import { getJobById, getMembers } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JobDetail() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  
  // Load job data from Supabase
  useEffect(() => {
    async function loadJob() {
      if (!params.id) {
        setError('Job ID is required');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const { job: jobData, error: jobError } = await getJobById(params.id);
        
        if (jobError) {
          throw new Error(jobError.message);
        }
        
        if (!jobData) {
          throw new Error('Job not found');
        }
        
        setJob(jobData);
      } catch (err) {
        console.error('Error loading job:', err);
        setError(err.message || 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadJob();
  }, [params.id]);
  
  // Load members
  useEffect(() => {
    async function loadMembers() {
      if (!params.id) return;
      
      try {
        setIsLoadingMembers(true);
        const { members: membersData, error } = await getMembers(params.id);
        
        if (error) {
          console.error('Error loading members:', error);
        } else {
          setMembers(membersData || []);
        }
      } catch (err) {
        console.error('Error loading members:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    }
    
    loadMembers();
  }, [params.id]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Convert text to bullet points
  const formatBulletPoints = (text) => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim() !== '').map(line => line.trim());
  };

  // Check if job can be edited (not closed)
  const canEdit = job && (new Date() <= new Date(job.job_end_date));
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-primary-light h-12 w-12 mb-4"></div>
          <div className="text-gray-600">Loading job details...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Job Details</h1>
          <Link href="/dashboard/view-jobs" className="btn btn-outline-primary transition-all hover:shadow-md">
            Back to Jobs
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-custom p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
          
          <div className="flex justify-center mt-6">
            <Link href="/dashboard/view-jobs" className="btn btn-primary">
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!job) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Job Details</h1>
          <Link href="/dashboard/view-jobs" className="btn btn-outline-primary transition-all hover:shadow-md">
            Back to Jobs
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-custom p-6">
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Job not found</div>
            <Link href="/dashboard/view-jobs" className="btn btn-primary">
              Back to Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Details</h1>
        <div className="space-x-3">
          {canEdit && (
            <Link 
              href={`/dashboard/view-jobs/${job.id}/edit`} 
              className="btn btn-outline-primary transition-all hover:shadow-md"
            >
              Edit Job
            </Link>
          )}
          <Link 
            href="/dashboard/view-jobs" 
            className="btn btn-outline-secondary transition-all hover:shadow-md"
          >
            Back to Jobs
          </Link>
        </div>
      </div>

      {/* Job Details Box - 35% of screen height */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-[35vh] overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              new Date() <= new Date(job.job_end_date)
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {new Date() <= new Date(job.job_end_date)
                ? 'Active'
                : 'Closed'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Job Title</h3>
              <p className="text-base text-gray-900">{job.title}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
              <p className="text-base text-gray-900">{formatDate(job.job_start_date)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">End Time</h3>
              <p className="text-base text-gray-900">{formatDate(job.job_end_date)}</p>
            </div>
            {job.Job_email && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Sender Email</h3>
                <p className="text-base text-gray-900">{job.Job_email}</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-auto">
            {job.About && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">About</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {formatBulletPoints(job.About).slice(0, 3).map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                  {formatBulletPoints(job.About).length > 3 && (
                    <li className="text-primary">+ {formatBulletPoints(job.About).length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
            
            {job.MoreDetails && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">More Details</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {formatBulletPoints(job.MoreDetails).slice(0, 3).map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                  {formatBulletPoints(job.MoreDetails).length > 3 && (
                    <li className="text-primary">+ {formatBulletPoints(job.MoreDetails).length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Members Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Members ({members.length})</h2>
        
        {isLoadingMembers ? (
          <div className="text-center py-4">
            <div className="animate-pulse">Loading members...</div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No members yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {member.name_email.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {member.name_email.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary hover:text-primary-dark transition-colors">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-4">
        <Link
          href="/dashboard/view-jobs"
          className="btn btn-outline-primary transition-all hover:scale-105 hover:shadow-md"
        >
          Back to Jobs
        </Link>
        {canEdit && (
          <Link
            href={`/dashboard/view-jobs/${job.id}/edit`}
            className="btn btn-primary transition-all hover:scale-105 hover:shadow-md"
          >
            Edit Job
          </Link>
        )}
      </div>
    </div>
  );
} 
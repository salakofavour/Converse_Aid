'use client';

import { createJob } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';


export default function JobSummary() {
  const router = useRouter();
  const [jobData, setJobData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Load job data from localStorage
  useEffect(() => {
    const storedJobData = localStorage.getItem('jobFormData');
    if (storedJobData) {
      try {
        const parsedJobData = JSON.parse(storedJobData);
        setJobData(parsedJobData);
      } catch (error) {
        console.error('Error parsing job data from localStorage:', error);
        setError('Failed to load job data. Please go back and try again.');
      }
    } else {
      setError('No job data found. Please go back and fill in the job details.');
    }
    setIsLoading(false);
  }, []);
  
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
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!jobData) {
      setError('No job data found. Please go back and fill in the job details.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Determine status based on dates
      const currentDate = new Date();
      const startDate = new Date(jobData.flowStartDate);
      const endDate = new Date(jobData.flowEndDate);
      
      let status = 'active';
      
      if (currentDate < startDate) {
        status = 'scheduled';
      } else if (currentDate > endDate) {
        status = 'closed';
      }
      
      // Prepare job data for submission
      const supabaseJobData = {
        title: jobData.title,
        department: jobData.department,
        location: jobData.location,
        job_type: jobData.jobType,
        salary_min: jobData.salaryMin || null,
        salary_max: jobData.salaryMax || null,
        flow_start_date: jobData.flowStartDate,
        flow_end_date: jobData.flowEndDate,
        responsibilities: jobData.responsibilities,
        qualifications: jobData.qualifications,
        Job_email: jobData.senderEmail,
        status: status,
        status_manually_set: false
      };
      
      // Save to Supabase
      const { job, error: saveError } = await createJob(supabaseJobData);
      
      if (saveError) {
        throw new Error(saveError.message);
      }
      
      // Clear localStorage
      localStorage.removeItem('jobFormData');
      
      // Navigate to view-jobs page
      router.push('/dashboard/view-jobs');
      
    } catch (err) {
      console.error('Error creating job:', err);
      setError(err.message || 'An error occurred while creating the job');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-primary-light h-12 w-12 mb-4"></div>
          <div className="text-gray-600">Loading job summary...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Job Summary</h1>
          <Link href="/dashboard/create-job/template" className="btn btn-outline-primary transition-all hover:shadow-md">
            Back to Template
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-custom p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
          
          <div className="flex justify-center mt-6">
            <Link href="/dashboard/create-job/template" className="btn btn-primary">
              Go Back to Template
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!jobData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Job Summary</h1>
          <Link href="/dashboard/create-job/template" className="btn btn-outline-primary transition-all hover:shadow-md">
            Back to Template
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-custom p-6">
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No job data found</div>
            <Link href="/dashboard/create-job/template" className="btn btn-primary">
              Go Back to Template
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Summary</h1>
        <Link href="/dashboard/create-job/template" className="btn btn-outline-primary transition-all hover:shadow-md">
          Back to Template
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <div className="space-y-8">
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Job Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">Job Title</h3>
                <p className="text-gray-900">{jobData.title}</p>
              </div>
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">Department</h3>
                <p className="text-gray-900">{jobData.department}</p>
              </div>
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">Location</h3>
                <p className="text-gray-900">{jobData.location}</p>
              </div>
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">Job Type</h3>
                <p className="text-gray-900">{jobData.jobType === 'in-office' ? 'In-Office' : jobData.jobType === 'hybrid' ? 'Hybrid' : 'Remote'}</p>
              </div>
              {(jobData.salaryMin || jobData.salaryMax) && (
                <div>
                  <h3 className="text-gray-500 text-sm font-medium mb-1">Salary Range</h3>
                  <p className="text-gray-900">
                    {jobData.salaryMin && jobData.salaryMax 
                      ? `$${Number(jobData.salaryMin).toLocaleString()} - $${Number(jobData.salaryMax).toLocaleString()} per year`
                      : jobData.salaryMin 
                        ? `Starting from $${Number(jobData.salaryMin).toLocaleString()} per year`
                        : `Up to $${Number(jobData.salaryMax).toLocaleString()} per year`
                    }
                  </p>
                </div>
              )}
              <div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">Recruitment Timeline</h3>
                <p className="text-gray-900">{formatDate(jobData.flowStartDate)} to {formatDate(jobData.flowEndDate)}</p>
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">About the Role</h2>
            <p className="text-gray-700">
              We're looking for a {jobData.title} to join our team
              {jobData.jobType === 'remote' ? ' remotely' : jobData.jobType === 'hybrid' ? ' in a hybrid capacity' : ''}
              {jobData.location ? ` in ${jobData.location}` : ''}.
            </p>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {formatBulletPoints(jobData.responsibilities).map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">qualifications</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              {formatBulletPoints(jobData.qualifications).map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href="/dashboard/create-job/template"
              className="btn btn-outline-primary transition-all hover:scale-105 hover:shadow-md"
            >
              Back
            </Link>
            <button
              type="button"
              className="btn btn-primary transition-all hover:scale-105 hover:shadow-md"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                'Finish'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
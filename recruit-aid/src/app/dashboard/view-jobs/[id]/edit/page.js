'use client';

import { getJobById, getProfile, updateJob } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditJob() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    jobType: '',
    salaryMin: '',
    salaryMax: '',
    flowStartDate: '',
    flowEndDate: '',
    responsibilities: '',
    requirements: '',
    status: 'active',
    statusManuallySet: false,
    applicants: [],
    Job_email: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [senderEmails, setSenderEmails] = useState([]);
  const [isLoadingSenderEmails, setIsLoadingSenderEmails] = useState(true);
  const [senderEmailError, setSenderEmailError] = useState('');
  
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
        const { job, error: jobError } = await getJobById(params.id);
        
        if (jobError) {
          throw new Error(jobError.message);
        }
        
        if (!job) {
          throw new Error('Job not found');
        }
        
        // Check if job is closed - redirect to view page if it is
        if (job.status === 'closed') {
          router.push(`/dashboard/view-jobs/${params.id}`);
          return;
        }
        
        // Format dates for input fields
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };
        
        // Determine status based on dates
        const currentDate = new Date();
        const startDate = new Date(job.flow_start_date);
        const endDate = new Date(job.flow_end_date);
        
        let calculatedStatus = job.status;
        
        // Only auto-update status if user hasn't manually set it
        if (!job.status_manually_set) {
          if (currentDate < startDate) {
            calculatedStatus = 'scheduled';
          } else if (currentDate > endDate) {
            calculatedStatus = 'closed';
          } else {
            calculatedStatus = 'active';
          }
        }
        
        setFormData({
          title: job.title || '',
          department: job.department || '',
          location: job.location || '',
          jobType: job.job_type || '',
          salaryMin: job.salary_min || '',
          salaryMax: job.salary_max || '',
          flowStartDate: formatDateForInput(job.flow_start_date),
          flowEndDate: formatDateForInput(job.flow_end_date),
          responsibilities: job.responsibilities || '',
          requirements: job.requirements || '',
          status: calculatedStatus || 'active',
          statusManuallySet: job.status_manually_set || false,
          applicants: job.applicants || [],
          Job_email: job.Job_email || ''
        });
      } catch (err) {
        console.error('Error loading job:', err);
        setError(err.message || 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadJob();
  }, [params.id, router]);
  
  // Load sender emails from profile
  useEffect(() => {
    async function loadSenderEmails() {
      setIsLoadingSenderEmails(true);
      try {
        const { profile, error } = await getProfile();
        if (error) {
          console.error('Error fetching profile:', error);
          setSenderEmailError('Failed to load sender emails');
        } else if (profile && profile.sender) {
          const emails = profile.sender.map(item => 
            typeof item === 'string' ? item : item.email
          );
          setSenderEmails(emails);
        }
      } catch (err) {
        console.error('Error fetching sender emails:', err);
        setSenderEmailError('Failed to load sender emails');
      } finally {
        setIsLoadingSenderEmails(false);
      }
    }
    
    loadSenderEmails();
  }, []);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'status') {
      // Mark status as manually set when user changes it
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        statusManuallySet: true 
      }));
    } else if (name === 'flowStartDate' || name === 'flowEndDate') {
      // When dates change, recalculate status if not manually set
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        
        if (!prev.statusManuallySet) {
          const currentDate = new Date();
          const startDate = name === 'flowStartDate' ? new Date(value) : new Date(prev.flowStartDate);
          const endDate = name === 'flowEndDate' ? new Date(value) : new Date(prev.flowEndDate);
          
          if (currentDate < startDate) {
            newData.status = 'scheduled';
          } else if (currentDate > endDate) {
            newData.status = 'closed';
          } else {
            newData.status = 'active';
          }
        }
        
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.title || !formData.department || !formData.location || !formData.jobType || 
        !formData.flowStartDate || !formData.flowEndDate || !formData.Job_email) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate dates
    const startDate = new Date(formData.flowStartDate);
    const endDate = new Date(formData.flowEndDate);
    
    if (endDate < startDate) {
      setError('End date cannot be before start date');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Prepare job data for submission
      const jobData = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        job_type: formData.jobType,
        salary_min: formData.salaryMin || null,
        salary_max: formData.salaryMax || null,
        flow_start_date: formData.flowStartDate,
        flow_end_date: formData.flowEndDate,
        responsibilities: formData.responsibilities,
        requirements: formData.requirements,
        status: formData.status,
        status_manually_set: formData.statusManuallySet,
        Job_email: formData.Job_email
      };
      
      // Update job in Supabase
      const { job, error: updateError } = await updateJob(params.id, jobData);
      
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Navigate to job details page
      router.push(`/dashboard/view-jobs/${params.id}`);
      
    } catch (err) {
      console.error('Error updating job:', err);
      setError(err.message || 'An error occurred while updating the job');
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Job</h1>
        <Link href={`/dashboard/view-jobs/${params.id}`} className="btn btn-outline-primary transition-all hover:shadow-md">
          Cancel
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="jobType" className="block text-sm font-medium text-gray-700">
                Job Type <span className="text-red-500">*</span>
              </label>
              <select
                id="jobType"
                name="jobType"
                value={formData.jobType}
                onChange={handleChange}
                className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              >
                <option value="">Select Job Type</option>
                <option value="in-office">In-Office</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700">
                Minimum Salary
              </label>
              <input
                type="number"
                id="salaryMin"
                name="salaryMin"
                value={formData.salaryMin}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                min="0"
                step="1000"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="salaryMax" className="block text-sm font-medium text-gray-700">
                Maximum Salary
              </label>
              <input
                type="number"
                id="salaryMax"
                name="salaryMax"
                value={formData.salaryMax}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                min="0"
                step="1000"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="flowStartDate" className="block text-sm font-medium text-gray-700">
                Flow Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="flowStartDate"
                name="flowStartDate"
                value={formData.flowStartDate}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="flowEndDate" className="block text-sm font-medium text-gray-700">
                Flow End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="flowEndDate"
                name="flowEndDate"
                value={formData.flowEndDate}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              >
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="closed">Closed</option>
              </select>
              <p className="text-xs text-gray-500">
                {formData.statusManuallySet 
                  ? "Status manually set" 
                  : "Status automatically determined by dates"}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="responsibilities" className="block text-sm font-medium text-gray-700">
              Job Responsibilities
            </label>
            <p className="text-xs text-gray-500">Enter each responsibility on a new line</p>
            <textarea
              id="responsibilities"
              name="responsibilities"
              value={formData.responsibilities}
              onChange={handleChange}
              rows={5}
              className="form-textarea block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Enter job responsibilities, one per line"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
              Job Requirements
            </label>
            <p className="text-xs text-gray-500">Enter each requirement on a new line</p>
            <textarea
              id="requirements"
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              rows={5}
              className="form-textarea block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Enter job requirements, one per line"
            ></textarea>
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <label htmlFor="Job_email" className="block text-sm font-medium text-gray-700">
              Sender Email <span className="text-red-500">*</span>
            </label>
            
            {isLoadingSenderEmails ? (
              <div className="mt-1 py-2">Loading sender emails...</div>
            ) : senderEmailError ? (
              <div className="mt-1 text-red-500">{senderEmailError}</div>
            ) : senderEmails.length === 0 ? (
              <div className="mt-1 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative">
                <p className="font-medium">You have no sender email</p>
                <p className="text-sm">Please add a sender email in your profile settings.</p>
                <Link href="/dashboard/settings" className="text-primary hover:underline text-sm mt-2 inline-block">
                  Go to Settings
                </Link>
              </div>
            ) : (
              <select
                id="Job_email"
                name="Job_email"
                className="mt-1 form-select block w-full"
                value={formData.Job_email}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select a sender email</option>
                {senderEmails.map((email, index) => (
                  <option key={index} value={email}>{email}</option>
                ))}
              </select>
            )}
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href={`/dashboard/view-jobs/${params.id}`}
              className="btn btn-outline-primary transition-all hover:scale-105 hover:shadow-md"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary transition-all hover:scale-105 hover:shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
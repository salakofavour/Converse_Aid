'use client';

import { createApplicant, deleteApplicant, getApplicants, getJobById, getProfile, updateJob } from '@/lib/supabase';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditJob() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    jobStartDate: '',
    jobEndDate: '',
    about: '',
    moreDetails: '',
    status: 'active',
    applicants: [],
    Job_email: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [senderEmails, setSenderEmails] = useState([]);
  const [isLoadingSenderEmails, setIsLoadingSenderEmails] = useState(true);
  const [senderEmailError, setSenderEmailError] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(true);
  
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
        
        // Check if job is closed based on end date
        const currentDate = new Date();
        const endDate = new Date(job.job_end_date);
        if (currentDate > endDate) {
          router.push(`/dashboard/view-jobs/${params.id}`);
          return;
        }
        
        // Format dates for input fields
        const formatDateForInput = (dateString) => {
          if (!dateString) return '';
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        };
        
        setFormData({
          title: job.title || '',
          jobStartDate: formatDateForInput(job.job_start_date),
          jobEndDate: formatDateForInput(job.job_end_date),
          about: job.about || '',
          moreDetails: job.more_details || '',
          status: job.status || 'active',
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
  
  // Load applicants
  useEffect(() => {
    async function loadApplicants() {
      if (!params.id) return;
      
      try {
        setIsLoadingApplicants(true);
        const { applicants: applicantsData, error } = await getApplicants(params.id);
        
        if (error) {
          console.error('Error loading applicants:', error);
        } else {
          setApplicants(applicantsData || []);
        }
      } catch (err) {
        console.error('Error loading applicants:', err);
      } finally {
        setIsLoadingApplicants(false);
      }
    }
    
    loadApplicants();
  }, [params.id]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare job data for submission
      const jobData = {
        title: formData.title,
        job_start_date: formData.jobStartDate,
        job_end_date: formData.jobEndDate,
        about: formData.about,
        more_details: formData.moreDetails,
        Job_email: formData.Job_email,
        status: formData.status
      };

      const { error: updateError } = await updateJob(params.id, jobData);
      
      if (updateError) throw new Error(updateError.message);
      
      router.push(`/dashboard/view-jobs/${params.id}`);
    } catch (err) {
      console.error('Error updating job:', err);
      setError(err.message || 'Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  // Handle adding an applicant
  const handleAddApplicant = async () => {
    // Reset error state
    setEmailError('');
    
    // Validate inputs
    if (!applicantName.trim()) {
      return; // Don't add if name is empty
    }
    
    if (!validateEmail(applicantEmail)) {
      setEmailError('Invalid email format');
      return;
    }
    
    try {
      // Add to applicants list
      const { applicant, error } = await createApplicant(params.id, {
        name: applicantName.trim(),
        email: applicantEmail.trim()
      });
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setApplicants(prev => [applicant, ...prev]);
      
      // Show success message briefly
      setShowAddedMessage(true);
      setTimeout(() => {
        setShowAddedMessage(false);
      }, 2000);
      
      // Clear input fields
      setApplicantName('');
      setApplicantEmail('');
      
    } catch (err) {
      console.error('Error adding applicant:', err);
      setError('Failed to add applicant');
    }
  };
  
  // Handle removing an applicant
  const handleRemoveApplicant = async (applicantId) => {
    try {
      const { error } = await deleteApplicant(applicantId);
      
      if (error) {
        throw error;
      }
      
      // Update local state
      setApplicants(prev => prev.filter(a => a.id !== applicantId));
      
    } catch (err) {
      console.error('Error removing applicant:', err);
      setError('Failed to remove applicant');
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
              <label htmlFor="jobStartDate" className="block text-sm font-medium text-gray-700">
                Job Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="jobStartDate"
                name="jobStartDate"
                value={formData.jobStartDate}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="jobEndDate" className="block text-sm font-medium text-gray-700">
                Job End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="jobEndDate"
                name="jobEndDate"
                value={formData.jobEndDate}
                onChange={handleChange}
                className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="about" className="block text-sm font-medium text-gray-700">
              About
            </label>
            <p className="text-xs text-gray-500">Enter each responsibility on a new line</p>
            <textarea
              id="about"
              name="about"
              value={formData.about}
              onChange={handleChange}
              rows={5}
              className="form-textarea block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Enter job responsibilities, one per line"
            ></textarea>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="moreDetails" className="block text-sm font-medium text-gray-700">
              More Details
            </label>
            <p className="text-xs text-gray-500">Enter each requirement on a new line</p>
            <textarea
              id="moreDetails"
              name="moreDetails"
              value={formData.moreDetails}
              onChange={handleChange}
              rows={5}
              className="form-textarea block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Enter job qualifications, one per line"
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
          
          {/* Applicants Section */}
          <div className="border-t border-gray-200 mt-8 pt-8">
            <h2 className="text-xl font-semibold mb-6">Manage Applicants</h2>
            
            {/* Add Applicant Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="applicantName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="applicantName"
                  type="text"
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                />
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="applicantEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="applicantEmail"
                  type="email"
                  className={`form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 ${emailError ? 'border-red-500' : ''}`}
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1 animate-pulse">{emailError}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center mb-6">
              <button
                type="button"
                onClick={handleAddApplicant}
                className="btn btn-outline-primary hover:scale-105 transition-transform"
              >
                + Add Applicant
              </button>
              
              {showAddedMessage && (
                <span className="ml-3 text-green-500 text-sm animate-fade-in-out">
                  Applicant added successfully!
                </span>
              )}
            </div>
            
            {/* Applicants List */}
            {isLoadingApplicants ? (
              <div className="text-center py-4">
                <div className="animate-pulse">Loading applicants...</div>
              </div>
            ) : applicants.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No applicants added yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applicants.map((applicant) => (
                      <tr key={applicant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {applicant.name_email.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {applicant.name_email.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleRemoveApplicant(applicant.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
'use client';

import { getProfile } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JobTemplate() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    jobStartDate: '',
    jobEndDate: '',
    about: '',
    moreDetails: '',
    senderEmail: ''
  });
  
  const [dateError, setDateError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [senderEmails, setSenderEmails] = useState([]);
  const [isLoadingSenderEmails, setIsLoadingSenderEmails] = useState(true);
  const [senderEmailError, setSenderEmailError] = useState('');
  
  // Get sender emails from profile
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
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Validate dates whenever they change
  useEffect(() => {
    validateDates();
  }, [formData.jobStartDate, formData.jobEndDate]);
  
  // Function to validate that end date is at least a day after start date
  const validateDates = () => {
    const { jobStartDate, jobEndDate } = formData;
    
    // Clear error if either date is empty
    if (!jobStartDate || !jobEndDate) {
      setDateError('');
      return;
    }
    
    const startDate = new Date(jobStartDate);
    const endDate = new Date(jobEndDate);
    
    // Calculate the difference in days
    const diffTime = endDate - startDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) {
      setDateError('End date must be at least a day after start date');
    } else {
      setDateError('');
    }
  };
  
  // Format date for min attribute (prevents selecting dates before today)
  const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Calculate minimum end date based on selected start date
  const getMinEndDate = () => {
    if (!formData.jobStartDate) return getTodayFormatted();
    
    const startDate = new Date(formData.jobStartDate);
    const minEndDate = new Date(startDate);
    minEndDate.setDate(startDate.getDate() + 1);
    
    const year = minEndDate.getFullYear();
    const month = String(minEndDate.getMonth() + 1).padStart(2, '0');
    const day = String(minEndDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Handle form submission
  const handleSubmit = () => {
    // Validate required fields
    if (!formData.title || !formData.jobStartDate || !formData.jobEndDate || !formData.senderEmail) {
      setSubmitError('Please fill in all required fields');
      return;
    }
    
    // Validate dates again
    if (dateError) {
      return;
    }
    
    // Save form data to localStorage for the summary page
    localStorage.setItem('jobFormData', JSON.stringify(formData));
    
    // Navigate to the summary page
    router.push('/dashboard/create-job/summary');
  };
  
  // Convert textarea input to bullet points for preview
  const formatBulletPoints = (text) => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim() !== '').map(line => line.trim());
  };
  
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Create Job Template</h1>
      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative animate-fade-in" role="alert">
            <span className="block sm:inline">{submitError}</span>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="title" className="block text-gray-700 mb-2">
                  Job Title*
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  placeholder="e.g. Frontend Developer"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="jobStartDate" className="block text-gray-700 mb-2">
                  Job Start Date*
                </label>
                <input
                  id="jobStartDate"
                  name="jobStartDate"
                  type="date"
                  min={getTodayFormatted()}
                  className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  value={formData.jobStartDate}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">When the job process begins</p>
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="jobEndDate" className="block text-gray-700 mb-2">
                  Job End Date*
                </label>
                <input
                  id="jobEndDate"
                  name="jobEndDate"
                  type="date"
                  min={getMinEndDate()}
                  className={`form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all ${dateError ? 'border-red-500' : ''}`}
                  value={formData.jobEndDate}
                  onChange={handleChange}
                  disabled={!formData.jobStartDate}
                  required
                />
                {dateError && (
                  <p className="text-red-500 text-xs mt-1 animate-pulse">{dateError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">When the job process ends</p>
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">About Job*</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Enter each information on a new line. These will be formatted as bullet points.</p>
              <textarea
                id="about"
                name="about"
                rows="5"
                className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all w-full"
                placeholder="e.g.\nDescribe the job."
                value={formData.about}
                onChange={handleChange}
                required
              ></textarea>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">More details*</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Enter more details about the job, each on a new line. These will be formatted as bullet points.</p>
              <textarea
                id="moreDetails"
                name="moreDetails"
                rows="5"
                className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all w-full"
                placeholder="e.g. List any extra details about the job."
                value={formData.moreDetails}
                onChange={handleChange}
                required
              ></textarea>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Sender Email*</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Select the email address that will be used to send communications related to this job.</p>
              
              {isLoadingSenderEmails ? (
                <div className="py-2">Loading sender emails...</div>
              ) : senderEmailError ? (
                <div className="text-red-500">{senderEmailError}</div>
              ) : senderEmails.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative">
                  <p className="font-medium">You have no sender email</p>
                  <p className="text-sm">Please add a sender email in your profile settings before creating a job.</p>
                  <Link href="/dashboard/settings" className="text-primary hover:underline text-sm mt-2 inline-block">
                    Go to Settings
                  </Link>
                </div>
              ) : (
                <select
                  id="senderEmail"
                  name="senderEmail"
                  className="form-select focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all w-full"
                  value={formData.senderEmail}
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
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/view-jobs')}
              className="btn btn-outline-primary transition-all hover:scale-105 hover:shadow-md"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary transition-all hover:scale-105 hover:shadow-md"
              onClick={handleSubmit}
              disabled={dateError}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
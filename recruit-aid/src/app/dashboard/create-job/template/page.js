'use client';

import { getProfile } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function JobTemplate() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    jobType: 'in-office',
    salaryMin: '',
    salaryMax: '',
    flowStartDate: '',
    flowEndDate: '',
    responsibilities: '',
    requirements: '',
    applicants: [],
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
  
  // Get applicants from localStorage if available
  useEffect(() => {
    const storedApplicants = localStorage.getItem('applicants');
    if (storedApplicants) {
      try {
        const parsedApplicants = JSON.parse(storedApplicants);
        setFormData(prev => ({
          ...prev,
          applicants: parsedApplicants
        }));
      } catch (error) {
        console.error('Error parsing applicants from localStorage:', error);
      }
    }
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
  }, [formData.flowStartDate, formData.flowEndDate]);
  
  // Function to validate that end date is at least a day after start date
  const validateDates = () => {
    const { flowStartDate, flowEndDate } = formData;
    
    // Clear error if either date is empty
    if (!flowStartDate || !flowEndDate) {
      setDateError('');
      return;
    }
    
    const startDate = new Date(flowStartDate);
    const endDate = new Date(flowEndDate);
    
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
    if (!formData.flowStartDate) return getTodayFormatted();
    
    const startDate = new Date(formData.flowStartDate);
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
    if (!formData.title || !formData.department || !formData.location || !formData.flowStartDate || !formData.flowEndDate || !formData.senderEmail) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Template</h1>
        <Link href="/dashboard/create-job" className="btn btn-outline-primary transition-all hover:shadow-md">
          Back
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        <div className="space-y-6">
          <p className="text-gray-600">
            Use our suggested template to create your job posting quickly.
          </p>
          
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative animate-fade-in" role="alert">
              <span className="block sm:inline">{submitError}</span>
            </div>
          )}
          
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
                <label htmlFor="department" className="block text-gray-700 mb-2">
                  Department*
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  placeholder="e.g. Engineering"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="location" className="block text-gray-700 mb-2">
                  Location*
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  placeholder="e.g. New York, NY"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="jobType" className="block text-gray-700 mb-2">
                  Job Type*
                </label>
                <select
                  id="jobType"
                  name="jobType"
                  className="form-select focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  value={formData.jobType}
                  onChange={handleChange}
                  required
                >
                  <option value="in-office">In-Office</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="remote">Remote</option>
                </select>
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="flowStartDate" className="block text-gray-700 mb-2">
                  Flow Start Date*
                </label>
                <input
                  id="flowStartDate"
                  name="flowStartDate"
                  type="date"
                  min={getTodayFormatted()}
                  className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  value={formData.flowStartDate}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">When the recruitment process begins</p>
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="flowEndDate" className="block text-gray-700 mb-2">
                  Flow End Date*
                </label>
                <input
                  id="flowEndDate"
                  name="flowEndDate"
                  type="date"
                  min={getMinEndDate()}
                  className={`form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all ${dateError ? 'border-red-500' : ''}`}
                  value={formData.flowEndDate}
                  onChange={handleChange}
                  disabled={!formData.flowStartDate}
                  required
                />
                {dateError && (
                  <p className="text-red-500 text-xs mt-1 animate-pulse">{dateError}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">When the recruitment process ends</p>
              </div>
              <div className="col-span-1 md:col-span-2 transition-all duration-300 ease-in-out">
                <label htmlFor="salary" className="block text-gray-700 mb-2">
                  Salary Range
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      id="salaryMin"
                      name="salaryMin"
                      type="number"
                      className="form-control pl-8 focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                      placeholder="Minimum"
                      value={formData.salaryMin}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      id="salaryMax"
                      name="salaryMax"
                      type="number"
                      className="form-control pl-8 focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                      placeholder="Maximum"
                      value={formData.salaryMax}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave blank if you prefer not to disclose</p>
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Job Responsibilities*</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Enter each responsibility on a new line. These will be formatted as bullet points.</p>
              <textarea
                id="responsibilities"
                name="responsibilities"
                rows="5"
                className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all w-full"
                placeholder="e.g.&#10;Design and implement features&#10;Collaborate with team members&#10;Ensure code quality and performance"
                value={formData.responsibilities}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
          
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Job Qualifications*</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Enter each qualifications on a new line. These will be formatted as bullet points.</p>
              <textarea
                id="requirements"
                name="requirements"
                rows="5"
                className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all w-full"
                placeholder="e.g.&#10;X+ years of experience&#10;Proficiency in relevant technologies&#10;Strong communication skills"
                value={formData.requirements}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
          
          {formData.applicants.length > 0 && (
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold mb-4">Applicants ({formData.applicants.length})</h2>
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {formData.applicants.map((applicant, index) => (
                    <li 
                      key={index} 
                      className="flex items-center justify-between bg-gray-50 p-3 rounded hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <span className="font-medium">{applicant.name}</span>
                        <span className="text-gray-500 ml-2">({applicant.email})</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {/* Sender Email Section */}
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
              onClick={() => router.push('/dashboard/create-job')}
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
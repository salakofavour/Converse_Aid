'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { validateFile } from '@/lib/file-processor';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaFileAlt, FaTimesCircle } from 'react-icons/fa';

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
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderEmails, setSenderEmails] = useState([]);
  const [isLoadingSenderEmails, setIsLoadingSenderEmails] = useState(true);
  const [senderEmailError, setSenderEmailError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [aboutWordCount, setAboutWordCount] = useState(0);
  const [moreDetailsWordCount, setMoreDetailsWordCount] = useState(0);
  const WORD_LIMIT = 1000;

  // Load sender emails from profile
  useEffect(() => {
    async function loadSenderEmails() {
      setIsLoadingSenderEmails(true);
      try {
        const response = await fetchWithCSRF('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const { profile } = await response.json();
        if (profile && profile.sender) {
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

  // Function to count words in text
  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get minimum end date (start date + 1 day)
  const getMinEndDate = () => {
    if (!formData.jobStartDate) return getTodayFormatted();
    const startDate = new Date(formData.jobStartDate);
    const minEndDate = new Date(startDate);
    minEndDate.setDate(minEndDate.getDate() + 1);
    return minEndDate.toISOString().split('T')[0];
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check word count for text areas
    if (name === 'about' || name === 'moreDetails') {
      const wordCount = countWords(value);
      if (wordCount > WORD_LIMIT) {
        return; // Don't update if word limit exceeded
      }
      if (name === 'about') {
        setAboutWordCount(wordCount);
      } else {
        setMoreDetailsWordCount(wordCount);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear date error when dates are changed
    if (name === 'jobStartDate' || name === 'jobEndDate') {
      setDateError('');
    }
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

  // // Validate file
  // const validateFile = (file) => {
  //   const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  //   const maxSize = 15 * 1024 * 1024; // 15MB

  //   if (!validTypes.includes(file.type)) {
  //     return { isValid: false, error: 'Please upload a PDF, DOC, DOCX or TXT file' };
  //   }

  //   if (file.size > maxSize) {
  //     return { isValid: false, error: 'File size must be less than 15MB' };
  //   }

  //   return { isValid: true };
  // };

  // Handle form submission
  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title || !formData.jobStartDate || !formData.jobEndDate || !formData.senderEmail) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    // Validate that either file is selected or text areas are filled
    if (!selectedFile && !formData.about && !formData.moreDetails) {
      setSubmitError('Please either upload a file or fill in the About and More Details sections');
      return;
    }

    // Validate dates again
    if (dateError) {
      return;
    }

    // If file is selected, store it in sessionStorage
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = function(e) {
        sessionStorage.setItem('selectedFile', e.target.result);
      };
      if(selectedFile.type === 'text/plain') {
        reader.readAsText(selectedFile);
      } else {
        reader.readAsDataURL(selectedFile);
      }
    }

    // Save form data to localStorage
    localStorage.setItem('jobFormData', JSON.stringify({
      ...formData,
      file_uploaded: !!selectedFile,
      fileName: selectedFile?.name || null
    }));

    // Navigate to the summary page
    router.push('/dashboard/create-job/summary');
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
        
        <form onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }} className="space-y-6">
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
            <h2 className="text-xl font-semibold mb-4">Input Knowledge Base by</h2>
            
            {/* File Upload Section */}
            <div className="mb-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {!selectedFile ? (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">PDF, DOC, DOCX or TXT (MAX. 15MB)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <FaFileAlt className="w-8 h-8 text-primary" />
                        <span className="text-sm text-gray-500">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedFile(null);
                            setFileError('');
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaTimesCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const validation = validateFile(file);
                        if (validation.isValid) {
                          setSelectedFile(file);
                          setFileError('');
                        } else {
                          setFileError(validation.error);
                        }
                      }
                    }}
                  />
                </label>
              </div>
              {fileError && (
                <p className="mt-2 text-sm text-red-600">{fileError}</p>
              )}
            </div>

            <div className="flex items-center justify-center my-4">
              <div className="border-t border-gray-300 flex-grow"></div>
              <span className="px-4 text-gray-500 bg-white">OR</span>
              <div className="border-t border-gray-300 flex-grow"></div>
            </div>

            {/* About and More Details sections */}
            {!selectedFile && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="about" className="block text-gray-700 mb-2">
                    About*
                  </label>
                  <textarea
                    id="about"
                    name="about"
                    rows={4}
                    className={`form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all ${
                      aboutWordCount === WORD_LIMIT ? 'border-yellow-500' : ''
                    }`}
                    placeholder="Enter job description in bullet points (one per line)"
                    value={formData.about}
                    onChange={handleChange}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">Enter each point on a new line</p>
                    <p className={`text-sm ${
                      aboutWordCount === WORD_LIMIT ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {aboutWordCount}/{WORD_LIMIT} words
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="moreDetails" className="block text-gray-700 mb-2">
                    Additional Details
                  </label>
                  <textarea
                    id="moreDetails"
                    name="moreDetails"
                    rows={4}
                    className={`form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all ${
                      moreDetailsWordCount === WORD_LIMIT ? 'border-yellow-500' : ''
                    }`}
                    placeholder="Enter any additional details in bullet points (one per line)"
                    value={formData.moreDetails}
                    onChange={handleChange}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">Enter each point on a new line</p>
                    <p className={`text-sm ${
                      moreDetailsWordCount === WORD_LIMIT ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {moreDetailsWordCount}/{WORD_LIMIT} words
                    </p>
                  </div>
                </div>
              </div>
            )}
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
              type="submit"
              className="btn btn-primary transition-all hover:scale-105 hover:shadow-md"
              disabled={dateError}
            >
              Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
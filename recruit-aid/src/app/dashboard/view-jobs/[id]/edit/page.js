'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { extractTextFromFile, validateFile } from '@/lib/file-processor';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaFileAlt, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'sonner';

export default function EditJob() {
  const router = useRouter();
  const params = useParams();
  
  const [formData, setFormData] = useState({
    title: '',
    jobStartDate: '',
    jobEndDate: '',
    about: '',
    moreDetails: '',
    status: 'active',
    members: [],
    Job_email: '',
    file_uploaded: false,
    original_filename: null
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [senderEmails, setSenderEmails] = useState([]);
  const [isLoadingSenderEmails, setIsLoadingSenderEmails] = useState(true);
  const [senderEmailError, setSenderEmailError] = useState('');
  const [members, setMembers] = useState([]);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [aboutWordCount, setAboutWordCount] = useState(0);
  const [moreDetailsWordCount, setMoreDetailsWordCount] = useState(0);
  const WORD_LIMIT = 1000;

  // Load job information
  useEffect(() => {
    loadJob();
  }, [params.id]);

  // Load sender email
  useEffect(() => {
    loadSenderEmails();
  }, []);

  // Load members
  useEffect(() => {
    loadMembers();
  }, [params.id]);

  const loadJob = async () => {
    try {
      const response = await fetchWithCSRF(`/api/jobs/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job');
      }
      const { job } = await response.json();
      
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
        Job_email: job.Job_email || '',
        members: job.members || [],
        file_uploaded: job.file_uploaded,
        original_filename: job.original_filename
      });

      // Set initial word counts
      setAboutWordCount(countWords(job.about || ''));
      setMoreDetailsWordCount(countWords(job.more_details || ''));
    } catch (error) {
      console.error('Error loading job:', error);
      toast.error('Failed to load job');
    } finally {
      setIsLoading(false);
    }
  };

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

  async function loadMembers() {
    if (!params.id) return;
    
    try {
      setIsLoadingMembers(true);
      const response = await fetchWithCSRF(`/api/members?jobId=${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const { members: membersData } = await response.json();
      setMembers(membersData || []);
    } catch (err) {
      console.error('Error loading members:', err);
      toast.error('Failed to load members');
    } finally {
      setIsLoadingMembers(false);
    }
  }

  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Check word count for text areas
    if (name === 'about' || name === 'moreDetails') {
      const wordCount = countWords(value);
      if (wordCount > WORD_LIMIT) {
        return;
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
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validation = validateFile(file);
      if (validation.isValid) {
        setSelectedFile(file);
        setFileError('');
        setFormData(prev => ({
          ...prev,
          file_uploaded: true,
          original_filename: file.name
        }));
      } else {
        setFileError(validation.error);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError('');
    setFormData(prev => ({
      ...prev,
      file_uploaded: false,
      original_filename: null
    }));
  };

  const handleSubmit = async (e) => {
    try {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);

      let jobData = {
        title: formData.title,
        job_start_date: formData.jobStartDate,
        job_end_date: formData.jobEndDate,
        about: formData.about,
        more_details: formData.moreDetails,
        Job_email: formData.Job_email,
        status: formData.status,
        file_uploaded: formData.file_uploaded,
        original_filename: formData.original_filename,
        file_content: ''
      };

      // If using file and a new file is selected
      if (formData.file_uploaded && selectedFile) {
        const { content, error } = await extractTextFromFile(selectedFile);
        if (error) {
          toast.error('Failed to process file: ' + error);
          return;
        }
        jobData.file_content = content;
      }

      const response = await fetchWithCSRF(`/api/jobs/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        throw new Error('Failed to update job');
      }

      toast.success('Job updated successfully!');
      router.push(`/dashboard/view-jobs/${params.id}`);
    } catch (err) {
      console.error('Error updating job:', err);
      toast.error('Failed to update job: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
    
  // Handle adding a member
  const handleAddMember = async () => {
    // Reset error state
    setEmailError('');
    
    // Validate inputs
    if (!memberName.trim()) {
      toast.error('Both Name & Email are required');
      return; // Don't add if name is empty
    }
    
    if (!validateEmail(memberEmail)) {
      setEmailError('Invalid email format');
      return;
    }
    
    try {
      const response = await fetchWithCSRF('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: params.id,
          name: memberName.trim(),
          email: memberEmail.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add member');
      }

      const { member } = await response.json();
      setMembers(prev => [member, ...prev]);
      
      // Show success message briefly
      setShowAddedMessage(true);
      setTimeout(() => {
        setShowAddedMessage(false);
      }, 2000);
      
      // Clear input fields
      setMemberName('');
      setMemberEmail('');
      
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error('Failed to add member');
    }
  };
    
  // Handle removing a member
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      const response = await fetchWithCSRF(`/api/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete member');
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast.success('Member removed successfully');
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error('Failed to remove member');
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
    <div className="max-w-3xl mx-auto py-10">
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
          {/* Basic Job Details */}
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

          {/* Knowledge Base Section */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Knowledge Base</h2>
            
            {/* File Upload Section */}
            <div className="mb-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  {!formData.file_uploaded ? (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-gray-500">DOC, DOCX or TXT (MAX. 15MB)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <FaFileAlt className="w-8 h-8 text-primary" />
                        <span className="text-sm text-gray-500">{formData.original_filename}</span>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
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
                    accept=".doc,.docx,.txt"
                    onChange={handleFileSelect}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
              {fileError && (
                <p className="mt-2 text-sm text-red-600">{fileError}</p>
              )}
            </div>

            {/* Text Areas Section */}
            {!formData.file_uploaded && (
              <>
                <div className="mb-4">
                  <label htmlFor="about" className="block text-sm font-medium text-gray-700">
                    About Job
                  </label>
                  <p className="text-xs text-gray-500">Enter information about the job, each on a new line</p>
                  <textarea
                    id="about"
                    name="about"
                    value={formData.about}
                    onChange={handleChange}
                    rows={5}
                    className="form-textarea block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Enter job information, one per line"
                  />
                  <div className={`text-sm mt-1 text-right ${
                    aboutWordCount === WORD_LIMIT ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {aboutWordCount}/{WORD_LIMIT} words
                  </div>
                </div>

                <div>
                  <label htmlFor="moreDetails" className="block text-sm font-medium text-gray-700">
                    More Details
                  </label>
                  <p className="text-xs text-gray-500">Enter more details about the job, each on a new line</p>
                  <textarea
                    id="moreDetails"
                    name="moreDetails"
                    value={formData.moreDetails}
                    onChange={handleChange}
                    rows={5}
                    className="form-textarea block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Enter more details about the job, one per line"
                  />
                  <div className={`text-sm mt-1 text-right ${
                    moreDetailsWordCount === WORD_LIMIT ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {moreDetailsWordCount}/{WORD_LIMIT} words
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sender Email Section */}
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
          
          {/* Members Section */}
          <div className="border-t border-gray-200 mt-8 pt-8">
            <h2 className="text-xl font-semibold mb-6">Manage Members</h2>
            
            {/* Add Member Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="memberName" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="memberName"
                  type="text"
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="memberEmail"
                  type="email"
                  className={`form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 ${emailError ? 'border-red-500' : ''}`}
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1 animate-pulse">{emailError}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center mb-6">
              <button
                type="button"
                onClick={handleAddMember}
                className="btn btn-outline-primary hover:scale-105 transition-transform"
              >
                + Add Member
              </button>
              
              {showAddedMessage && (
                <span className="ml-3 text-green-500 text-sm animate-fade-in-out">
                  Member added successfully!
                </span>
              )}
            </div>
            
            {/* Members List */}
            {isLoadingMembers ? (
              <div className="text-center py-4">
                <div className="animate-pulse">Loading members...</div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No members added yet
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
                          <button
                            onClick={() => handleRemoveMember(member.id)}
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
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
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
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
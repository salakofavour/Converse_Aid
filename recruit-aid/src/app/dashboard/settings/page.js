'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export default function Settings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    phone: '',
    timezone: 'America/New_York'
  });
  // const [notificationSettings, setNotificationSettings] = useState({
  //   emailNotifications: true,
  //   newApplications: true,
  //   interviewReminders: true,
  //   jobUpdates: false,
  //   weeklyReports: true
  // });
  const [senderEmails, setSenderEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const processedCodeRef = useRef(null);

  // Load user profile data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        setIsNewProfile(false);
        
        // Get profile data
        const response = await fetchWithCSRF('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }
        const { profile } = await response.json();
        console.log('Loaded profile data:', { 
          hasProfile: !!profile,
          senderEmails: profile?.sender || []
        });
        
        // Set profile data
        setProfileData({
          name: profile.name || '',
          email: profile.email || '',
          company: profile.company || '',
          role: profile.role || '',
          phone: profile.phone || '',
          timezone: profile.timezone || 'America/New_York'
        });

        // Set sender emails from profile data
        if (profile?.sender) {
          console.log('Setting sender emails from profile:', profile.sender);
          setSenderEmails(profile.sender);
        }

        // Get auth data
        const authResponse = await fetchWithCSRF('/api/auth/user');
        if (!authResponse.ok) {
          throw new Error('Failed to fetch auth data');
        }
        const authData = await authResponse.json();
        
        // Update profile email with auth email
        setProfileData(prev => ({
          ...prev,
          email: authData.user.email
        }));
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;
    
    async function handleOAuthCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Early exit if no OAuth parameters or already processing
      if ((!code || !state) && !error) return;
      if (isProcessingOAuth) return;
      
      // Check if we've already processed this code
      if (processedCodeRef.current === code) {
        console.log('Code already processed, skipping...');
        return;
      }

      // Set processing flag immediately
      setIsProcessingOAuth(true);
      console.log(`[${Date.now()}] Starting OAuth callback processing`, { 
        hasCode: !!code, 
        hasState: !!state, 
        error 
      });

      try {
        // Clear the URL parameters first to prevent double processing
        router.replace('/dashboard/settings', { scroll: false });
        
        // Mark this code as processed
        processedCodeRef.current = code;

        // Handle error case
        if (error) {
          console.error('OAuth error received:', error);
          setEmailError('Access was denied. You must grant access to add this email.');
          return;
        }

        // Process OAuth callback
        console.log('Making fetch request to /api/gmail/auth with:', { code, state });
        const response = await fetchWithCSRF('/api/gmail/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state })
        });
        
        console.log('Fetch response received:', { 
          status: response.status, 
          ok: response.ok,
          statusText: response.statusText 
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.log("Error response data:", errorData);
          
          // Handle invalid_grant error specifically
          if (errorData.error === 'invalid_grant') {
            console.log('Invalid grant error - likely already processed');
            return;
          }
          
          throw new Error(errorData.error || 'Failed to process authentication');
        }

        const data = await response.json();
        console.log('Response data received:', data);

        if (data.error) {
          console.log("error in data received", data.error);
          setEmailError(data.error);
        } else if (data.success) {
          console.log('OAuth successful, updating sender emails...');
          
          // Update sender emails from profile data
          if (data.profile?.sender) {
            console.log('Updating sender emails from profile:', data.profile.sender);
            setSenderEmails(data.profile.sender);
          } else {
            console.log('No profile data in response, fetching fresh profile...');
            // Fallback to refreshing profile data
            const profileResponse = await fetchWithCSRF('/api/profile');
            if (profileResponse.ok) {
              const { profile } = await profileResponse.json();
              console.log('Profile data received:', { 
                hasProfile: !!profile,
                senderEmails: profile?.sender || []
              });
              if (profile) {
                console.log('Updating sender emails from fresh profile:', profile.sender);
                setSenderEmails(profile.sender || []);
              }
            } else {
              console.error('Failed to refresh profile data:', await profileResponse.text());
            }
          }

          // Update UI state
          console.log('Clearing form state...');
          setNewEmail('');
          setShowAddEmail(false);
          setEmailError(''); // Clear any previous errors
          
          // Show success message
          console.log('About to show success toast for email:', data.email);
          if (data.email) {
            toast.success(`Email ${data.email} added successfully!`, {
              duration: 5000,
              position: 'top-center'
            });
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log(`[${Date.now()}] Request aborted`);
          return;
        }
        console.error('Error processing OAuth callback:', err);
        if (isMounted) {
          setEmailError('Failed to process authentication. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsProcessingOAuth(false);
          console.log(`[${Date.now()}] OAuth callback processing completed`);
        }
      }
    }
    
    handleOAuthCallback();

    // Cleanup function to abort any pending requests
    return () => {
      console.log(`[${Date.now()}] Starting cleanup...`);
      isMounted = false;
      controller.abort();
      console.log(`[${Date.now()}] Cleanup completed`);
    };
  }, [searchParams.toString()]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // const handleNotificationChange = (e) => {
  //   const { name, checked } = e.target;
  //   setNotificationSettings(prev => ({
  //     ...prev,
  //     [name]: checked
  //   }));
  // };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Check if name is provided (required field)
      if (!profileData.name) {
        setError('Name is a required field.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetchWithCSRF('/api/profile', {
        method: isNewProfile ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          notificationSettings
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save profile');
      }

      const { profile } = await response.json();
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        company: profile.company || '',
        role: profile.role || '',
        phone: profile.phone || '',
        timezone: profile.timezone || 'America/New_York'
      });
      // setNotificationSettings(profile.notification_settings || notificationSettings);
      setIsNewProfile(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleNotificationSubmit = async (e) => {
  //   e.preventDefault();
  //   setIsSubmitting(true);
  //   setError(null);
    
  //   try {
  //     const response = await fetch('/api/profile', {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         ...profileData,
  //         notificationSettings
  //       }),
  //     });

  //     if (!response.ok) {
  //       const data = await response.json();
  //       throw new Error(data.error || 'Failed to save notification settings');
  //     }

  //     toast.success('Notification settings updated successfully');
  //   } catch (err) {
  //     console.error('Error saving notification settings:', err);
  //     setError(err.message || 'Failed to save notification settings. Please try again.');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleAddEmail = async () => {
    if (!newEmail) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (senderEmails.some(email => (typeof email === 'string' ? email : email.email) === newEmail)) {
      setEmailError('This email is already added');
      return;
    }

    try {
      setIsProcessingOAuth(true);
      setEmailError('');
      
      // Start Gmail OAuth flow
      const response = await fetchWithCSRF(`/api/gmail/auth?email=${encodeURIComponent(newEmail)}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start Gmail authentication');
      }

      const { url } = await response.json();
      console.log('Starting Gmail OAuth flow for:', newEmail);
      // Redirect to Gmail OAuth consent screen
      window.location.href = url;
    } catch (err) {
      console.error('Error starting Gmail auth:', err);
      setEmailError(err.message || 'Failed to start Gmail authentication. Please try again.');
    } finally {
      setIsProcessingOAuth(false);
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRemoveEmail = async (emailToRemove) => {
    try {
      const response = await fetchWithCSRF(`/api/profile/sender?email=${encodeURIComponent(emailToRemove)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove email');
      }

      const { profile } = await response.json();
      setSenderEmails(profile.sender || []);
      toast.success('Email removed successfully');
    } catch (err) {
      console.error('Error removing email:', err);
      toast.error(err.message || 'Failed to remove email. Please try again.');
    }
  };

  const handleEmailChange = async () => {
    if (!deleteConfirmEmail) {
      setSecurityError('Please enter your email to confirm');
      return;
    }

    if (deleteConfirmEmail !== profileData.email) {
      setSecurityError('Email does not match');
      return;
    }

    setIsProcessing(true);
    setSecurityError('');

    try {
      const response = await fetchWithCSRF('/api/auth/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: deleteConfirmEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change email');
      }

      toast.success('Email change request sent. Please check your inbox.');
      setShowEmailChangeModal(false);
      setDeleteConfirmEmail('');
    } catch (err) {
      console.error('Error changing email:', err);
      setSecurityError(err.message || 'Failed to change email. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmEmail) {
      setSecurityError('Please enter your email to confirm');
      return;
    }

    if (deleteConfirmEmail !== profileData.email) {
      setSecurityError('Email does not match');
      return;
    }

    setIsProcessing(true);
    setSecurityError('');

    try {
      const response = await fetchWithCSRF('/api/auth/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');
      router.push('/login');
    } catch (err) {
      console.error('Error deleting account:', err);
      setSecurityError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // When showing the add email form, ensure newEmail is initialized
  const handleShowAddEmail = () => {
    setShowAddEmail(true);
    setEmailError('');
    setNewEmail(''); // Ensure it's set to empty string
  };

  // Update the input handler to ensure it's always controlled
  const handleNewEmailChange = (e) => {
    setNewEmail(e.target.value || ''); // Ensure it's never undefined
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-primary-light h-12 w-12 mb-4"></div>
          <div className="text-gray-600">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Settings</h3>
            <p className="mt-1 text-sm text-gray-600">
              Manage your account settings and preferences.
            </p>
          </div>
        </div>

        <div className="mt-5 md:mt-0 md:col-span-2">
          <div className="shadow sm:rounded-md sm:overflow-hidden">
            <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`${
                      activeTab === 'profile'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Profile
                  </button>
                  {/* <button
                    onClick={() => setActiveTab('notifications')}
                    className={`${
                      activeTab === 'notifications'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Notifications
                  </button> */}
                  <button
                    onClick={() => setActiveTab('Preferences')}
                    className={`${
                      activeTab === 'Preferences'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Preferences
                  </button>
                  <button
                    onClick={() => setActiveTab('security')}
                    className={`${
                      activeTab === 'security'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Security
                  </button>
                </nav>
              </div>

              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        required
                        className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={profileData.email}
                        disabled
                        className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        id="company"
                        value={profileData.company}
                        onChange={handleProfileChange}
                        className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <input
                        type="text"
                        name="role"
                        id="role"
                        value={profileData.role}
                        onChange={handleProfileChange}
                        className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        name="timezone"
                        value={profileData.timezone}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Notifications Tab
              {activeTab === 'notifications' && (
                <form onSubmit={handleNotificationSubmit}>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="emailNotifications"
                          name="emailNotifications"
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={handleNotificationChange}
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="emailNotifications" className="font-medium text-gray-700">
                          Email Notifications
                        </label>
                        <p className="text-gray-500">Receive email notifications for important updates</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="newApplications"
                          name="newApplications"
                          type="checkbox"
                          checked={notificationSettings.newApplications}
                          onChange={handleNotificationChange}
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="newApplications" className="font-medium text-gray-700">
                          New Applications
                        </label>
                        <p className="text-gray-500">Get notified when new applications are received</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="interviewReminders"
                          name="interviewReminders"
                          type="checkbox"
                          checked={notificationSettings.interviewReminders}
                          onChange={handleNotificationChange}
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="interviewReminders" className="font-medium text-gray-700">
                          Interview Reminders
                        </label>
                        <p className="text-gray-500">Receive reminders for upcoming interviews</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="jobUpdates"
                          name="jobUpdates"
                          type="checkbox"
                          checked={notificationSettings.jobUpdates}
                          onChange={handleNotificationChange}
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="jobUpdates" className="font-medium text-gray-700">
                          Job Updates
                        </label>
                        <p className="text-gray-500">Get notified about changes to your job postings</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="weeklyReports"
                          name="weeklyReports"
                          type="checkbox"
                          checked={notificationSettings.weeklyReports}
                          onChange={handleNotificationChange}
                          className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="weeklyReports" className="font-medium text-gray-700">
                          Weekly Reports
                        </label>
                        <p className="text-gray-500">Receive weekly summary reports</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )} */}

              {/* Preferences Tab */}
              {activeTab === 'Preferences' && (
                <div className="space-y-6">
                  {/* Subscription Section */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium text-gray-900">Subscription</h3>
                      <button
                        onClick={() => router.push('/dashboard/settings/subscription')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        View Plan
                      </button>
                    </div>
                  </div>

                  {/* Sender Emails Section */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Sender Emails</h4>
                      <button
                        onClick={handleShowAddEmail}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Add Email
                      </button>
                    </div>

                    {showAddEmail && (
                      <div className="mt-4">
                        <div className="flex gap-4">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={handleNewEmailChange}
                            placeholder="Enter email address"
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                          />
                          <button
                            onClick={handleAddEmail}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowAddEmail(false);
                              setEmailError('');
                              setNewEmail('');
                            }}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                        {emailError && (
                          <p className="mt-2 text-sm text-red-600">{emailError}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {senderEmails.map((email) => (
                            <tr key={email.email} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {email.email}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleRemoveEmail(email.email)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Change Email</h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Update your account email address. You will need to verify the new email address.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={() => setShowEmailChangeModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        Change Email
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Delete Account</h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={() => setShowDeleteConfirmModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Change Modal */}
      {showEmailChangeModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Change Email Address
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Please enter your current email address to confirm the change.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700">
                      Current Email
                    </label>
                    <input
                      type="email"
                      id="confirm-email"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter your current email"
                    />
                    {securityError && (
                      <p className="mt-2 text-sm text-red-600">{securityError}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="button"
                    onClick={handleEmailChange}
                    disabled={isProcessing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Change'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailChangeModal(false);
                      setDeleteConfirmEmail('');
                      setSecurityError('');
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Delete Account
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete your account? This action cannot be undone. Please enter your email address to confirm.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="confirm-delete-email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="confirm-delete-email"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      className="mt-1 focus:ring-primary focus:border-primary block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter your email address"
                    />
                    {securityError && (
                      <p className="mt-2 text-sm text-red-600">{securityError}</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isProcessing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                  >
                    {isProcessing ? 'Processing...' : 'Delete Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setDeleteConfirmEmail('');
                      setSecurityError('');
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
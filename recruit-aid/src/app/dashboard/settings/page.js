'use client';

import { changeEmail, deleteAccount } from '@/lib/account';
import { createProfile, getProfile, getUser, updateProfile, updateSenderEmails } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    newApplications: true,
    interviewReminders: true,
    jobUpdates: false,
    weeklyReports: true
  });
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

  // Load user profile data
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      setError(null);
      setIsNewProfile(false);
      
      try {
        // Get the current user to get their email
        const { user: userData } = await getUser();
        const userEmail = userData?.email || '';
        
        const { profile, error } = await getProfile();
        
        if (error && error.code === 'PGRST116') {
          // This is a "not found" error from Supabase, which means the profile doesn't exist yet
          setIsNewProfile(true);
          // Set default values with the email
          setProfileData(prev => ({
            ...prev,
            email: userEmail
          }));
          setSenderEmails([]);
        } else if (error) {
          // This is a real error
          console.error('Error fetching profile:', error);
          setError('Failed to load profile data. Please try again.');
        } else if (profile) {
          // Profile exists, set the data
          setProfileData({
            name: profile.name || '',
            email: userEmail, // Always use the auth email
            company: profile.company || '',
            role: profile.role || '',
            phone: profile.phone || '',
            timezone: profile.timezone || 'America/New_York'
          });
          // Set sender emails if they exist
          setSenderEmails(profile.sender || []);
        } else {
          // No profile yet, but still set the email
          setIsNewProfile(true);
          setProfileData(prev => ({
            ...prev,
            email: userEmail
          }));
          setSenderEmails([]);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadProfile();
  }, []);

// Handle OAuth callback
useEffect(() => {
  const controller = new AbortController();
  
  async function handleOAuthCallback() {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Early exit if no OAuth parameters or already processing
    if ((!code || !state) && !error) return;
    if (isProcessingOAuth) return;

    // Set processing flag immediately
    setIsProcessingOAuth(true);
    console.log(`[${Date.now()}] Starting OAuth callback processing`);

    try {
      // Clear the URL parameters first
      router.replace('/dashboard/settings', { scroll: false });

      // Handle error case
      if (error) {
        setEmailError('Access was denied. You must grant access to add this email.');
        return;
      }

      // Process OAuth callback
      const response = await fetch('/api/gmail/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
        signal: controller.signal
      });
      
      const data = await response.json();
      
      if (data.error) {
        setEmailError(data.error);
      } else if (data.success) {
        // Refresh the profile data
        const { profile } = await getProfile();
        if (profile) {
          setSenderEmails(profile.sender || []);
        }
        setNewEmail('');
        setShowAddEmail(false);
        alert(`Email ${data.email} added successfully!`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`[${Date.now()}] Request aborted`);
        return;
      }
      console.error('Error processing OAuth callback:', err);
      setEmailError('Failed to process authentication. Please try again.');
    } finally {
      setIsProcessingOAuth(false);
      console.log(`[${Date.now()}] OAuth callback processing completed`);
    }
  }
  
  handleOAuthCallback();

  // Cleanup function to abort any pending requests
  return () => {
    controller.abort();
    console.log(`[${Date.now()}] Cleaning up OAuth callback effect`);
  };
}, [searchParams]); 

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

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
      
      // Get the current user to ensure we have the correct email
      const { user: userData } = await getUser();
      const userEmail = userData?.email;
      
      if (!userEmail) {
        setError('Could not retrieve user email. Please try again or contact support.');
        setIsSubmitting(false);
        return;
      }
      
      // Ensure the email in the profile data is the user's auth email
      const profileToSave = {
        ...profileData,
        email: userEmail,
        sender: senderEmails // Include sender emails
      };
      
      // Try to get the profile first to determine if we need to create or update
      const { profile: existingProfile } = await getProfile();
      
      let result;
      if (existingProfile) {
        // Update existing profile
        result = await updateProfile(profileToSave);
      } else {
        // Create new profile
        result = await createProfile(profileToSave);
      }
      
      if (result.error) {
        console.error('Error saving profile:', result.error);
        setError('Failed to save profile. Please try again.');
      } else {
        alert('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotificationSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call to Supabase
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Notification settings updated successfully!');
    }, 1000);
  };

  const handleAddEmail = () => {
    setShowAddEmail(true);
    setEmailError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSaveEmail = async () => {
    // Validate email
    if (!validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check if email already exists in the list
    const emailExists = senderEmails.some(item => 
      typeof item === 'string' ? item === newEmail : item.email === newEmail
    );
    
    if (emailExists) {
      setEmailError('This email is already in your list');
      return;
    }

    setIsSubmitting(true);
    setEmailError('');

    try {
      // Start the Gmail OAuth flow
      const response = await fetch(`/api/gmail/auth?email=${encodeURIComponent(newEmail)}`);
      const data = await response.json();
      
      if (data.error) {
        setEmailError(data.error);
      } else if (data.url) {
        // Redirect to the Google OAuth consent screen
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error starting OAuth flow:', err);
      setEmailError('Failed to start authentication process. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove) => {
    setIsSubmitting(true);
    
    try {
      // Get the email string or object
      const emailValue = typeof emailToRemove === 'string' ? emailToRemove : emailToRemove.email;
      
      // Remove the email from the list
      const updatedEmails = senderEmails.filter(item => {
        const itemEmail = typeof item === 'string' ? item : item.email;
        return itemEmail !== emailValue;
      });
      
      // Save to Supabase
      const result = await updateSenderEmails(updatedEmails);
      
      if (result.error) {
        console.error('Error removing email:', result.error);
        setError('Failed to remove email. Please try again.');
      } else {
        // Update local state
        setSenderEmails(updatedEmails);
        alert('Email removed successfully!');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = async () => {
    setIsProcessing(true);
    setSecurityError('');

    try {
      const result = await changeEmail(profileData.email);
      
      if (result.success) {
        setShowEmailChangeModal(false);
        alert(result.message);
        router.push('/auth/signout');
      } else {
        setSecurityError(result.error || 'Failed to change email');
      }
    } catch (err) {
      console.error('Error changing email:', err);
      setSecurityError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsProcessing(true);
    setSecurityError('');

    try {
      if (deleteConfirmEmail !== profileData.email) {
        setSecurityError('Email confirmation does not match your account email.');
        return;
      }

      const result = await deleteAccount();
      
      if (result.success) {
        setShowDeleteConfirmModal(false);
        alert(result.message);
        router.push('/auth/signout');
      } else {
        setSecurityError(result.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      setSecurityError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow-custom">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('notifications')}
            >
              Preference
            </button>
            <button
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'security'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}
                  
                  {isNewProfile && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                      <p className="font-medium">Welcome to your profile settings!</p>
                      <p>Please fill in your information below and click "Save Changes" to create your profile.</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        className="form-control"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        className="form-control bg-gray-100"
                        value={profileData.email}
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email is automatically set from your account and cannot be changed.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="company" className="block text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        className="form-control"
                        value={profileData.company}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div>
                      <label htmlFor="role" className="block text-gray-700 mb-2">
                        Job Title
                      </label>
                      <input
                        id="role"
                        name="role"
                        type="text"
                        className="form-control"
                        value={profileData.role}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        className="form-control"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div>
                      <label htmlFor="timezone" className="block text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        name="timezone"
                        className="form-select"
                        value={profileData.timezone}
                        onChange={handleProfileChange}
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                        <option value="Europe/Paris">Central European Time (CET)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary"
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
              )}
            </>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Email Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Email</h3>
                  <p className="text-sm text-gray-500 mb-4">Manage your sender email addresses</p>
                  
                  {isProcessingOAuth && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
                      <p className="font-medium">Processing authentication...</p>
                      <p>Please wait while we complete the Gmail authentication process.</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {/* List of emails */}
                    {senderEmails.length > 0 ? (
                      <div className="space-y-2">
                        {senderEmails.map((item, index) => {
                          const email = typeof item === 'string' ? item : item.email;
                          const hasAuth = typeof item !== 'string' && item.refresh_token;
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center">
                                <span>{email}</span>
                                {hasAuth && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                    Gmail Connected
                                  </span>
                                )}
                              </div>
                              <button 
                                type="button" 
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleRemoveEmail(item)}
                                disabled={isSubmitting}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No sender emails added yet.</p>
                    )}
                    
                    {/* Add email form */}
                    {showAddEmail ? (
                      <div className="mt-4 space-y-3">
                        <div>
                          <input
                            type="email"
                            className="form-control"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter email address"
                          />
                          {emailError && (
                            <p className="text-red-500 text-sm mt-1">{emailError}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            You will need to grant Gmail access to add this email as a sender.
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveEmail}
                            disabled={isSubmitting || isProcessingOAuth}
                          >
                            {isSubmitting ? 'Processing...' : 'Connect with Gmail'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => {
                              setShowAddEmail(false);
                              setNewEmail('');
                              setEmailError('');
                            }}
                            disabled={isSubmitting || isProcessingOAuth}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleAddEmail}
                        disabled={isProcessingOAuth}
                      >
                        + Add Email
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Account Section */}
              <div className="space-y-4 mt-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Account</h3>
                  <p className="text-sm text-gray-500 mb-4">Manage your account settings and subscription</p>
                  
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => router.push('/dashboard/settings/subscription')}
                  >
                    View Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Security</h3>
                <p className="text-gray-600 mb-4">
                  Your account uses magic link authentication. We send a secure link to your email when you want to sign in.
                </p>
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setShowEmailChangeModal(true)}
                >
                  Change Email Address
                </button>

                {showEmailChangeModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                      <h4 className="text-lg font-medium mb-4">Change Email Address</h4>
                      <p className="text-gray-600 mb-4">
                        Enter your new email address. You'll need to verify it before the change takes effect.
                      </p>
                      <input
                        type="email"
                        className="form-control mb-4"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="New email address"
                      />
                      {securityError && (
                        <p className="text-red-500 text-sm mb-4">{securityError}</p>
                      )}
                      <div className="flex justify-end space-x-3">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setShowEmailChangeModal(false);
                            setNewEmail('');
                            setSecurityError('');
                          }}
                          disabled={isProcessing}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={handleEmailChange}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Change Email'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <hr className="border-gray-200" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Account</h3>
                <p className="text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button 
                  className="btn btn-danger"
                  onClick={() => setShowDeleteConfirmModal(true)}
                >
                  Delete Account
                </button>

                {showDeleteConfirmModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                      <h4 className="text-lg font-medium mb-4">Delete Account</h4>
                      <p className="text-gray-600 mb-4">
                        This action cannot be undone. All your data will be permanently deleted.
                        To confirm, please enter your email address: <strong>{profileData.email}</strong>
                      </p>
                      <input
                        type="email"
                        className="form-control mb-4"
                        value={deleteConfirmEmail}
                        onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                        placeholder="Confirm your email"
                      />
                      {securityError && (
                        <p className="text-red-500 text-sm mb-4">{securityError}</p>
                      )}
                      <div className="flex justify-end space-x-3">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            setShowDeleteConfirmModal(false);
                            setDeleteConfirmEmail('');
                            setSecurityError('');
                          }}
                          disabled={isProcessing}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={handleDeleteAccount}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processing...' : 'Permanently Delete Account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
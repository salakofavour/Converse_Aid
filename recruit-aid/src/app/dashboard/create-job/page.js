'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CreateJob() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for applicant information
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  
  // Load applicants from localStorage if available
  useEffect(() => {
    const storedApplicants = localStorage.getItem('applicants');
    if (storedApplicants) {
      try {
        const parsedApplicants = JSON.parse(storedApplicants);
        setApplicants(parsedApplicants);
      } catch (error) {
        console.error('Error parsing applicants from localStorage:', error);
      }
    }
  }, []);
  
  // Update localStorage whenever applicants change
  useEffect(() => {
    localStorage.setItem('applicants', JSON.stringify(applicants));
  }, [applicants]);
  
  // Function to validate email format
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };
  
  // Handle adding an applicant
  const handleAddApplicant = () => {
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
    
    // Add to applicants list
    setApplicants([...applicants, { name: applicantName, email: applicantEmail }]);
    
    // Show success message briefly
    setShowAddedMessage(true);
    setTimeout(() => {
      setShowAddedMessage(false);
    }, 2000);
    
    // Clear input fields
    setApplicantName('');
    setApplicantEmail('');
  };
  
  // Handle removing an applicant
  const handleRemoveApplicant = (index) => {
    const newApplicants = [...applicants];
    newApplicants.splice(index, 1);
    setApplicants(newApplicants);
  };
  
  // Handle proceeding to template
  const handleProceed = () => {
    router.push('/dashboard/create-job/template');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Create New Job</h1>
        <Link href="/dashboard" className="btn btn-outline-primary transition-all hover:shadow-md">
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-custom p-6 transition-all hover:shadow-lg">
        <div className="space-y-6">
          {/* Applicants Information Section */}
          <div className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-4">Applicants Information:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="applicantName" className="block text-gray-700 mb-2">
                  Name
                </label>
                <input
                  id="applicantName"
                  type="text"
                  className="form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                />
              </div>
              <div className="transition-all duration-300 ease-in-out">
                <label htmlFor="applicantEmail" className="block text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="applicantEmail"
                  type="email"
                  className={`form-control focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all ${emailError ? 'border-red-500' : ''}`}
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1 animate-pulse">{emailError}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <button
                type="button"
                onClick={handleAddApplicant}
                className="btn btn-outline-primary hover:scale-105 transition-transform"
                aria-label="Add applicant"
              >
                + Add
              </button>
              
              {showAddedMessage && (
                <span className="ml-3 text-green-500 text-sm animate-fade-in-out">
                  Applicant added successfully!
                </span>
              )}
            </div>
            
            {/* Display added applicants */}
            {applicants.length > 0 && (
              <div className="mt-4">
                <h3 className="text-md font-medium mb-2">Added Applicants:</h3>
                <ul className="space-y-2">
                  {applicants.map((applicant, index) => (
                    <li 
                      key={index} 
                      className="flex items-center justify-between bg-gray-50 p-3 rounded animate-fade-in hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <span className="font-medium">{applicant.name}</span>
                        <span className="text-gray-500 ml-2">({applicant.email})</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveApplicant(index)}
                        className="text-red-500 hover:text-red-700 transition-colors hover:scale-110 transform"
                        aria-label="Remove applicant"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Proceed Button */}
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={handleProceed}
              className="btn btn-primary btn-lg transition-all hover:scale-105 hover:shadow-md px-8 py-3 text-lg"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
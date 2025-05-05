'use client';

import { createJob } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { toast } from 'sonner';

export default function JobSummary() {
  const router = useRouter();
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    // Get form data from localStorage
    const savedData = localStorage.getItem('jobFormData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(parsedData);
      
      // If there's a file in sessionStorage, retrieve it
      if (parsedData.file_uploaded) {
        const fileData = sessionStorage.getItem('selectedFile');
        if (fileData) {
          if (fileData.startsWith('data:')) {
            // DataURL: use utility to extract content
            setSelectedFile({ dataUrl: fileData, fileName: parsedData.fileName });
          } else {
            // Plain text: just use the string
            setSelectedFile({ text: fileData, fileName: parsedData.fileName });
          }
        }
      }
    }
  }, []);

  const handleSubmit = async () => {
    if (!formData) {console.log('no form data'); return;}

    console.log('formData', formData);
    
    setIsSubmitting(true);
    console.log('submitting usestate');
    try {
      let jobData = {
        title: formData.title,
        job_start_date: formData.jobStartDate,
        job_end_date: formData.jobEndDate,
        Job_email: formData.senderEmail,
        file_uploaded: formData.file_uploaded,
        original_filename: formData.fileName || null,
        about: formData.about,
        more_details: formData.moreDetails,
        file_content: ''
      };

      // If using file, extract content
      if (formData.file_uploaded && selectedFile) {
        let content, error;
        if (selectedFile.dataUrl) {
          // Use the utility for DataURL
          ({ content, error } = await dataURLToFileContent(selectedFile.dataUrl, selectedFile.fileName));
        } else if (selectedFile.text) {
          // Use the plain text directly
          content = selectedFile.text;
          error = null;
        }
        if (error) {
          toast.error('Failed to process file: ' + error);
          setIsSubmitting(false);
          return;
        }
        jobData.file_content = content;
      }else {
        // Using text areas
        jobData.about = formData.about;
        jobData.more_details = formData.moreDetails;
      }
      console.log('initiating createJob with');
      const { job, error } = await createJob(jobData);
      console.log('job created');
      

      if (error) {
        throw error;
      }

      // Clear storage
      localStorage.removeItem('jobFormData');
      sessionStorage.removeItem('selectedFile');

      // Redirect to jobs page
      router.push('/dashboard/view-jobs');
      toast.success('Job created successfully!');
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!formData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Review Job Details</h1>
      <div className="bg-white rounded-lg shadow-custom p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Job Title</h3>
              <p>{formData.title}</p>
            </div>
            <div>
              <h3 className="font-semibold">Sender Email</h3>
              <p>{formData.senderEmail}</p>
            </div>
            <div>
              <h3 className="font-semibold">Start Date</h3>
              <p>{new Date(formData.jobStartDate).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-semibold">End Date</h3>
              <p>{new Date(formData.jobEndDate).toLocaleDateString()}</p>
            </div>
          </div>

          {formData.file_uploaded ? (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Knowledge Base Source</h3>
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <FaFileAlt className="w-6 h-6 text-primary" />
                <span>{formData.fileName}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="border-t pt-4">
                <h3 className="font-semibold">About Job</h3>
                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg mt-2">
                  {formData.about}
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold">More Details</h3>
                <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg mt-2">
                  {formData.moreDetails}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-outline-primary"
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : (
                'Save Job'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
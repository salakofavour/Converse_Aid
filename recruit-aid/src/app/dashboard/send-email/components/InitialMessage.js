'use client';

import { createClient, getJobs, updateJob } from '@/lib/supabase';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function InitialMessage() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [subject, setSubject] = useState('');
  const [defaultMessage, setDefaultMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const { jobs: jobsData, error } = await getJobs();
      console.log('Jobs data received:', jobsData);
      
      if (error) throw new Error(error.message);
      
      setJobs(jobsData || []);
    } catch (err) {
      console.error('Error loading jobs:', err);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleJobChange = async (job) => {
    setSelectedJob(job);
    if (!job) {
      setSubject('');
      setDefaultMessage('');
      return;
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('subject, default_message')
      .eq('id', job.id)
      .single();

    if (error) {
      console.error('Error fetching job details:', error);
      return;
    }

    setSubject(data.subject || '');
    setDefaultMessage(data.default_message || '');
  };

  const handleSave = async () => {
    if (!selectedJob || !subject.trim() || !defaultMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    const { error } = await updateJob(selectedJob.id, {
      subject,
      default_message: defaultMessage
    });

    setIsLoading(false);

    if (error) {
      toast.error('Failed to save message');
      console.error('Error saving message:', error);
      return;
    }

    toast.success('Message saved');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl text-center font-semibold mb-4">Set Initial Message</h2>
      <div className="space-y-4">
        {/* Job Selection */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Select Job</label>
          <Listbox value={selectedJob} onChange={handleJobChange} disabled={isLoadingJobs || isLoading}>
            <div className="relative mt-1">
              <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border ${
                isLoadingJobs || isLoading ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
              } focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50`}>
                <span className={`block truncate ${selectedJob ? 'text-black' : 'text-[#1a1a1a]'}`}>
                  {isLoadingJobs ? 'Loading jobs...' : (selectedJob?.title || 'Select a job')}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {jobs.map((job) => (
                  <Listbox.Option
                    key={job.id}
                    value={job}
                    className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                    }`}
                  >
                    {({ selected }) => (
                      <>
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {job.title}
                        </span>
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!selectedJob || isLoading}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter email subject"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message
          </label>
          <textarea
            id="message"
            value={defaultMessage}
            onChange={(e) => setDefaultMessage(e.target.value)}
            disabled={!selectedJob || isLoading}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter default message"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading || !selectedJob || !subject.trim() || !defaultMessage.trim()}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
} 
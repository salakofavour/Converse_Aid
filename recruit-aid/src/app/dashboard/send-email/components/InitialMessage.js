'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const WORD_LIMIT = 350;

export default function InitialMessage() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [wordCount, setWordCount] = useState(0);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[200px] p-4',
      },
    },
    content: '',
    editable: true,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
      
      // If word limit exceeded, prevent further typing
      if (words.length > WORD_LIMIT) {
        const truncatedText = words.slice(0, WORD_LIMIT).join(' ');
        editor.commands.setContent(truncatedText);
        toast.error(`Word limit of ${WORD_LIMIT} words reached`);
      }
    },
  });

  // Update editor editable state when isLoadingMessage changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isLoadingMessage);
    }
  }, [isLoadingMessage, editor]);

  // Load jobs on mount
  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoadingJobs(true);
      const response = await fetchWithCSRF('/api/jobs');
      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }
      const { jobs: jobsData } = await response.json();
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
      editor?.commands.setContent('');
      return;
    }

    try {
      setIsLoadingMessage(true);
      toast.loading('Loading default message and subject...');
      const response = await fetchWithCSRF(`/api/jobs/${job.id}/message`);
      if (!response.ok) {
        throw new Error('Failed to fetch default message or subject');
      }
      const data = await response.json();
      
      // Set subject first, then message content
      if (data.subject) {
        setSubject(data.subject);
      }
      if (data.message) {
        editor?.commands.setContent(data.message);
      }
      
      toast.dismiss();
      if (data.message || data.subject) {
        toast.success('Message loaded successfully');
      }
    } catch (err) {
      console.error('Error fetching message:', err);
      toast.error('Failed to load message');
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const handleSave = async () => {
    if (!selectedJob || !subject.trim() || !editor?.getHTML()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetchWithCSRF(`/api/jobs/${selectedJob.id}/message`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: editor.getHTML(),
          subject: subject
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      toast.success('Message saved successfully');
    } catch (err) {
      console.error('Error saving message:', err);
      toast.error('Failed to save message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Initial Message</h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={isLoading || isLoadingMessage || !selectedJob || !subject.trim() || !editor?.getHTML()}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving Message...
            </div>
          ) : (
            'Save Message'
          )}
        </button>
      </div>

      {/* Job Selection */}
      <div>
        <label htmlFor="job" className="block text-sm font-medium text-gray-700">
          Select Job
        </label>
        <Listbox value={selectedJob} onChange={handleJobChange} disabled={isLoadingJobs || isLoading || isLoadingMessage}>
          <div className="relative mt-1">
            <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border ${
              isLoadingJobs || isLoading || isLoadingMessage ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
            } focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:text-sm`}>
              <span className="block truncate">
                {isLoadingJobs ? 'Loading jobs...' : 
                 isLoadingMessage ? 'Loading message...' :
                 selectedJob ? selectedJob.title : 'Select a job'}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {jobs.map((job) => (
                <Listbox.Option
                  key={job.id}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-primary text-white' : 'text-gray-900'
                    }`
                  }
                  value={job}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {job.title}
                      </span>
                      {selected ? (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? 'text-white' : 'text-primary'
                          }`}
                        >
                          ✓
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>

      {/* Subject Field */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
          Subject
        </label>
        <input
          type="text"
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
          placeholder={isLoadingMessage ? "Loading subject..." : "Enter email subject"}
          disabled={!selectedJob || isLoading || isLoadingMessage}
        />
      </div>

      {/* Message Editor */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Message
          </label>
          <span className={`text-sm ${wordCount > WORD_LIMIT ? 'text-red-500' : 'text-gray-500'}`}>
            {wordCount}/{WORD_LIMIT} words
          </span>
        </div>
        <div className="border rounded-lg">
          <EditorContent editor={editor} className={isLoadingMessage ? "opacity-50" : ""} />
        </div>
      </div>
    </div>
  );
} 
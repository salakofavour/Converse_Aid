'use client';

import { fetchWithCSRF } from '@/lib/fetchWithCSRF';
import { getFullMemberInformation } from '@/lib/supabase';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
const WORD_LIMIT = 350;

export default function ContinueThread() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [subject, setSubject] = useState('');
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);

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

  // Enable/disable editor based on job selection
  useEffect(() => {
    if (editor) {
      editor.setEditable(!!selectedJob && !isSending);
    }
  }, [editor, selectedJob, isSending]);

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

  // Load members when job is selected
  useEffect(() => {
    async function loadMembers() {
      if (!selectedJob) {
        setMembers([]);
        setSelectedMembers([]);
        return;
      }

      try {
        setIsLoadingMembers(true);
        setError(null);
        const response = await fetchWithCSRF(`/api/members?jobId=${selectedJob.id}`);
        if (!response.ok) {
          throw new Error('Failed to load members');
        }
        const { members: membersData } = await response.json();
        setMembers(membersData || []);
        setSelectedMembers([]);
      } catch (err) {
        console.error('Error loading members:', err);
        setError('Failed to load members. Please try again.');
      } finally {
        setIsLoadingMembers(false);
      }
    }
    
    loadMembers();
  }, [selectedJob]);

  // Handle selecting all members
  const handleSelectAllMembers = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members);
    }
  };

  // Check if access token needs refresh
  const checkAndRefreshToken = async (email, refresh_token) => {
    try {
      const response = await fetchWithCSRF('/api/gmail/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, refresh_token })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      return data.access_token;
    } catch (error) {
      throw new Error('Failed to refresh access token');
    }
  };

  // Handle sending email
  const handleSend = async () => {
    try {
      if (!selectedJob || !selectedMembers.length || !editor?.getHTML()) {
        setError('Please fill in all required fields');
        return;
      }

      if (selectedMembers.length > 25) {
        setError('Cannot send to more than 25 recipients at once');
        return;
      }

      // Validate thread information exists
      //get the full member information for each member
      const fullMemberInfo = await Promise.all(selectedMembers.map(member => getFullMemberInformation(member.id)));


      const missingThreadInfo = fullMemberInfo.filter(member => !member.overall_message_id);
      // console.log("viewing selected members", fullMemberInfo); 
      if (missingThreadInfo.length > 0) {
        setError(`There is no thread to continue for: ${missingThreadInfo.map(a => a.name_email.name).join(', ')}`);
        return;
      }

      setIsSending(true);
      setError(null);
      setSuccessMessage('');

      // Get sender credentials from profiles
      const response = await fetchWithCSRF('/api/supabase/get-sender-creds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedJob.Job_email })
      });

      const { sender, error: credsError } = await response.json();
      if (credsError) throw new Error(credsError);

      // Get fresh access token
      const access_token = await checkAndRefreshToken(
        selectedJob.Job_email,
        sender.refresh_token
      );
      // console.log("access token has been refreshed and sender credential gotten")

      // Send email
      const sendResponse = await fetchWithCSRF('/api/gmail/send/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: selectedJob.Job_email,
          to: fullMemberInfo.map(member => ({
            id: member.id,
            name: member.name_email.name,
            email: member.name_email.email,
            overall_message_id: member.overall_message_id,
            threadId: member.thread_id,
            messageId: member.message_id,
            referenceId: member.reference_id,
            subject: member.subject
          })),
          content: editor.getHTML(),
          access_token
        })
      });

      const sendResult = await sendResponse.json();
      
      if (!sendResponse.ok) {
        throw new Error(sendResult.error || 'Failed to send email');
      }

      // Update message IDs and fetch headers for successful sends
      if (sendResult.successfulRecipients?.length > 0) {
        // Fetch headers for each successful recipient
        const headerPromises = sendResult.successfulRecipients.map(async (recipient) => {
          try {
            const headerResponse = await fetchWithCSRF(`/api/gmail/headers?gmailId=${recipient.gmailId}`);
            const headerData = await headerResponse.json();
            return {
              id: recipient.id,
              gmailId: recipient.gmailId,
              messageId: headerData.messageId,
              threadId: headerData.threadId,
              references: headerData.references,
              subject: headerData.subject
            };
          } catch (error) {
            console.error("Error fetching headers for recipient:", recipient.email, error);
            return null;
          }
        });

        const headerResults = await Promise.all(headerPromises);
        const validHeaderResults = headerResults.filter(result => result !== null);

        if (validHeaderResults.length > 0) {
          // Update message IDs in the database
          const updateResponse = await fetchWithCSRF('/api/members/message-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updates: validHeaderResults
            })
          });

          //always console the response just for debugging for now, it contains the success & failures
          // console.log("Result from update message IDs", updateResponse);
        }
      }

      setSuccessMessage('Email sent successfully!');
      editor.commands.setContent('');
      setSelectedMembers([]);
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Selection */}
      <div>
        <label htmlFor="job" className="block text-sm font-medium text-gray-700">
          Select Job
        </label>
        <Listbox value={selectedJob} onChange={setSelectedJob}>
          <div className="relative mt-1">
            <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:text-sm">
              <span className="block truncate">
                {selectedJob ? selectedJob.title : 'Select a job'}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {isLoadingJobs ? (
                <div className="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900">
                  Loading jobs...
                </div>
              ) : jobs.length === 0 ? (
                <div className="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900">
                  No jobs found
                </div>
              ) : (
                jobs.map((job) => (
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
                ))
              )}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>

      {/* Member Selection */}
      {selectedJob && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Recipients
            </label>
            <button
              type="button"
              onClick={handleSelectAllMembers}
              className="text-sm text-primary hover:text-primary-dark"
            >
              {selectedMembers.length === members.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
          <Listbox value={selectedMembers} onChange={setSelectedMembers} multiple>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary sm:text-sm">
                <span className="block truncate">
                  {selectedMembers.length === 0
                    ? 'Select recipients'
                    : `${selectedMembers.length} selected`}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {isLoadingMembers ? (
                  <div className="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900">
                    Loading members...
                  </div>
                ) : members.length === 0 ? (
                  <div className="relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900">
                    No members found
                  </div>
                ) : (
                  members.map((member) => (
                    <Listbox.Option
                      key={member.id}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-primary text-white' : 'text-gray-900'
                        }`
                      }
                      value={member}
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {member.name_email.name} ({member.name_email.email})
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
                  ))
                )}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
      )}

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
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                {successMessage}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Send Button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !selectedJob || !selectedMembers.length || !editor?.getHTML()}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending Reply...
            </div>
          ) : (
            'Send Reply'
          )}
        </button>
      </div>
    </div>
  );
} 
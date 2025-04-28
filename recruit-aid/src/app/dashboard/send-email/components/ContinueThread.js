'use client';

import { getJobs, getMembers } from '@/lib/supabase';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/outline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';

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
    onUpdate: ({ editor }) => {
      console.log(editor.getHTML());
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
    async function loadJobs() {
      try {
        setIsLoadingJobs(true);
        setError(null);
        const { jobs: jobsData, error: jobsError } = await getJobs();
        
        if (jobsError) throw new Error(jobsError.message);
        
        setJobs(jobsData || []);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setError('Failed to load jobs. Please try again.');
      } finally {
        setIsLoadingJobs(false);
      }
    }
    
    loadJobs();
  }, []);

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
        const { members: membersData, error: membersError } = await getMembers(selectedJob.id);
        
        if (membersError) throw new Error(membersError.message);
        
        const formattedMembers = membersData?.map(member => ({
          id: member.id,
          name: member.name_email.name,
          email: member.name_email.email,
          threadId: member.thread_id,
          messageId: member.message_id,
          referenceId: member.reference_id,
          overall_message_id: member.overall_message_id,
          subject: member.subject
        })) || [];
        
        setMembers(formattedMembers);
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
      const response = await fetch('/api/gmail/refresh-token', {
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
      const missingThreadInfo = selectedMembers.filter(member => !member.overall_message_id);
      if (missingThreadInfo.length > 0) {
        setError(`There is no thread to continue for: ${missingThreadInfo.map(a => a.name).join(', ')}`);
        return;
      }

      setIsSending(true);
      setError(null);
      setSuccessMessage('');

      // Get sender credentials from profiles
      const response = await fetch('/api/supabase/get-sender-creds', {
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

      // Send email
      const sendResponse = await fetch('/api/gmail/send/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: selectedJob.Job_email,
          to: selectedMembers.map(member => ({
            ...member,
            threadId: member.threadId,
            messageId: member.messageId,
            referenceId: member.referenceId,
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
            const headerResponse = await fetch(`/api/gmail/headers?gmailId=${recipient.gmailId}`);
            const headerData = await headerResponse.json();
            console.log("headerData for recipient", recipient.email, headerData);
            return {
              id: recipient.id,
              gmailId: recipient.gmailId,
              messageId: headerData.messageId,
              threadId: headerData.threadId,
              references: headerData.references
            };
          } catch (error) {
            console.error(`Failed to fetch headers for recipient ${recipient.email}:`, error);
            // If headers fetch fails, still update with the gmailId we got from send
            return {
              id: recipient.id,
              gmailId: recipient.gmailId,
              messageId: null,
              threadId: null,
              references: null
            };
          }
        });

        const headersResults = await Promise.all(headerPromises);

        // Single update with all information
        await fetch('/api/supabase/update-message-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            members: headersResults
          })
        });
      }
      
      if (sendResult.failedRecipients?.length) {
        setSuccessMessage(`Email sent successfully but failed for: ${sendResult.failedRecipients.map(r => r.email).join(', ')}`);
      } else {
        setSuccessMessage('Email sent successfully!');
      }

      // Reset form
      setSelectedJob(null);
      setSelectedMembers([]);
      editor.commands.setContent('');

    } catch (err) {
      console.error('Error sending email:', err);
      setError(err.message || 'Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const isFormValid = selectedJob && selectedMembers.length > 0 && editor?.getHTML();

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Job Selection */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Jobs</label>
          <Listbox value={selectedJob} onChange={setSelectedJob} disabled={isLoadingJobs || isSending}>
            <div className="relative mt-1">
              <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border ${
                isLoadingJobs || isSending ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
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

        {/* Member Selection */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">To:</label>
          <div className={`relative ${!selectedJob || isSending ? 'opacity-60' : ''}`}>
            <Listbox
              value={selectedMembers}
              onChange={setSelectedMembers}
              multiple
              disabled={!selectedJob || isLoadingMembers || isSending}
            >
              <div className="relative mt-1">
                <Listbox.Button className={`relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left border ${
                  !selectedJob || isLoadingMembers || isSending ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
                } focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-50`}>
                  <span className={`block truncate ${selectedMembers.length > 0 ? 'text-black' : 'text-[#1a1a1a]'}`}>
                    {isLoadingMembers ? 'Loading members...' : 
                      selectedMembers.length === 0 ? 'Select members' :
                      `${selectedMembers.length} member(s) selected`}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>

                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {/* Select All Option */}
                  <div
                    className="relative cursor-pointer select-none py-2 pl-10 pr-4 hover:bg-primary-50 text-gray-900 border-b border-gray-100"
                    onClick={handleSelectAllMembers}
                  >
                    <span className="block truncate font-medium">
                      {selectedMembers.length === members.length ? 'Deselect All' : 'Select All Members'}
                    </span>
                  </div>

                  {members.map((member) => (
                    <Listbox.Option
                      key={member.id}
                      value={member}
                      className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-primary-50 text-primary-900' : 'text-gray-900'
                      }`}
                    >
                      {({ selected }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {member.name}
                          </span>
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>

            {/* Selected Members Tags */}
            {selectedMembers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    {member.name}
                    <button
                      type="button"
                      onClick={() => setSelectedMembers(selectedMembers.filter(a => a.id !== member.id))}
                      className="ml-1 inline-flex items-center p-0.5 rounded-full text-primary-400 hover:bg-primary-200 hover:text-primary-500 focus:outline-none"
                      disabled={isSending}
                    >
                      <span className="sr-only">Remove</span>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <div className={`relative ${!selectedJob || isSending ? 'opacity-60' : ''}`}>
            <div className={`mt-1 block w-full rounded-md border ${
              !selectedJob || isSending 
                ? 'bg-gray-50 cursor-not-allowed border-gray-200 border-dashed' 
                : 'bg-white border-gray-300 hover:border-gray-400'
            } shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary`}>
              <EditorContent 
                editor={editor} 
                className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[200px] p-4 text-black [&_p.is-editor-empty:first-child::before]:text-[#1a1a1a]"
              />
            </div>
          </div>
        </div>

        {/* Send Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!isFormValid || isLoadingMembers || isSending}
            className={`px-4 py-2 rounded-md ${
              isFormValid && !isLoadingMembers && !isSending
                ? 'bg-primary text-white hover:bg-primary-600 hover:scale-105 transform transition-all'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {(isLoadingMembers || isSending) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>{isLoadingMembers ? 'Loading members...' : 'Sending email...'}</span>
          </div>
        </div>
      )}
    </div>
  );
} 
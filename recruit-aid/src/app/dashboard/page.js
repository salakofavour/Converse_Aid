'use client';

import { getJobs, getProfile, getUser, initializeUserProfile } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    activeJobs: 0,
    closedJobs: 0,
    totalJobs: 0,
    recentActivity: []
  });

  // Load user data and stats
  useEffect(() => {
    async function loadData() {
      // Get user data from Supabase
      const { user: userData, error } = await getUser();
      if (userData) {
        setUser(userData);
        
        // Get profile data
        const { profile: profileData } = await getProfile();
        setProfile(profileData);
        
        // Initialize user profile if it doesn't exist
        await initializeUserProfile();
      }
      
      // Fetch job data from Supabase
      const { jobs, error: jobsError } = await getJobs();
      
      if (jobs) {
        const currentDate = new Date();
        
        // Calculate job counts based on end date only
        const activeJobsCount = jobs.filter(job => {
          const endDate = new Date(job.flow_end_date);
          return currentDate <= endDate;
        }).length;
        
        const closedJobsCount = jobs.filter(job => {
          const endDate = new Date(job.flow_end_date);
          return currentDate > endDate;
        }).length;
        
        // Set the stats with actual data
        setStats({
          activeJobs: activeJobsCount,
          closedJobs: closedJobsCount,
          totalJobs: jobs.length,
          recentActivity: [
            { id: 1, type: 'application', job: 'Frontend Developer', candidate: 'John Doe', date: '2 hours ago' },
            { id: 2, type: 'interview', job: 'UX Designer', candidate: 'Jane Smith', date: '1 day ago' },
            { id: 3, type: 'job_created', job: 'Product Manager', date: '2 days ago' }
          ]
        });
      } else if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        // Set default values in case of error
        setStats({
          activeJobs: 0,
          closedJobs: 0,
          totalJobs: 0,
          recentActivity: []
        });
      }
    }
    
    loadData();
  }, []);

  // Get user's name from profile first, then metadata, then email
  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'there';

  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <div>
        <h2 className="text-xl font-medium text-gray-700">
          Hi {userName},
        </h2>
      </div>

      {/* Job Stats Section - 30% of screen height */}
      <div className="h-[30vh] grid grid-cols-3 gap-4">
        {/* View Jobs Box */}
        <Link 
          href="/dashboard/view-jobs" 
          className="bg-white rounded-lg shadow-custom flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group"
          title="View Jobs"
        >
          <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-gray-600 group-hover:text-primary transition-colors">View Jobs</span>
        </Link>

        {/* Active Jobs Box */}
        <div className="bg-white rounded-lg shadow-custom p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-500 text-sm font-medium mb-3">Active Jobs</h3>
          <div className="text-3xl font-bold text-gray-900">{stats.activeJobs}</div>
        </div>

        {/* Total Jobs Box */}
        <div className="bg-white rounded-lg shadow-custom p-6 flex flex-col items-center justify-center">
          <h3 className="text-gray-500 text-sm font-medium mb-3">Total Jobs</h3>
          <div className="text-3xl font-bold text-gray-900">{stats.totalJobs}</div>
        </div>
      </div>

      {/* Divider Line */}
      <div className="border-t border-gray-200 my-6"></div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-custom p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {stats.recentActivity.map((activity) => (
            <div key={activity.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center mr-3">
                  {activity.type === 'application' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {activity.type === 'interview' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {activity.type === 'job_created' && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-gray-800 font-medium">
                    {activity.type === 'application' && `New application for ${activity.job}`}
                    {activity.type === 'interview' && `Interview scheduled for ${activity.job}`}
                    {activity.type === 'job_created' && `New job created: ${activity.job}`}
                  </p>
                  {activity.candidate && (
                    <p className="text-gray-600 text-sm">Candidate: {activity.candidate}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">{activity.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
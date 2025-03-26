// Browser client
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Helper functions for auth
export async function signInWithEmail(email) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  
  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Jobs table functions
export async function createJob(jobData) {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Add user_id to the job data
  const jobWithUserId = {
    ...jobData,
    user_id: user.id,
    created_at: new Date().toISOString()
  };
  
  // Insert the job into the Jobs table
  const { data, error } = await supabase
    .from('jobs')
    .insert(jobWithUserId)
    .select()
    .single();
  
  return { job: data, error };
}

export async function getJobs() {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Get all jobs for the current user
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  return { jobs: data, error };
}

export async function getJobById(jobId) {
  const supabase = createClient();
  
  // Get the job by ID
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  
  return { job: data, error };
}

export async function updateJob(jobId, jobData) {
  const supabase = createClient();
  
  // Update the job
  const { data, error } = await supabase
    .from('jobs')
    .update(jobData)
    .eq('id', jobId)
    .select()
    .single();
  
  return { job: data, error };
}

export async function deleteJob(jobId) {
  const supabase = createClient();
  
  // Delete the job
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);
  
  return { error };
}

// Profile functions
export async function getProfile() {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Get the profile for the current user
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return { profile: data, error };
}

export async function createProfile(profileData) {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Create the profile with user ID and ensure email is from auth
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      name: profileData.name,
      email: user.email, // Always use the auth email
      company: profileData.company,
      role: profileData.role,
      phone: profileData.phone,
      timezone: profileData.timezone,
      sender: profileData.sender || []
    })
    .select()
    .single();
  
  return { profile: data, error };
}

export async function updateProfile(profileData) {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Update the profile and ensure email is from auth
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: profileData.name,
      email: user.email, // Always use the auth email
      company: profileData.company,
      role: profileData.role,
      phone: profileData.phone,
      timezone: profileData.timezone,
      sender: profileData.sender || undefined // Only update if provided
    })
    .eq('id', user.id)
    .select()
    .single();
  
  return { profile: data, error };
}

// Initialize user profile after signup
export async function initializeUserProfile() {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Check if profile already exists
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();
  
  // If profile doesn't exist, create it with basic info
  if (!existingProfile && !profileError) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || '',
        email: user.email,
        timezone: 'America/New_York', // Default timezone
        sender: [] // Initialize with empty array
      })
      .select()
      .single();
    
    return { profile: data, error };
  }
  
  return { profile: existingProfile, error: profileError };
}

// Update sender emails
export async function updateSenderEmails(senderEmails) {
  const supabase = createClient();
  
  // Get the current user
  const { user, error: userError } = await getUser();
  
  if (userError) {
    return { error: userError };
  }
  
  // Ensure each item in the array is properly formatted
  const formattedSenderEmails = senderEmails.map(item => {
    // If it's already an object with email and refresh_token, return as is
    if (typeof item === 'object' && item.email) {
      return item;
    }
    
    // If it's a string, convert to object format without refresh_token
    return { email: item };
  });
  
  // Update the sender field in the profile
  const { data, error } = await supabase
    .from('profiles')
    .update({
      sender: formattedSenderEmails
    })
    .eq('id', user.id)
    .select()
    .single();
  
  return { profile: data, error };
} 
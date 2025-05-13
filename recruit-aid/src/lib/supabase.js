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
  // Clear CSRF token cookie (client-side)
  if (typeof document !== 'undefined') {
    document.cookie = 'csrf_token=; Max-Age=0; path=/;';
  }
  return { error };
}

export async function getSession() {
  const supabase = createClient();
  // First get the authenticated user
  const { user, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { session: null, error: userError };
  }
  // Then get the session data
  const { data, error } = await supabase.auth.getSession();
  // Only return session if user is authenticated
  return { 
    session: user ? data.session : null, 
    error 
  };
}

export async function getUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

//while there is a member route that has a GET method to get the info of member (it gets only id, name & email by design)
//it is called numerously, and I do not want to return the full member object in places tht it is not need in
//so I created this function to get the full member information fo rthe only place that needs it completely
export async function getFullMemberInformation(memberId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (error) throw error;
  return data;
}


export async function updateAgentState(jobId, newState) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('jobs')
      .update({ agent_state: newState })
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating agent state:', error);
    return { data: null, error };
  }
} 
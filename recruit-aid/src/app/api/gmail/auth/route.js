import { createServerClient } from '@supabase/ssr';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Custom error class for better error handling
class OAuthError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'OAuthError';
    this.code = code;
    this.details = details;
  }
}

// OAuth 2.0 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        }
      }
    }
  );
}

// Define the scopes - expanded for better Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify'
  // 'https://www.googleapis.com/auth/gmail.send',
  // 'profile',
  // 'email'
];

// Validate environment variables
function validateConfig() {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Helper function to check if code was already processed
async function isCodeProcessed(supabase, code) {
  const { data, error } = await supabase
    .from('processed_oauth_codes')
    .select('code')
    .eq('code', code)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new OAuthError('Failed to check code status', 500, error);
  }
  
  return !!data;
}

// Helper function to mark code as processed
async function markCodeAsProcessed(supabase, code) {
  const { error } = await supabase
    .from('processed_oauth_codes')
    .insert({ 
      code,
      processed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes expiry
    });
  
  if (error) {
    console.log("put code in db", error);
    throw new OAuthError('Failed to mark code as processed', 500, error);
  }
}

// Helper function to update profile with new email
async function updateProfileWithEmail(supabase, userId, email, refresh_token) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('sender')
    .eq('id', userId)
    .single();
    
  if (profileError) {
    throw new OAuthError('Failed to fetch profile', 500, profileError);
  }

  const senderEmails = profile?.sender || [];
  const emailExists = senderEmails.some(sender => 
    (typeof sender === 'string' ? sender === email : sender.email === email)
  );
  
  if (emailExists) {
    throw new OAuthError('Email already exists', 400);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      sender: [...senderEmails, { email, refresh_token, refresh_added_at: new Date().toISOString() }]
    })
    .eq('id', userId);
    
  if (updateError) {
    throw new OAuthError('Failed to update profile', 500, updateError);
  }
}

// Generate authorization URL
export async function GET(request) {
  const requestId = Date.now();
  console.log(`[${requestId}] Starting GET request`);
  
  try {
    validateConfig();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      throw new OAuthError('Email is required', 400);
    }
    
    const state = Buffer.from(JSON.stringify({ email, timestamp: Date.now() })).toString('base64');
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: state,
      include_granted_scopes: true
    });
    
    console.log(`[${requestId}] Generated auth URL for email: ${email}`);
    return NextResponse.json({ url: authUrl });
    
  } catch (error) {
    console.error(`[${requestId}] Error in GET:`, error);
    return NextResponse.json({ 
      error: error instanceof OAuthError ? error.message : 'Internal server error',
      code: error instanceof OAuthError ? error.code : 500
    }, { status: error instanceof OAuthError ? error.code : 500 });
  }
}

// Handle OAuth callback
export async function POST(request) {
  const requestId = Date.now();
  console.log(`[${requestId}] Starting POST request`);
  
  try {
    validateConfig();
    
    const supabase = await createServerSupabaseClient();
    const { code, state } = await request.json();
    
    if (!code || !state) {
      throw new OAuthError('Code and state are required', 400);
    }

    // Validate state and extract email
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const { email, timestamp } = decodedState;
    
    // Check if state is expired (10 minutes)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      throw new OAuthError('Authorization request expired', 400);
    }

    // Check if code was already processed
    const processed = await isCodeProcessed(supabase, code);
    if (processed) {
      throw new OAuthError('Authorization code already used', 400);
    }

    // Get tokens from Google
    console.log(`[${requestId}] Exchanging code for tokens`);
    const { tokens } = await oauth2Client.getToken(code).catch(error => {
      throw new OAuthError('Failed to exchange authorization code', 400, error);
    });

    if (!tokens.refresh_token) {
      throw new OAuthError('No refresh token received', 400);
    }

    // Mark code as processed
    await markCodeAsProcessed(supabase, code);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new OAuthError('User not authenticated', 401);
    }

    // Update profile with new email
    await updateProfileWithEmail(supabase, user.id, email, tokens.refresh_token);

    console.log(`[${requestId}] Successfully processed OAuth callback for email: ${email}`);
    return NextResponse.json({ 
      success: true, 
      email,
      message: 'Email successfully connected'
    });

  } catch (error) {
    console.error(`[${requestId}] Error in POST:`, error);
    return NextResponse.json({
      error: error instanceof OAuthError ? error.message : 'Internal server error',
      code: error instanceof OAuthError ? error.code : 500,
      details: error instanceof OAuthError ? error.details : undefined
    }, { status: error instanceof OAuthError ? error.code : 500 });
  }
}
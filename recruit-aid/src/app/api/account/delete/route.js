import { deleteAccount } from '@/lib/account';
import { validateCSRFToken } from '@/lib/csrf';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Validate CSRF token
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return NextResponse.json({
        success: false,
        error: csrfError
      }, { status: 403 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the account
    const result = await deleteAccount(user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
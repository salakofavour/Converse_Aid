import { validateCSRFToken } from '@/lib/csrf';
import { createSubscription } from '@/lib/subscription';
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await createSubscription(user.id, user.email);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: result.subscription,
      url: result.checkoutUrl
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
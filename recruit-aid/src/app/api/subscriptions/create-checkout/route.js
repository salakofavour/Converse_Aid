import { validateCSRFToken } from '@/lib/csrf';
import { createSubscription } from '@/lib/subscription';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log("hit create-checkout in route");
    // Validate CSRF token
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return NextResponse.json({
        success: false,
        error: csrfError
      }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

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
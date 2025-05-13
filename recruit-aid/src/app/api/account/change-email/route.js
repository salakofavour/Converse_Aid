import { validateCSRFToken } from '@/lib/csrf';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';


//using a put and not a post because I am not creating a new entry but updating the existing email
export async function PUT(request) {
  try {
    const csrfError = await validateCSRFToken(request);
    if (csrfError) {
      return NextResponse.json({ error: csrfError }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    const { newEmail } = await request.json();

    if (!newEmail) {
      return NextResponse.json(
        { error: 'New email is required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update email
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email change confirmation sent. Please check your new email and click the link to confirm the change.'
    });

  } catch (error) {
    console.error('Error changing email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
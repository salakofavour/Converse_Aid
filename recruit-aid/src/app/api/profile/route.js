import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/profile
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    // Get the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in profile GET route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/profile
export async function POST(request) {
  try {
    const { name, company, role, phone, timezone } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    // Create the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          name,
          company,
          email: user.email,
          role,
          phone,
          timezone
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in profile POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/profile
export async function PUT(request) {
  try {
    const { name, company, role, phone, timezone } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { error: 'Failed to get user' },
        { status: 401 }
      );
    }

    // Update the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        name,
        company,
        role,
        phone,
        timezone
      })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in profile PUT route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
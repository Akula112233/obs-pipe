import { createServerComponentClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Properly await the params
    const { id } = await context.params;
    
    const supabase = await createServerComponentClient();
    
    // First verify the current user is authenticated
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get member data
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, role, org_id')
      .eq('id', id)
      .single();

    if (memberError) {
      console.error('Error fetching member:', memberError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For now, if the requesting user is looking up themselves, include their email
    const email = member.id === currentUser.id ? currentUser.email : undefined;
    
    return NextResponse.json({ 
      user: {
        ...member,
        email
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
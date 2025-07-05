import { createServerComponentClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getOrganizationData } from '@/utils/organization';

// Function to generate a secure random API key
function generateApiKey(): string {
  return `${crypto.randomBytes(32).toString('hex')}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { orgId } = await getOrganizationData();
      if (!orgId) {
        console.error('No organization ID found');
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const { name, description } = await request.json();
      if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      // Generate a new API key
      const key = generateApiKey();

      // Store the raw api key in the database
      const { error: insertError } = await supabase
        .from('ingest_api_keys')
        .insert({
          org_id: orgId,
          name,
          key,
          description,
          created_by: user.id,
          is_enabled: true
        });

      if (insertError) {
        console.error('Error creating API key:', JSON.stringify(insertError, null, 2));
        return NextResponse.json(
          { error: 'Failed to create API key', details: insertError.message },
          { status: 500 }
        );
      }

      // Return the unhashed key - this is the only time it will be shown
      return NextResponse.json({ key });
    } catch (orgError) {
      console.error('Organization error:', orgError);
      return NextResponse.json(
        { error: 'Failed to get organization data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in API key creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { orgId } = await getOrganizationData();
      if (!orgId) {
        console.error('No organization ID found');
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const { data: keys, error } = await supabase
        .from('ingest_api_keys')
        .select('id, name, description, key, created_at, last_used_at, is_enabled, created_by')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching API keys:', JSON.stringify(error, null, 2));
        return NextResponse.json(
          { error: 'Failed to fetch API keys', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ keys });
    } catch (orgError) {
      console.error('Organization error:', orgError);
      return NextResponse.json(
        { error: 'Failed to get organization data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
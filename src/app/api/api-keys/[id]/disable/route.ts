import { createServerComponentClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { getOrganizationData } from '@/utils/organization';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 });
    }

    const supabase = await createServerComponentClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgId } = await getOrganizationData();
    if (!orgId) {
      console.error('No organization ID found');
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // First verify the key exists and belongs to the organization
    const { data: keyData, error: keyError } = await supabase
      .from('ingest_api_keys')
      .select('id, is_enabled')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (keyError || !keyData) {
      console.error('Error fetching API key:', keyError);
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    if (!keyData.is_enabled) {
      return NextResponse.json({ error: 'API key is already disabled' }, { status: 400 });
    }

    // Update the key
    const { error: updateError } = await supabase
      .from('ingest_api_keys')
      .update({ 
        is_enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('org_id', orgId);

    if (updateError) {
      console.error('Error updating API key:', updateError);
      return NextResponse.json(
        { error: 'Failed to disable API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'API key disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
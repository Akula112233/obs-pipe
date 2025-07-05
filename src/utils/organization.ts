import { createServerComponentClient } from '@/app/lib/supabase/server';

interface OrganizationData {
    orgId: string;
    userId: string;
    member: any; // Type this properly based on your member schema
}

/**
 * Gets the organization data for the current user, including membership verification.
 * Throws an error if:
 * - User is not authenticated
 * - User is not a member of any organization
 */
export async function getOrganizationData(): Promise<OrganizationData> {
    const supabase = await createServerComponentClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('Unauthorized');
    }

    // Get organization membership
    const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single();

    if (memberError || !member) {
        throw new Error('No organization membership found');
    }

    return {
        orgId: member.org_id,
        userId: user.id,
        member
    };
}

/**
 * Verifies if a user has access to an organization.
 * Returns true if the user is a member, false otherwise.
 */
export async function verifyOrganizationAccess(userId: string, orgId: string): Promise<boolean> {
    const supabase = await createServerComponentClient();
    
    const { data: member, error } = await supabase
        .from('members')
        .select('id')
        .eq('id', userId)
        .eq('org_id', orgId)
        .single();

    return !error && !!member;
} 
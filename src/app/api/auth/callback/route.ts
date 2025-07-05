import { createServerComponentClient } from '@/app/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper to get the correct site URL
const getSiteUrl = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
        console.warn('NEXT_PUBLIC_SITE_URL is not set, falling back to default');
        return 'http://localhost:3000';
    }
    return siteUrl;
};

// Add specific error types
type CallbackError = {
    type: 'auth_error' | 'missing_metadata' | 'org_creation_error' | 'member_creation_error';
    message: string;
};

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    
    const redirectWithError = (error: CallbackError) => {
        const params = new URLSearchParams({
            error: error.type,
            message: error.message
        });
        return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error?${params}`);
    };

    if (!code) {
        return redirectWithError({
            type: 'auth_error',
            message: 'No authentication code provided'
        });
    }

    console.log('Callback received with code:', code);

    const supabase = await createServerComponentClient();
    console.log('Attempting to exchange code for session...');
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
        console.error('Auth error details:', {
            message: error.message,
            status: error.status,
            name: error.name,
            stack: error.stack
        });
        return redirectWithError({
            type: 'auth_error',
            message: error.message
        });
    }

    if (!data?.user) {
        console.error('No user data received from session exchange');
        return redirectWithError({
            type: 'auth_error',
            message: 'No user data received from session exchange'
        });
    }

    console.log('Session exchange successful, user:', {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata
    });

    try {
        // Check if user already has an organization
        const { data: existingMember, error: memberCheckError } = await supabase
            .from('members')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (memberCheckError) {
            console.log('Member check error:', memberCheckError);
        }

        if (existingMember) {
            console.log('User already has organization, redirecting home');
            return NextResponse.redirect(getSiteUrl());
        }

        // Get the stored metadata
        const metadata = data.user.user_metadata;
        console.log('User metadata:', metadata);

        const name = metadata?.name;
        const orgName = metadata?.orgName;

        if (!name || !orgName) {
            console.error('Missing metadata:', { name, orgName });
            return redirectWithError({
                type: 'missing_metadata',
                message: 'Missing metadata'
            });
        }

        // Create organization
        console.log('Creating organization:', { orgName });
        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert([{ name: orgName }])
            .select()
            .single();

        if (orgError) {
            console.error('Organization creation error:', orgError);
            return redirectWithError({
                type: 'org_creation_error',
                message: orgError.message
            });
        }

        console.log('Organization created:', org);

        // Create member record
        console.log('Creating member record:', {
            userId: data.user.id,
            orgId: org.id,
            name
        });

        const { error: memberError } = await supabase
            .from('members')
            .insert([{
                id: data.user.id,
                org_id: org.id,
                name,
                role: 'admin'
            }]);

        if (memberError) {
            console.error('Member creation error:', memberError);
            // Clean up the organization
            await supabase.from('organizations').delete().eq('id', org.id);
            return redirectWithError({
                type: 'member_creation_error',
                message: memberError.message
            });
        }

        console.log('Member record created, redirecting home');
        return NextResponse.redirect(getSiteUrl());
    } catch (error: any) {
        console.error('Callback error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        return redirectWithError({
            type: 'auth_error',
            message: error.message
        });
    }
} 
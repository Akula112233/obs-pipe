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

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    
    console.log('Callback received with code:', code);

    if (code) {
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
            return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
        }

        if (!data?.user) {
            console.error('No user data received from session exchange');
            return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
        }

        console.log('Session exchange successful, user:', {
            id: data.user.id,
            email: data.user.email,
            metadata: data.user.user_metadata
        });

        // Check if this is a Google auth
        const isGoogleAuth = data.user.app_metadata?.provider === 'google';
        console.log('Authentication provider:', isGoogleAuth ? 'Google' : 'Email');

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

            let name;
            let orgName;

            if (isGoogleAuth) {
                // For Google auth, use the user's Google profile name
                name = metadata?.full_name || metadata?.name;
                
                // For Google OAuth, we might have stored orgName in localStorage
                // We'll need to redirect to a page to collect the org name
                return NextResponse.redirect(`${getSiteUrl()}/auth/complete-profile`);
            } else {
                // For email auth, use the values from registration form
                name = metadata?.name;
                orgName = metadata?.orgName;
            }

            if (!name || !orgName) {
                console.error('Missing metadata:', { name, orgName });
                return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
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
                return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
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
                return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
            }

            console.log('Member record created, redirecting home');
            return NextResponse.redirect(getSiteUrl());
        } catch (error: any) {
            console.error('Callback error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
        }
    }

    console.error('No code provided in callback');
    return NextResponse.redirect(`${getSiteUrl()}/auth/auth-code-error`);
} 
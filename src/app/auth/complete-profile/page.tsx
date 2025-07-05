'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { createBrowserComponentClient } from '@/utils/supabase/client';

export default function CompleteProfilePage() {
    const [orgName, setOrgName] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();
    const supabase = createBrowserComponentClient();

    useEffect(() => {
        // Check if user is authenticated
        const checkUser = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (!session || error) {
                // If not authenticated, redirect to sign in
                router.push('/auth/signin');
                return;
            }
            
            setUser(session.user);
            
            // Pre-fill name from OAuth provider if available
            if (session.user.user_metadata?.full_name) {
                setName(session.user.user_metadata.full_name);
            } else if (session.user.user_metadata?.name) {
                setName(session.user.user_metadata.name);
            }
            
            // Check if user already has an organization
            const { data: existingMember, error: memberCheckError } = await supabase
                .from('members')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (existingMember && !memberCheckError) {
                // User already has an organization, redirect to home
                router.push('/');
            }
            
            // Try to get stored orgName from localStorage if any
            const storedOrgName = localStorage.getItem('pendingOrgName');
            if (storedOrgName) {
                setOrgName(storedOrgName);
                localStorage.removeItem('pendingOrgName');
            }
        };
        
        checkUser();
    }, [router, supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!orgName.trim()) {
            setError('Organization name is required');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            if (!user) {
                throw new Error('User not authenticated');
            }
            
            // Create organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert([{ name: orgName }])
                .select()
                .single();

            if (orgError) {
                throw new Error(`Failed to create organization: ${orgError.message}`);
            }
            
            // Get display name (either from form or from OAuth provider)
            const displayName = name || user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown';
            
            // Create member record
            const { error: memberError } = await supabase
                .from('members')
                .insert([{
                    id: user.id,
                    org_id: org.id,
                    name: displayName,
                    role: 'admin'
                }]);

            if (memberError) {
                // Clean up the organization
                await supabase.from('organizations').delete().eq('id', org.id);
                throw new Error(`Failed to create member: ${memberError.message}`);
            }
            
            // Redirect to home
            router.push('/');
        } catch (err: any) {
            console.error('Error completing profile:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
                        Complete Your Profile
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        We need a little more information to set up your account
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input
                            id="orgName"
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            required
                            className="mt-1"
                        />
                    </div>
                    
                    {error && (
                        <div className="text-red-600 text-sm">{error}</div>
                    )}
                    
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Saving...' : 'Complete Setup'}
                    </Button>
                </form>
            </div>
        </div>
    );
} 
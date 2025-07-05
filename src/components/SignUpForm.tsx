'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { createBrowserComponentClient } from '@/utils/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function SignUpForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [orgName, setOrgName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const router = useRouter();
    const supabase = createBrowserComponentClient();
    const { refreshOrganization } = useOrganization();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // First create the user account
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                    data: {
                        name,
                        orgName,
                    }
                }
            });

            console.log('Signup response:', {
                user: user ? { 
                    id: user.id,
                    email: user.email,
                    metadata: user.user_metadata 
                } : null,
                error: signUpError
            });

            if (signUpError) {
                setError(signUpError.message);
                return;
            }

            // At this point, only show confirmation message and stop
            setSuccessMessage('Please check your email for confirmation link');
            router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError('An unexpected error occurred');
            console.error('Sign up error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        try {
            setError(null);
            setGoogleLoading(true);
            
            // Store orgName in localStorage for retrieval after OAuth flow
            if (orgName) {
                localStorage.setItem('pendingOrgName', orgName);
            }
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            });
            
            if (error) {
                setError(error.message);
            }
        } catch (err) {
            console.error('Google sign up error:', err);
            setError('An unexpected error occurred');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
                    Organization Name
                </label>
                <input
                    id="orgName"
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
            </div>
            <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1"
                />
            </div>

            <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                />
            </div>

            <div>
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1"
                />
            </div>

            {error && (
                <div className="text-red-600 text-sm">{error}</div>
            )}

            {successMessage && (
                <div className="text-green-600 text-sm">{successMessage}</div>
            )}

            <div className="flex flex-col gap-4">
                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? 'Creating account...' : 'Sign up'}
                </Button>

                <div className="relative flex items-center justify-center">
                    <div className="absolute border-t border-gray-300 w-full"></div>
                    <div className="relative px-4 bg-white text-sm text-gray-500">
                        Or continue with
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignUp}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.03 5.03 0 0 1-2.2 3.37v2.79h3.55c2.08-1.92 3.29-4.74 3.29-8.17z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.77a6.62 6.62 0 0 1-3.73 1.06 6.59 6.59 0 0 1-6.22-4.6H2.18v2.86A11 11 0 0 0 12 23z"/>
                        <path fill="#FBBC05" d="M5.78 14.03a6.56 6.56 0 0 1-.35-2.04c0-.7.12-1.39.35-2.04V7.1H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.92l3.6-2.9z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 12 1a10.98 10.98 0 0 0-9.82 6.1l3.6 2.9A6.59 6.59 0 0 1 12 5.38z"/>
                    </svg>
                    {googleLoading ? 'Signing up...' : 'Sign up with Google'}
                </Button>

                <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link href="/auth/signin" className="text-blue-600 hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </form>
    );
} 

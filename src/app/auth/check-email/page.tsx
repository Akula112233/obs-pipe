'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/button';
import { createBrowserComponentClient } from '@/utils/supabase/client';

export default function CheckEmailPage() {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0); // Start 60 second countdown
    const supabase = createBrowserComponentClient();

    // Get email from URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        if (emailParam) {
            setEmail(emailParam);
        }
    }, []);

    // Handle countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleResendEmail = async () => {
        if (countdown > 0) return;
        
        try {
            setError(null);
            setSuccess(null);

            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) {
                setError(error.message);
                return;
            }

            setSuccess('Confirmation email sent successfully');
            setCountdown(60); // Start 60 second countdown
        } catch (err) {
            console.error('Error resending email:', err);
            setError('Failed to resend confirmation email');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 p-6">
            <h1 className="text-2xl font-bold mb-6">Check Your Email</h1>
            
            <p className="mb-4 text-gray-600">
                We sent a confirmation email to <strong>{email}</strong>. 
                Click the link in the email to confirm your account.
            </p>

            {error && (
                <div className="mb-4 text-red-600 text-sm">{error}</div>
            )}

            {success && (
                <div className="mb-4 text-green-600 text-sm">{success}</div>
            )}

            <div className="space-y-4">
                <Button
                    onClick={handleResendEmail}
                    disabled={countdown > 0}
                    className="w-full"
                >
                    {countdown > 0 
                        ? `Resend email (${countdown}s)` 
                        : 'Resend confirmation email'}
                </Button>

                <p className="text-center text-sm text-gray-600">
                    <Link href="/auth/signin" className="text-blue-600 hover:underline">
                        Back to sign in
                    </Link>
                </p>
            </div>
        </div>
    );
} 
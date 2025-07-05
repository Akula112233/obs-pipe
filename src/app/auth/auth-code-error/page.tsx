'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/button';

interface AuthError {
    error: string;
    error_code: string;
    error_description: string;
}

const errorMessages: { [key: string]: string } = {
    access_denied: 'Access Denied',
    otp_expired: 'Link Expired',
    invalid_request: 'Invalid Request',
};

export default function AuthCodeErrorPage() {
    const [error, setError] = useState<AuthError | null>(null);

    useEffect(() => {
        // Parse error from URL hash
        const hash = window.location.hash.substring(1); // Remove the # symbol
        const params = new URLSearchParams(hash);
        
        const errorData: AuthError = {
            error: params.get('error') || 'unknown_error',
            error_code: params.get('error_code') || 'unknown',
            error_description: params.get('error_description') || 'An unknown error occurred'
        };
        
        setError(errorData);
    }, []);

    if (!error) return null;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <div className="w-full max-w-md">
                <div className="rounded-lg border border-red-100 bg-red-50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <h1 className="text-lg font-semibold text-red-900">
                            {errorMessages[error.error] || 'Authentication Error'}
                        </h1>
                    </div>
                    
                    <p className="text-sm text-red-700 mb-6">
                        {decodeURIComponent(error.error_description)}
                    </p>

                    <div className="space-y-4">
                        <Button
                            asChild
                            className="w-full"
                        >
                            <Link href="/auth/signin">
                                Return to Sign In
                            </Link>
                        </Button>
                        
                        <p className="text-center text-sm text-gray-600">
                            Need help?{' '}
                            <Link href="/support" className="text-blue-600 hover:underline">
                                Contact Support
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 
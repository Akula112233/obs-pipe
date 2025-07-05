'use client';

import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/button';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <div className="w-full max-w-md">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <FileQuestion className="h-5 w-5 text-gray-600" />
                        <h1 className="text-lg font-semibold text-gray-900">
                            Page Not Found
                        </h1>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-6">
                        The page you're looking for doesn't exist or has been moved.
                    </p>

                    <div className="space-y-4">
                        <Button
                            asChild
                            className="w-full"
                        >
                            <Link href="/">
                                Return to Dashboard
                            </Link>
                        </Button>
                        
                        <p className="text-center text-sm text-gray-600">
                            Lost? Check our{' '}
                            <Link href="/docs" className="text-blue-600 hover:underline">
                                documentation
                            </Link>
                            {' '}or{' '}
                            <a href="mailto:support@runsift.com" className="text-blue-600 hover:underline">
                                contact support
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 
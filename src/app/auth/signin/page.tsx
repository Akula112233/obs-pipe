import SignInForm from '@/components/SignInForm';

export default async function SignInPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }> | { error?: string };
}) {
    const errorMessages: { [key: string]: string } = {
        organization_access_denied: 'Your account is not registered with this organization.',
    };

    const params = await searchParams;
    const error = params?.error ? errorMessages[params.error] : null;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Access your organization&apos;s dashboard
                    </p>
                </div>
                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="text-sm text-red-700">
                            {error}
                        </div>
                    </div>
                )}
                <SignInForm />
            </div>
        </div>
    );
} 

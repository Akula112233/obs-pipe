import SignUpForm from '@/components/SignUpForm';

export default function SignUpPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Join your organization&apos;s workspace
                    </p>
                </div>
                <SignUpForm />
            </div>
        </div>
    );
} 
import Link from 'next/link';

export function DocAuthPrompt() {
  return (
    <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-medium text-blue-800 mb-2">Get Personalized Documentation</h3>
      <p className="text-slate-700 mb-2">
        The example below uses placeholder values. For a personalized experience with your unique organization ID and API keys, please <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">sign in</Link>.
      </p>
    </div>
  );
} 
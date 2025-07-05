'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { CodeBlock } from '@/components/CodeBlock';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DocAuthPrompt } from '@/components/DocAuthPrompt';

export default function JavaScriptGuidePage() {
    const { isAuthenticated, orgId, isLoading } = useAuthStatus();
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const envFileSetup = isAuthenticated 
      ? `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://${orgId}.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=${selectedKey || "<SELECT-FROM-DROPDOWN-ABOVE>"}

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=nodejs-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
NODE_ENV=development
BATCH_DELAY_MILLIS=5000
MAX_BATCH_SIZE=100
EXPORT_TIMEOUT_MILLIS=30000`
      : `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://<YOUR-ORG-ID>.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=<YOUR-API-KEY>

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=nodejs-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
NODE_ENV=development
BATCH_DELAY_MILLIS=5000
MAX_BATCH_SIZE=100
EXPORT_TIMEOUT_MILLIS=30000`;

    const installCommand = `npm install sift-dev-logger`;

    const configExample = `import { configureLogger } from 'sift-dev-logger';
// Or using CommonJS:
// const { configureLogger } = require('sift-dev-logger');

configureLogger({
    sift_dev_endpoint: process.env.SIFT_DEV_ENDPOINT,
    sift_dev_ingest_key: process.env.SIFT_DEV_INGEST_KEY,
    service_name: "configured-service",
    service_instance_id: "instance-1",
    env: "custom-env",
    batch_delay_millis: 5000,
    max_batch_size: 100,
    export_timeout_millis: 30000,
    default_attributes: {
        deployment: "blue",
        region: "us-west-2"
    }
});`;

    const usageExample = `import { getLogger } from 'sift-dev-logger';
// Or using CommonJS:
// const { getLogger } = require('sift-dev-logger');

// Get a logger instance
const logger = getLogger({ component: 'user-service' });

// Basic logging
logger.info('Application started');

// With additional attributes
logger.info('User logged in', { 
    userId: '123', 
    action: 'login' 
});

// Error handling
try {
    throw new Error('Database connection failed');
} catch (error) {
    logger.error('Connection error', error, { 
        database: 'users'
    });
}`;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <Link
                    href="/docs"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
                >
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-sm font-medium">Back to Guides</span>
                </Link>
                <h1 className="text-3xl font-bold mb-4">Node.js Integration Guide (JavaScript)</h1>
                <p className="text-slate-600 mb-6">
                    Learn how to integrate Sift Dev logging with your Node.js applications using JavaScript.
                </p>
            </div>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">1.</span> Installation
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Install the Sift Dev Logger SDK using npm:
                    </p>
                    <CodeBlock code={installCommand} language="bash" showLineNumbers={false} />
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">2.</span> Environment Setup
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Create a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm">.env</code> file
                        in your project root.
                    </p>
                    
                    {isLoading ? (
                        <div className="p-4 mb-4 bg-slate-50 border border-slate-200 rounded-lg animate-pulse">
                            <p className="text-slate-400">Loading...</p>
                        </div>
                    ) : isAuthenticated ? (
                        <>
                            <p className="text-slate-700 mb-4">
                                Select your API key below:
                            </p>
                            <ApiKeySelector
                                selectedKey={selectedKey}
                                onKeySelect={setSelectedKey}
                                className="mb-4"
                            />
                        </>
                    ) : (
                        <DocAuthPrompt />
                    )}

                    <CodeBlock code={envFileSetup} language="bash" showLineNumbers={false} />
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">3.</span> Configuration (Optional)
                    </h2>
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-slate-700">
                            <p className="font-medium mb-2">💡 Configuration Options</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Environment variables are <span className="font-medium">automatically detected</span> from your <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-sm">process.env</code> object if present</li>
                                <li>Manual configuration via code is available for more control</li>
                                <li>Configure early in your application startup if using manual configuration</li>
                                <li>Both CommonJS (<code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-sm">require</code>) and ES Modules (<code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-sm">import</code>) are supported</li>
                            </ul>
                        </div>

                        <p className="text-slate-700">
                            If you want to configure the logger in your code instead of using environment variables:
                        </p>
                    </div>

                    <CodeBlock code={configExample} language="javascript" />
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">4.</span> Usage
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Start logging with structured data in your application:
                    </p>
                    <CodeBlock code={usageExample} language="javascript" />
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                            <span className="text-blue-600">5.</span> Advanced Usage
                        </h2>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            {showAdvanced ? 'Hide' : 'Show'} Advanced Features
                            <span className="text-lg">{showAdvanced ? '▼' : '▶'}</span>
                        </button>
                    </div>
                    {showAdvanced && (
                        <div className="space-y-4">
                            <p className="text-slate-700">
                                Advanced features and configuration options:
                            </p>

                            <CodeBlock code={`const { configureLogger, getLogger, setDefaultAttributes, flushLogs } = require('sift-dev-logger');

// Manual configuration if needed
configureLogger({
    sift_dev_endpoint: process.env.SIFT_DEV_ENDPOINT,
    sift_dev_ingest_key: process.env.SIFT_DEV_INGEST_KEY,
    service_name: "configured-service",
    env: "custom-env",
    batch_delay_millis: 1000,
    default_attributes: {
        deployment: "blue",
        region: "us-west-2"
    }
});

// Get a logger with component context
const logger = getLogger({ component: 'advanced-features' });

// Template-based logging with attribute interpolation
logger.info('User {user} performed {action} from {ip}', { 
    user: 'bob', 
    ip: '10.0.0.1',
    action: 'login',
    session_id: '123' // Additional attributes are included in log
});

// Set default attributes for all subsequent logs
setDefaultAttributes({ 
    environment: 'production',
    version: '1.0.0'
});

// Different severity levels
logger.debug('Debug message with low-level details');
logger.info('Standard informational message');
logger.warn('Warning about potential issues');

// Rich error logging
try {
    throw new Error('Primary error');
} catch (error) {
    // Create error chain
    const wrappedError = new Error('Operation failed');
    wrappedError.cause = error;
    
    // Log with full error chain and context
    logger.error('Complex error scenario', wrappedError, {
        operation: 'data_sync',
        affected_items: ['a', 'b'],
        retry_count: 3
    });
}

// Batch logging example
async function processBatch() {
    for (let i = 0; i < 100; i++) {
        logger.info(\`Processing item \${i}\`, {
            item_id: i,
            batch_id: 'batch_123'
        });
    }
    
    // Ensure all logs are sent before exiting
    await flushLogs();
}

// Structured logging with rich context
logger.info('API request completed', {
    request_id: 'req_123',
    method: 'POST',
    path: '/api/v1/users',
    duration_ms: 45,
    status_code: 200,
    user_id: 'usr_789',
    metadata: {
        client_version: '2.1.0',
        client_platform: 'ios'
    }
});`} language="javascript" />
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Next Steps</h2>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                        <p className="text-slate-700 mb-4">
                            Now that you've set up logging in your Node.js application:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-slate-700">
                            <li>View your logs in the <Link href="/logs" className="text-blue-600 hover:text-blue-700 hover:underline">Logs Dashboard</Link></li>
                            <li>Set up alerts and notifications</li>
                            <li>Configure custom log attributes for better filtering</li>
                            <li>Explore our other framework integrations</li>
                        </ul>
                    </div>
                </section>
            </div>
        </div>
    );
} 
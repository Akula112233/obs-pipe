'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { CodeBlock } from '@/components/CodeBlock';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DocAuthPrompt } from '@/components/DocAuthPrompt';

export default function TypeScriptGuidePage() {
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

    const installCommand = `npm i sift-dev-logger`;

    const configInterface = `interface SiftDevConfig {
    sift_dev_endpoint?: string;
    sift_dev_ingest_key?: string;
    service_name?: string;
    service_instance_id?: string;
    env?: string;
    batch_delay_millis?: number;
    max_batch_size?: number;
    export_timeout_millis?: number;
    default_attributes?: LogAttributes;
}`;

    const configExample = `import { configureLogger } from 'sift-dev-logger';

// Configuration with environment variables and overrides
const config: Partial<SiftDevConfig> = {
    sift_dev_endpoint: process.env.SIFT_DEV_ENDPOINT,
    sift_dev_ingest_key: process.env.SIFT_DEV_INGEST_KEY,
    service_name: process.env.SIFT_DEV_SERVICE_NAME,
    service_instance_id: process.env.SIFT_DEV_SERVICE_INSTANCE_ID,
    env: process.env.NODE_ENV,
    batch_delay_millis: process.env.BATCH_DELAY_MILLIS ? parseInt(process.env.BATCH_DELAY_MILLIS, 10) : undefined,
    max_batch_size: process.env.MAX_BATCH_SIZE ? parseInt(process.env.MAX_BATCH_SIZE, 10) : undefined,
    export_timeout_millis: process.env.EXPORT_TIMEOUT_MILLIS ? parseInt(process.env.EXPORT_TIMEOUT_MILLIS, 10) : undefined,
};

configureLogger(config);`;

    const usageExample = `import { getLogger } from 'sift-dev-logger';

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
                <h1 className="text-3xl font-bold mb-4">Node.js Integration Guide (TypeScript)</h1>
                <p className="text-slate-600 mb-6">
                    Learn how to integrate Sift Dev logging with your Node.js applications using TypeScript.
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
                            <p className="font-medium mb-2">💡 Configuration Interface</p>
                            <p className="text-sm mb-4">
                                The SDK provides TypeScript types for all configuration options:
                            </p>
                            <CodeBlock code={configInterface} language="typescript" />
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-slate-700">
                            <p className="font-medium mb-2">💡 Configuration Options</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Environment variables are <span className="font-medium">automatically detected</span> from your <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-sm">process.env</code> object if present</li>
                                <li>Manual configuration via code is available for more control</li>
                                <li>Configure early in your application startup if using manual configuration</li>
                                <li>Full TypeScript support with type definitions included</li>
                            </ul>
                        </div>

                        <p className="text-slate-700">
                            If you want to configure the logger in your code instead of using environment variables:
                        </p>
                    </div>

                    <CodeBlock code={configExample} language="typescript" />
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">4.</span> Usage
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Start logging with structured data in your application:
                    </p>
                    <CodeBlock code={usageExample} language="typescript" />
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

                            <CodeBlock code={`import { 
    configureLogger, 
    getLogger, 
    setDefaultAttributes, 
    flushLogs,
    SiftDevConfig,
    LogAttributes,
    Logger
} from 'sift-dev-logger';

// Configuration interfaces
interface SiftDevConfig {
    sift_dev_endpoint?: string;
    sift_dev_ingest_key?: string;
    service_name?: string;
    service_instance_id?: string;
    env?: string;
    batch_delay_millis?: number;
    max_batch_size?: number;
    export_timeout_millis?: number;
    default_attributes?: LogAttributes;
}

// Manual configuration if needed
const config: Partial<SiftDevConfig> = {
    sift_dev_endpoint: process.env.SIFT_DEV_ENDPOINT,
    sift_dev_ingest_key: process.env.SIFT_DEV_INGEST_KEY,
    service_name: "configured-service",
    env: "custom-env",
    batch_delay_millis: 1000,
    default_attributes: {
        deployment: "blue",
        region: "us-west-2"
    }
};

configureLogger(config);

// Get a strongly-typed logger instance
const logger: Logger = getLogger({ component: 'advanced-features' });

// Template-based logging with type-safe attribute interpolation
interface UserContext {
    user: string;
    ip: string;
    action: string;
    session_id: string;
}

const userContext: UserContext = {
    user: 'bob',
    ip: '10.0.0.1',
    action: 'login',
    session_id: '123'
};

logger.info('User {user} performed {action} from {ip}', userContext);

// Set default attributes with type checking
interface DefaultAttrs {
    environment: string;
    version: string;
}

const defaults: DefaultAttrs = {
    environment: 'production',
    version: '1.0.0'
};

setDefaultAttributes(defaults);

// Different severity levels
logger.debug('Debug message with low-level details');
logger.info('Standard informational message');
logger.warn('Warning about potential issues');

// Rich error logging with type safety
try {
    throw new Error('Primary error');
} catch (error) {
    // Create error chain
    const wrappedError = new Error('Operation failed');
    wrappedError.cause = error;
    
    interface ErrorContext {
        operation: string;
        affected_items: string[];
        retry_count: number;
    }
    
    const errorContext: ErrorContext = {
        operation: 'data_sync',
        affected_items: ['a', 'b'],
        retry_count: 3
    };
    
    logger.error('Complex error scenario', wrappedError, errorContext);
}

// Batch logging example with async/await
async function processBatch(): Promise<void> {
    interface BatchItem {
        item_id: number;
        batch_id: string;
    }
    
    for (let i = 0; i < 100; i++) {
        const item: BatchItem = {
            item_id: i,
            batch_id: 'batch_123'
        };
        logger.info(\`Processing item \${i}\`, item);
    }
    
    // Ensure all logs are sent before exiting
    await flushLogs();
}

// Structured logging with rich context and type safety
interface ApiContext {
    request_id: string;
    method: string;
    path: string;
    duration_ms: number;
    status_code: number;
    user_id: string;
    metadata: {
        client_version: string;
        client_platform: string;
    };
}

const apiContext: ApiContext = {
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
};

logger.info('API request completed', apiContext);`} language="typescript" />
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
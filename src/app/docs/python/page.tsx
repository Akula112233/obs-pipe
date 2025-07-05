'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { CodeBlock } from '@/components/CodeBlock';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DocAuthPrompt } from '@/components/DocAuthPrompt';

export default function PythonGuidePage() {
    const { isAuthenticated, orgId, isLoading } = useAuthStatus();
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const envFileSetup = isAuthenticated 
      ? `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://${orgId}.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=${selectedKey || "<SELECT-FROM-DROPDOWN-ABOVE>"}

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=python-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
ENV=unspecified`
      : `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://<YOUR-ORG-ID>.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=<YOUR-API-KEY>

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=python-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
ENV=unspecified`;

    const pythonPipCommands = `pip install sift-dev-logger`;

    const configExample = `from sift_dev_logger import SiftDevConfig, configure

# All configuration options with their defaults
configure(SiftDevConfig(
    sift_dev_endpoint="Initialize here, or set SIFT_DEV_ENDPOINT env var",
    sift_dev_ingest_key="Initialize here, or set SIFT_DEV_INGEST_KEY env var",
    service_name="python-app",
    service_instance_id="instance-1",
    env="unspecified",
    batch_delay_millis=5000
))`;

    const pythonExample = `from sift_dev_logger import getLogger

# Basic logging with attributes
logger = getLogger()
logger.info("User logged in", extra={
    "user_id": "123",
    "action": "login"
})

# Warning level logging
logger.warn("High memory usage detected", extra={
    "memory_used_mb": 850,
    "threshold_mb": 800
})

# Error logging with exception
try:
    raise Exception("Database connection failed")
except Exception as error:
    logger.error("Connection error", exc_info=error)`;

    const handlerExample = `import logging
from sift_dev_logger import SiftDevHandler, get_current_config

# Get your existing logger
logger = logging.getLogger("my-app")
logger.setLevel(logging.INFO)

# Add the SiftDev handler
sift_dev_handler = SiftDevHandler(config=SiftDevConfig()) # If no config provided, previous config or default used
logger.addHandler(sift_dev_handler)`;

    const dictConfigExample = `from sift_dev_logger import SiftDevHandler

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s :: %(name)s - %(message)s"
        }
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "siftdev": {
            "()": "sift_dev_logger.handlers.SiftDevHandler.from_dict",
            "formatter": "default",
            "level": "INFO",
            "config": {
                "service_name": "my-app",
                "service_instance_id": "instance-1",
            }
        }
    },
    "loggers": {
        "app": {
            "handlers": ["default", "siftdev"],
            "level": "INFO",
            "propagate": False,
        }
    }
}`;

    const advancedExample = `# Configure first
configure(SiftDevConfig())

# Get a named logger with default attributes
logger = getLogger(name="test", extra={"default-key": "default-value"})

# All logs from this logger will include the "default-key" attribute
logger.info("This log includes the default attributes defined in the getLogger call")

# Additional attributes can still be added per log
logger.info("This log has both default and new attributes", extra={
    "new-key": "new-value"
})`;

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
                <h1 className="text-3xl font-bold mb-4">Python Integration Guide</h1>
                <p className="text-slate-600 mb-6">
                    Learn how to integrate Sift Dev logging with your Python applications.
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                    <p className="text-base font-medium text-blue-800 mb-3">
                        🚀 Using a Python Framework?
                    </p>
                    <p className="text-sm text-blue-700 mb-4">
                        Get framework-specific instructions with our dedicated integration guides:
                    </p>
                    <div className="flex gap-4">
                        <Link 
                            href="/docs/flask"
                            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white border-2 border-blue-200 rounded-md text-base font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                            Flask Integration Guide
                        </Link>
                        <Link 
                            href="/docs/fastapi"
                            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white border-2 border-blue-200 rounded-md text-base font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                            FastAPI Integration Guide
                        </Link>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">1.</span> Installation
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Install the Sift Dev Logger SDK using pip:
                    </p>
                    <CodeBlock code={pythonPipCommands} language="bash" showLineNumbers={false} />
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
                                <li>Environment variables are <span className="font-medium">automatically detected</span> from your system environment if present</li>
                                <li>Manual configuration via code will <span className="font-medium">override</span> environment variables</li>
                                <li>Configure must be called before using getLogger</li>
                            </ul>
                        </div>

                        <p className="text-slate-700 font-bold">
                            Configuration options and defaults
                        </p>
                    </div>

                    <CodeBlock code={configExample} language="python" />
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">4.</span> Usage
                    </h2>
                    <p className="text-slate-700 mb-4 font-bold">
                        Start logging with structured data in your application
                    </p>
                    <CodeBlock code={pythonExample} language="python" />

                    <p className="text-slate-700 mt-6 font-bold">
                        Using with existing Python logging setup
                    </p>
                    <p className="text-slate-600 mb-4">
                        If you already have loggers set up with Python's logging module, you can add Sift Dev logging by attaching our handler to your existing loggers:
                    </p>
                    <CodeBlock code={handlerExample} language="python" />
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
                            <p className="text-slate-700 font-bold">
                                Named loggers with default attributes
                            </p>

                            <CodeBlock code={advancedExample} language="python" />

                            <p className="text-slate-700 mt-6 font-bold">
                                Using dictConfig (settings.py) for setup
                            </p>

                            <CodeBlock code={dictConfigExample} language="python" />
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Next Steps</h2>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                        <p className="text-slate-700 mb-4">
                            Now that you've set up logging in your Python application:
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
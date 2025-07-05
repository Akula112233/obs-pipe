'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { CodeBlock } from '@/components/CodeBlock';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DocAuthPrompt } from '@/components/DocAuthPrompt';

export default function FastAPIGuidePage() {
    const { isAuthenticated, orgId, isLoading } = useAuthStatus();
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const envFileSetup = isAuthenticated 
      ? `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://${orgId}.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=${selectedKey || "<SELECT-FROM-DROPDOWN-ABOVE>"}

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=fastapi-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
ENV=unspecified`
      : `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://<YOUR-ORG-ID>.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=<YOUR-API-KEY>

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=fastapi-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
ENV=unspecified`;

    const installCommand = `pip install sift-dev-logger
pip install "sift-dev-logger[fastapi]"`;

    const configExample = `from fastapi import FastAPI
from sift_dev_logger import SiftDevConfig, configure, fastapi_logger

# Optional: Configure with defaults or environment variables
configure(SiftDevConfig(
    sift_dev_endpoint="Initialize here, or set SIFT_DEV_ENDPOINT env var",
    sift_dev_ingest_key="Initialize here, or set SIFT_DEV_INGEST_KEY env var",
    service_name="fastapi-app",
    service_instance_id="instance-1",
    env="unspecified",
    batch_delay_millis=5000
))

app = FastAPI()

# Initialize the logger with your FastAPI app
# Uses previous configuration, or creates a new default config if none exists
fastapi_logger(app)`;

    const pythonExample = `from fastapi import FastAPI, HTTPException
from sift_dev_logger import getLogger, SiftDevConfig, fastapi_logger

app = FastAPI()

# Initialize with custom configuration
fastapi_logger(
    app,
    config=SiftDevConfig(service_name="custom-fastapi-app"),  # Optional custom config
    max_body_size=50_000,  # Maximum body size to log (bytes)
    ignored_paths={"/health", "/metrics"},  # Paths to exclude from logging
    capture_request_body=True,  # Log request bodies (default: True)
    capture_response_body=False  # Log response bodies (default: False)
)

# Get a logger for custom logging
logger = getLogger()

@app.get('/users/{user_id}')
async def get_user(user_id: str):
    # Custom log with request context
    logger.info("Processing user request", extra={
        "user_id": user_id,
        "action": "get_user"
    })
    
    try:
        user = {"id": user_id, "name": "John Doe"}
        return user
    except Exception as error:
        logger.error("User lookup failed", exc_info=error)
        raise HTTPException(status_code=404, detail="Not found")`;

    const handlerExample = `import logging
from sift_dev_logger import SiftDevHandler, SiftDevConfig

# Configure Uvicorn loggers with Sift Dev
loggers = [
    "uvicorn",           # Server logs
    "uvicorn.access",    # Access logs
    "uvicorn.error",     # Error logs
    "fastapi"            # FastAPI logs
]

# Create handler with custom config
handler = SiftDevHandler(config=SiftDevConfig(service_name="fastapi-internal"))

# Add handler to all Uvicorn loggers
for logger_name in loggers:
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)`;

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
                "service_name": "fastapi-internal",
                "service_instance_id": "instance-1",
            }
        }
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["default", "siftdev"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.access": {
            "handlers": ["default", "siftdev"],
            "level": "INFO",
            "propagate": False,
        },
        "uvicorn.error": {
            "handlers": ["default", "siftdev"],
            "level": "INFO",
            "propagate": False,
        },
        "fastapi": {
            "handlers": ["default", "siftdev"],
            "level": "INFO",
            "propagate": False,
        }
    }
}`;

    const advancedExample = `from fastapi import FastAPI, Request, Response
from sift_dev_logger import getLogger, SiftDevConfig, fastapi_logger

app = FastAPI()

# Advanced configuration
config = SiftDevConfig(
    service_name="fastapi-advanced",
    service_instance_id="prod-1",
    env="production"
)

# Configure FastAPI logger with custom settings
fastapi_logger(
    app,
    config=config,
    max_body_size=200_000,
    ignored_paths={
        "/health",
        "/metrics",
        "/internal/*"
    },
    capture_request_body=True,
    capture_response_body=True
)

# Get a logger with default attributes
logger = getLogger(
    name="auth-service",
    extra={
        "service": "authentication",
        "version": "2.0"
    }
)

@app.middleware("http")
async def log_request_info(request: Request, call_next):
    # Log request details before processing
    logger.info("Incoming request", extra={
        "path": request.url.path,
        "method": request.method,
        "client_ip": request.client.host
    })
    
    response: Response = await call_next(request)
    
    # Log response details after processing
    logger.info("Outgoing response", extra={
        "status_code": response.status_code,
        "content_length": response.headers.get("content-length")
    })
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log unhandled exceptions
    logger.error(
        "Unhandled exception",
        exc_info=exc,
        extra={
            "url": str(request.url),
            "method": request.method,
            "headers": dict(request.headers)
        }
    )
    return {"error": "Internal server error"}, 500`;

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
                <h1 className="text-3xl font-bold mb-4">FastAPI Integration Guide</h1>
                <p className="text-slate-600 mb-6">
                    Learn how to integrate Sift Dev logging with your FastAPI applications.
                </p>
            </div>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">1.</span> Installation
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Install the Sift Dev Logger SDK using pip:
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
                                <li>Environment variables are <span className="font-medium">automatically detected</span> from your system environment if present</li>
                                <li>Manual configuration via code will <span className="font-medium">override</span> environment variables</li>
                                <li>Configure must be called before using fastapi_logger or getLogger</li>
                                <li className="mt-2 text-blue-800">FastAPI-specific features:</li>
                                <li>Automatic request and response logging</li>
                                <li>Optional request/response body capture</li>
                                <li>Performance metrics for each route</li>
                                <li>Error tracking with full stack traces</li>
                                <li>Request context in all logs</li>
                                <li>Async support out of the box</li>
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
                        FastAPI middleware and custom logging
                    </p>
                    <CodeBlock code={pythonExample} language="python" />

                    <p className="text-slate-700 mt-6 font-bold">
                        Configuring Uvicorn's internal logging
                    </p>
                    <p className="text-slate-600 mb-4">
                        Instead of using the middleware, you can capture Uvicorn's internal logs by adding our handler to the existing loggers:
                    </p>
                    <CodeBlock code={handlerExample} language="python" />

                    <p className="text-slate-700 mt-6 font-bold">
                        Using dictConfig for Uvicorn setup
                    </p>
                    <p className="text-slate-600 mb-4">
                        Alternatively, configure Uvicorn logging using Python's dictConfig:
                    </p>
                    <CodeBlock code={dictConfigExample} language="python" />
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
                                Advanced FastAPI configuration with middleware
                            </p>

                            <CodeBlock code={advancedExample} language="python" />
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Next Steps</h2>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                        <p className="text-slate-700 mb-4">
                            Now that you've set up logging in your FastAPI application:
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
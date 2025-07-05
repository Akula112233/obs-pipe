'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { CodeBlock } from '@/components/CodeBlock';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { DocAuthPrompt } from '@/components/DocAuthPrompt';

export default function FlaskGuidePage() {
    const { isAuthenticated, orgId, isLoading } = useAuthStatus();
    const [selectedKey, setSelectedKey] = useState<string>('');
    const [showAdvanced, setShowAdvanced] = useState(false);

    const envFileSetup = isAuthenticated 
      ? `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://${orgId}.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=${selectedKey || "<SELECT-FROM-DROPDOWN-ABOVE>"}

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=flask-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
ENV=unspecified`
      : `# Your Sift Dev endpoint and api key
SIFT_DEV_ENDPOINT=http://<YOUR-ORG-ID>.app.trysift.dev:8000
SIFT_DEV_INGEST_KEY=<YOUR-API-KEY>

# Optional configuration (defaults shown below)
SIFT_DEV_SERVICE_NAME=flask-app
SIFT_DEV_SERVICE_INSTANCE_ID=instance-1
ENV=unspecified`;

    const installCommand = `pip install sift-dev-logger
pip install "sift-dev-logger[flask]"`;

    const configExample = `from flask import Flask
from sift_dev_logger import SiftDevConfig, configure
from sift_dev_logger.flask import flask_logger

# Optional: Configure with defaults or environment variables
configure(SiftDevConfig(
    sift_dev_endpoint="Initialize here, or set SIFT_DEV_ENDPOINT env var",
    sift_dev_ingest_key="Initialize here, or set SIFT_DEV_INGEST_KEY env var",
    service_name="flask-app",
    service_instance_id="instance-1",
    env="unspecified",
    batch_delay_millis=5000
))

app = Flask(__name__)

# Initialize the logger with your Flask app
# Uses previous configuration, or creates a new default config if none exists
flask_logger(app)`;

    const pythonExample = `from flask import Flask
from sift_dev_logger.flask import flask_logger
from sift_dev_logger import getLogger, SiftDevConfig

app = Flask(__name__)

# Initialize with custom configuration
flask_logger(
    app,
    config=SiftDevConfig(service_name="custom-flask-app"),  # Optional custom config
    max_body_size=50_000,  # Maximum response body size to log (bytes)
    ignored_paths={"/health", "/metrics"}  # Paths to exclude from logging
)

# Get a logger for custom logging
logger = getLogger()

@app.route('/users/<user_id>')
def get_user(user_id):
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
        return {"error": "Not found"}, 404`;

    const handlerExample = `import logging
from sift_dev_logger import SiftDevHandler, SiftDevConfig

# Configure Werkzeug (Flask's default logger) with Sift Dev
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.INFO)

# Add SiftDev handler to capture Flask's internal logs
handler = SiftDevHandler(config=SiftDevConfig(service_name="flask-internal"))
werkzeug_logger.addHandler(handler)`;

    const advancedExample = `from flask import Flask, request
from sift_dev_logger.flask import flask_logger
from sift_dev_logger import getLogger, SiftDevConfig

app = Flask(__name__)

# Advanced configuration
config = SiftDevConfig(
    service_name="flask-advanced",
    service_instance_id="prod-1",
    env="production"
)

# Configure Flask logger with custom settings
flask_logger(
    app,
    config=config,
    max_body_size=200_000,
    ignored_paths={
        "/health",
        "/metrics",
        "/internal/*"
    }
)

# Get a logger with default attributes
logger = getLogger(
    name="auth-service",
    extra={
        "service": "authentication",
        "version": "2.0"
    }
)

@app.before_request
def log_request_info():
    # Log request details before processing
    logger.info("Incoming request", extra={
        "path": request.path,
        "method": request.method,
        "client_ip": request.remote_addr
    })

@app.after_request
def log_response_info(response):
    # Log response details after processing
    logger.info("Outgoing response", extra={
        "status_code": response.status_code,
        "content_length": response.content_length
    })
    return response

@app.errorhandler(Exception)
def handle_error(error):
    # Log unhandled exceptions
    logger.error(
        "Unhandled exception",
        exc_info=error,
        extra={
            "url": request.url,
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
                <h1 className="text-3xl font-bold mb-4">Flask Integration Guide</h1>
                <p className="text-slate-600 mb-6">
                    Learn how to integrate Sift Dev logging with your Flask applications.
                </p>
            </div>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">1.</span> Installation
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Install the Sift Dev Logger SDK with Flask support:
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
                                <li>Configure must be called before using flask_logger or getLogger</li>
                                <li className="mt-2 text-blue-800">Flask-specific features:</li>
                                <li>Automatic request and response logging</li>
                                <li>Performance metrics for each route</li>
                                <li>Error tracking with full stack traces</li>
                                <li>Request context in all logs</li>
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
                        Flask middleware and custom logging
                    </p>
                    <CodeBlock code={pythonExample} language="python" />

                    <p className="text-slate-700 mt-6 font-bold">
                        Configuring Flask's internal logging
                    </p>
                    <p className="text-slate-600 mb-4">
                        Instead of using the middleware, you can capture Flask's internal logs (Werkzeug) by adding our handler to the existing logger:
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
                                Advanced Flask configuration with request hooks
                            </p>

                            <CodeBlock code={advancedExample} language="python" />
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Next Steps</h2>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                        <p className="text-slate-700 mb-4">
                            Now that you've set up logging in your Flask application:
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
'use client';

import Link from 'next/link';
import { ArrowLeft, Copy, CheckCircle2, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/button";
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { ApiKeySelector } from '@/components/ApiKeySelector';
import { DocAuthPrompt } from '@/components/DocAuthPrompt';

export default function NextJSLoggingGuidePage() {
    const { isAuthenticated, orgId, isLoading } = useAuthStatus();
    const [selectedKey, setSelectedKey] = useState<string>('');

    const CodeBlock = ({ 
        code, 
        language, 
        maxHeight = "400px",
        allowDownload = false,
        filename = "" 
    }: { 
        code: string, 
        language: string,
        maxHeight?: string,
        allowDownload?: boolean,
        filename?: string
    }) => {
        const [isCopied, setIsCopied] = useState(false);
        const [isOverflowing, setIsOverflowing] = useState(false);
        const preRef = useRef<HTMLPreElement>(null);

        useEffect(() => {
            if (preRef.current) {
                setIsOverflowing(
                    preRef.current.scrollHeight > preRef.current.clientHeight
                );
            }
        }, [code]);

        const handleCopy = async () => {
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([code], { type: 'text/plain' }),
                }),
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        };

        const handleDownload = () => {
            const blob = new Blob([code], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        };

        return (
            <div className="relative">
                <pre 
                    ref={preRef}
                    className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-slate-50 font-mono text-sm" 
                    style={{ maxHeight, overflowY: 'auto' }}
                >
                    <code className={`language-${language}`}>{code}</code>
                </pre>
                {isOverflowing && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
                )}
                <div className="absolute top-2 right-2 flex gap-2">
                    {allowDownload && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDownload}
                            title="Download file"
                            className="bg-slate-700 hover:bg-slate-600"
                        >
                            <Download className="h-4 w-4 text-slate-100" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        title="Copy to clipboard"
                        className="bg-slate-700 hover:bg-slate-600"
                    >
                        {isCopied ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                            <Copy className="h-4 w-4 text-slate-100" />
                        )}
                    </Button>
                </div>
            </div>
        );
    };

    const envFileSetup = isAuthenticated 
      ? `# Create a .env.local file in your project root
NEXT_PUBLIC_OTLP_ENDPOINT="http://${orgId}.app.trysift.dev:8000"  # Your unique Sift Dev endpoint
NEXT_PUBLIC_SIFT_DEV_INGEST_KEY="${selectedKey || "<SELECT-FROM-DROPDOWN-ABOVE>"}"  # Your Sift Dev ingest key
NEXT_PUBLIC_SERVICE_NAME="your-app-name"  # Optional, defaults to "nextjs-app"`
      : `# Create a .env.local file in your project root
NEXT_PUBLIC_OTLP_ENDPOINT="http://<YOUR-ORG-ID>.app.trysift.dev:8000"  # Your unique Sift Dev endpoint
NEXT_PUBLIC_SIFT_DEV_INGEST_KEY="<YOUR-API-KEY>"  # Your Sift Dev ingest key
NEXT_PUBLIC_SERVICE_NAME="your-app-name"  # Optional, defaults to "nextjs-app"`;

    const dependencies = `npm install @opentelemetry/api-logs @opentelemetry/exporter-logs-otlp-proto @opentelemetry/resources @opentelemetry/sdk-logs @opentelemetry/semantic-conventions`;

    const loggerSettingsCode = `// src/utils/loggerSettings.ts
import {
    LoggerProvider,
    BatchLogRecordProcessor,
    LogRecordLimits,
  } from "@opentelemetry/sdk-logs";
  import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
  import { Resource } from "@opentelemetry/resources";
  import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
  import { Logger } from "@opentelemetry/api-logs";
  
  export const Severity = {
    DEBUG: 5,
    INFO: 9,
    WARN: 13,
    ERROR: 17,
    FATAL: 21,
  } as const;
  
  interface LoggerAttributes {
    [key: string]: string | number | boolean;
  }
  
  /**
   * Type Definitions
   */
  type LogAttributes = Record<string, string | number | boolean>;

  type LogMethod = (
    message: string,
    attributesOrError?: LogAttributes | Error,
    attributes?: LogAttributes
  ) => void;

  type ErrorWithStack = Error & {
    stack?: string;
    cause?: Error | unknown;
  };

  interface EnhancedLogger extends Logger {
    debug: LogMethod;
    info: LogMethod;
    warn: LogMethod;
    error: LogMethod;
  }

  class OTelLogger {
    private static instance: OTelLogger;
    private loggerProvider: LoggerProvider | undefined;
    private initialized: boolean = false;
    private defaultAttributes: LoggerAttributes = {};
  
    private constructor() {
        // Only initialize if we have the required endpoint
        if (!process.env.NEXT_PUBLIC_OTLP_ENDPOINT) {
            console.warn('NEXT_PUBLIC_OTLP_ENDPOINT not available');
            return;
        }
        
        const baseEndpoint = process.env.NEXT_PUBLIC_OTLP_ENDPOINT;
        const logsEndpoint = \`\${baseEndpoint}/v1/logs\`;
        this.setupLogging(logsEndpoint);
    }
  
    public static getInstance(): OTelLogger {
      if (!OTelLogger.instance) {
        OTelLogger.instance = new OTelLogger();
      }
      return OTelLogger.instance;
    }
  
    private setupLogging(logsEndpoint: string): void {
      if (this.initialized) return;
  
      try {
        console.log('Setting up logging to endpoint:', logsEndpoint);

        // Create a resource with service and Vercel-specific information
        const resource = new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]:
            process.env.NEXT_PUBLIC_SERVICE_NAME || "vercel-app",
          [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: "local",
        });
  
        // Configure the logs exporter
        const logExporter = new OTLPLogExporter({
          url: logsEndpoint,
          headers: {
            "Content-Type": "application/x-protobuf",
            "Authorization": \`Bearer \${process.env.NEXT_PUBLIC_SIFT_DEV_INGEST_KEY}\`
          },
          timeoutMillis: 2000,
        });
  
        this.loggerProvider = new LoggerProvider({
          resource: resource,
          logRecordLimits: {
            attributeCountLimit: 128,
            attributeValueLengthLimit: 4096
          } as LogRecordLimits
        });
  
        this.loggerProvider.addLogRecordProcessor(
          new BatchLogRecordProcessor(logExporter as any, {
            scheduledDelayMillis: 500,
            exportTimeoutMillis: 2000,
            maxExportBatchSize: 10,
          })
        );
  
        console.log('Logger setup complete');
        this.initialized = true;
      } catch (error) {
        console.error('Failed to setup logging:', error);
        throw error;
      }
    }
  
    public getLogger(
      name: string,
      attributes: LogAttributes = {},
      version = "1.0.0"
    ): EnhancedLogger {
      if (!this.initialized) {
        this.setupLogging(process.env.NEXT_PUBLIC_OTLP_ENDPOINT + '/v1/logs');
      }
      if (!this.loggerProvider) throw new Error("Logger provider not initialized");

      const baseLogger = this.loggerProvider.getLogger(name, version);
      return this.createEnhancedLogger(baseLogger, name, attributes);
    }
  
    private createEnhancedLogger(
      baseLogger: Logger,
      name: string,
      attributes: LogAttributes
    ): EnhancedLogger {
      return new Proxy(baseLogger, {
        get: (target, prop) => {
          if (prop === "emit") {
            return this.createEmitWrapper(target, name, attributes);
          }

          const severityMap: Record<string, number> = {
            debug: Severity.DEBUG,
            info: Severity.INFO,
            warn: Severity.WARN,
            error: Severity.ERROR,
          };

          if (prop in severityMap) {
            return this.createLogMethod(target, String(prop), severityMap[prop as string], attributes);
          }

          return (target as any)[prop];
        },
      }) as EnhancedLogger;
    }
  
    private createLogMethod(
      target: Logger,
      level: string,
      severity: number,
      loggerAttributes: LogAttributes
    ) {
      return (
        message: string,
        attributesOrError?: LogAttributes | Error,
        extraAttributes?: LogAttributes
      ) => {
        const { attributes, errorDetails } = this.processAttributes(
          attributesOrError,
          extraAttributes,
          loggerAttributes
        );

        const contextAttributes = this.getContextAttributes();
        const interpolatedMessage = this.interpolateMessage(message, attributes);

        target.emit({
          severityNumber: severity,
          severityText: level.toUpperCase(),
          body: interpolatedMessage,
          attributes: { ...contextAttributes, ...attributes, ...errorDetails },
          timestamp: new Date(),
        });
      };
    }
  
    private processAttributes(
      attributesOrError?: LogAttributes | Error,
      extraAttributes?: LogAttributes,
      loggerAttributes?: LogAttributes
    ) {
      let attributes = { ...this.defaultAttributes, ...loggerAttributes };
      let errorDetails = {};

      if (attributesOrError instanceof Error) {
        errorDetails = this.processError(attributesOrError);
        if (extraAttributes) {
          attributes = { ...attributes, ...extraAttributes };
        }
      } else if (attributesOrError) {
        attributes = { ...attributes, ...attributesOrError };
      }

      return { attributes, errorDetails };
    }
  
    private processError(error: ErrorWithStack) {
      const errorDetails: Record<string, unknown> = {
        error_message: error.message,
        error_name: error.name,
        error_stack: error.stack?.split("\n").map((line) => line.trim()),
      };

      if (error.cause) {
        errorDetails.error_cause = error.cause instanceof Error
          ? {
              message: error.cause.message,
              name: error.cause.name,
              stack: error.cause.stack,
            }
          : String(error.cause);
      }

      return errorDetails;
    }
  
    private getContextAttributes() {
      if (typeof window === 'undefined') {
        const callerInfo = this.getCallerInfo();
        return {
          "caller.file": callerInfo.file,
          "caller.line": callerInfo.line,
          "caller.function": callerInfo.function,
        };
      }
      return {};
    }
  
    private interpolateMessage(message: string, attributes: LogAttributes): string {
      const matches = message.match(/\{(\w+)\}/g);
      if (!matches) return message;

      return matches.reduce((msg, match) => {
        const key = match.slice(1, -1);
        return key in attributes
          ? msg.replace(match, String(attributes[key]))
          : msg;
      }, message);
    }
  
    private getCallerInfo() {
      const stack = new Error().stack?.split("\n");
      const callerLine = stack?.[4]; // Adjust for additional wrapper

      if (!callerLine) return {};

      const match =
        callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) ||
        callerLine.match(/at\s+()(.*):(\d+):(\d+)/);

      if (!match) return {};

      const [, functionName, file, line] = match;
      return {
        function: functionName || "anonymous",
        file,
        line: parseInt(line, 10),
      };
    }
  
    public setDefaultAttributes(attributes: LoggerAttributes): void {
      this.defaultAttributes = { ...this.defaultAttributes, ...attributes };
    }
  
    public async flush(): Promise<void> {
      if (this.loggerProvider) {
        await this.loggerProvider.forceFlush();
      }
    }
   
    public async shutdown(): Promise<void> {
      if (this.loggerProvider) {
        await this.loggerProvider.shutdown();
      }
    }

    private createEmitWrapper(target: Logger, name: string, attributes: LogAttributes) {
      return (logRecord: any) => {
        const mergedAttributes = {
          ...this.defaultAttributes,
          ...attributes,
          ...(logRecord.attributes || {}),
        };

        // Always log in development for debugging
        console.log('Attempting to emit log:', {
          timestamp: new Date().toISOString(),
          level: logRecord.severityText,
          logger: name,
          message: logRecord.body,
          attributes: mergedAttributes,
        });

        return target.emit({
          ...logRecord,
          attributes: mergedAttributes,
        });
      };
    }
  }
  
  export function getLogger(
    name: string,
    attributes: LoggerAttributes = {},
    version: string = "1.0.0"
  ): EnhancedLogger {
    return OTelLogger.getInstance().getLogger(name, attributes, version);
  }
  
  export function setDefaultAttributes(attributes: LoggerAttributes): void {
    OTelLogger.getInstance().setDefaultAttributes(attributes);
  }
  
  export async function flushLogs(): Promise<void> {
    await OTelLogger.getInstance().flush();
  }
  
  export default OTelLogger;
  
  export type { EnhancedLogger };`;

    const loggerUsageExample = `// Example usage in a server component (src/app/users/page.tsx)
import { getLogger } from '@/utils/loggerSettings';

// Create a logger instance with component context
const logger = getLogger('users-page', {
    component: 'UsersPage',
    area: 'user-management'
});

export default async function UsersPage() {
    try {
        // Log the start of an operation
        logger.info('Fetching users list');
        
        const users = await fetchUsers();
        
        // Log successful completion with context
        logger.info('Users fetched successfully', {
            count: users.length,
            cached: false
        });

        return <UsersList users={users} />;
    } catch (error) {
        // Log errors with full context
        logger.error('Failed to fetch users', error as Error, {
            retry: true,
            maxAttempts: 3
        });
        throw error;
    }
}`;

    const apiRouteLoggingExample = `// Example usage in an API route (src/app/api/users/route.ts)
import { getLogger } from '@/utils/loggerSettings';
import { NextRequest, NextResponse } from 'next/server';

const logger = getLogger('users-api', {
    endpoint: '/api/users'
});

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    logger.info('Processing user search request', {
        query,
        ip: req.ip,
        userAgent: req.headers.get('user-agent')
    });

    try {
        const users = await searchUsers(query);
        
        logger.info('User search completed', {
            query,
            resultCount: users.length
        });

        return NextResponse.json(users);
    } catch (error) {
        logger.error('Search failed', error as Error, {
            query,
            errorCode: (error as any).code
        });
        
        return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
        );
    }
}`;

    const edgeLoggingCode = `// src/middleware/withEdgeLogging.ts
import { NextRequest, NextResponse } from 'next/server';

type EdgeHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

async function forwardLog(logData: any, req: NextRequest) {
  try {
    const url = new URL('/api/internal/log', req.url);
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify(logData),
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to forward log:', error);
  }
}

export function withEdgeLogging(handler: EdgeHandler): EdgeHandler {
  return async (req: NextRequest) => {
    const requestStart = Date.now();
    const requestId = crypto.randomUUID();

    // Skip logging requests to the logging endpoint itself
    if (!req.nextUrl.pathname.includes('/api/internal/log')) {
      await forwardLog({
        message: \`Incoming \${req.method} request to \${req.nextUrl.pathname}\`,
        type: 'request_start',
        requestId,
        timestamp: new Date().toISOString(),
      }, req);

      try {
        const response = await handler(req);
        
        await forwardLog({
          message: \`Completed \${req.method} request to \${req.nextUrl.pathname} in \${Date.now() - requestStart}ms\`,
          type: 'request_end',
          requestId,
          duration: Date.now() - requestStart,
        }, req);
        
        return response;
      } catch (error) {
        await forwardLog({
          message: \`Error in \${req.method} request to \${req.nextUrl.pathname}\`,
          type: 'request_error',
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, req);
        
        throw error;
      }
    }
    
    return handler(req);
  };
}`;

    const internalLogRouteCode = `// src/app/api/internal/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/utils/loggerSettings';

const logger = getLogger('edge-runtime');

export async function POST(req: NextRequest) {
  const logData = await req.json();
  logger.info(logData.message, logData);
  return NextResponse.json({ success: true });
}`;

    const apiRouteExample = `// src/app/api/hello/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withEdgeLogging } from '@/middleware/withEdgeLogging';

async function handler(req: NextRequest) {
    return NextResponse.json({ message: 'Hello World' });
}

export const GET = withEdgeLogging(handler);`;

    const regularLoggingExample = `// Any server component or API route
import { getLogger } from '@/utils/loggerSettings';

const logger = getLogger('my-component', {
    component: 'UserProfile',
});

// Basic logging
logger.info('User profile loaded');

// With context
logger.info('User action completed', {
    userId: '123',
    action: 'profile_update'
});

// Error handling
try {
    throw new Error('Failed to update profile');
} catch (error) {
    logger.error('Profile update failed', error as Error, {
        userId: '123',
        attempted_fields: ['name', 'email']
    });
}`;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header Section */}
            <div className="mb-8">
                <Link href="/docs" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-sm font-medium">Back to Guides</span>
                </Link>
                <h1 className="text-3xl font-bold mb-4">Next.js Logging Integration Guide</h1>
                <p className="text-slate-600">
                    Learn how to integrate structured logging in your Next.js application, including support for Edge Runtime.
                </p>
            </div>

            {/* Environment Setup */}
            <section className="space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">1.</span> Environment Setup
                    </h2>
                    <p className="text-slate-700 mb-4">
                        First, create a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm">.env.local</code> file
                        in your project root with the following content:
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
                    
                    <CodeBlock 
                        code={envFileSetup}
                        language="bash"
                        maxHeight="200px"
                    />
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-slate-700">
                            You can get your ingest key from the{' '}
                            <Link href="/api-keys" className="text-blue-600 hover:text-blue-700 hover:underline">
                                API Keys page
                            </Link>
                            . If you haven't created one yet, you'll need to create a new key there.
                        </p>
                        <p className="text-sm text-slate-700 mt-2">
                            Make sure to add these environment variables to your deployment platform's configuration as well.
                            For Vercel, add them in your project's Environment Variables settings.
                        </p>
                    </div>
                </div>

                {/* Dependencies */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">2.</span> Install Dependencies
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Install the required packages using npm:
                    </p>
                    <CodeBlock 
                        code={dependencies}
                        language="bash"
                        maxHeight="200px"
                    />
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                        <p className="text-sm text-slate-700">
                            <strong>Note:</strong> These packages are compatible with both server-side and Edge Runtime environments.
                            Make sure to use them only in server-side code (Server Components, API Routes, Edge Functions).
                        </p>
                    </div>
                </div>

                {/* Logger Setup */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">3.</span> Logger Setup
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Create a new file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm">src/utils/loggerSettings.ts</code> to set up your logging infrastructure:
                    </p>
                    <CodeBlock 
                        code={loggerSettingsCode} 
                        language="typescript" 
                        maxHeight="400px"
                        allowDownload={true}
                        filename="loggerSettings.ts"
                    />
                    
                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3 text-slate-800">Server Component Example</h3>
                        <p className="text-slate-700 mb-4">
                            Example usage in a server component:
                        </p>
                        <CodeBlock 
                            code={loggerUsageExample}
                            language="typescript"
                            maxHeight="300px"
                        />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3 text-slate-800">API Route Example</h3>
                        <p className="text-slate-700 mb-4">
                            Example usage in an API route:
                        </p>
                        <CodeBlock 
                            code={apiRouteLoggingExample}
                            language="typescript"
                            maxHeight="300px"
                        />
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-slate-800 mb-2">Important Notes:</h4>
                        <ul className="list-disc list-inside space-y-2 text-slate-700">
                            <li>The logger is designed for server-side use only (Server Components, API Routes, etc.)</li>
                            <li>Each logger instance can have its own context via attributes</li>
                            <li>Error logging automatically captures stack traces and error details</li>
                            <li>Use meaningful logger names to easily filter logs later</li>
                        </ul>
                    </div>
                </div>

                {/* Edge Runtime Support */}
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                        <span className="text-blue-600">4.</span> Edge Runtime Support
                    </h2>
                    <p className="text-slate-700 mb-4">
                        Create a new file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm">src/middleware/withEdgeLogging.ts</code>:
                    </p>
                    <CodeBlock 
                        code={edgeLoggingCode} 
                        language="typescript"
                        maxHeight="400px"
                        allowDownload={true}
                        filename="withEdgeLogging.ts"
                    />
                    
                    <p className="text-slate-700 my-4">
                        Create a new file <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono text-sm">src/app/api/internal/log/route.ts</code>:
                    </p>
                    <CodeBlock 
                        code={internalLogRouteCode} 
                        language="typescript"
                        maxHeight="200px"
                        allowDownload={true}
                        filename="log-route.ts"
                    />

                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3 text-slate-800">Usage in Edge API Routes</h3>
                        <p className="text-slate-700 mb-4">
                            Example usage in an Edge API route:
                        </p>
                        <CodeBlock 
                            code={apiRouteExample} 
                            language="typescript"
                            maxHeight="200px"
                        />
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3 text-slate-800">Regular Server-Side Logging Example</h3>
                        <p className="text-slate-700 mb-4">
                            Example usage in any server component or API route:
                        </p>
                        <CodeBlock 
                            code={regularLoggingExample} 
                            language="typescript"
                            maxHeight="300px"
                        />
                    </div>

                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                        <h4 className="font-medium text-slate-800 mb-2">Edge Runtime Notes:</h4>
                        <ul className="list-disc list-inside space-y-2 text-slate-700">
                            <li>Edge Runtime logging is forwarded to your main logger through an internal API route</li>
                            <li>The middleware approach ensures consistent logging across all Edge routes</li>
                            <li>Make sure to protect your internal logging endpoint in production</li>
                            <li>Consider rate limiting and request validation for the logging endpoint</li>
                        </ul>
                    </div>
                </div>

                {/* Next Steps */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-slate-800">Next Steps</h2>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                        <p className="text-slate-700 mb-4">
                            Now that you've set up logging in your Next.js application:
                        </p>
                        <ul className="list-disc list-inside space-y-2 text-slate-700">
                            <li>View your logs in the <Link href="/logs" className="text-blue-600 hover:text-blue-700 hover:underline">Logs Dashboard</Link></li>
                            <li>Set up custom attributes for better filtering</li>
                            <li>Configure error monitoring and alerts</li>
                            <li>Add request correlation IDs for tracing</li>
                        </ul>
                    </div>
                </section>
            </section>
        </div>
    );
} 
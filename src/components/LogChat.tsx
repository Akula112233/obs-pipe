'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
// eslint-disable-next-line import/no-unresolved
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { AlertTriangle, Info, AlertCircle, RefreshCw, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
// Fix DOMPurify import to handle both client and server environments
import DOMPurifyModule from 'dompurify';

// Create a safe server-compatible way to use DOMPurify
const createDOMPurify = () => {
  if (typeof window === 'undefined') {
    // Server-side rendering - return a dummy sanitizer that just returns the input
    return {
      sanitize: (html: string, options?: any) => html,
    };
  }
  return DOMPurifyModule;
};

// Get the appropriate DOMPurify instance
const DOMPurify = createDOMPurify();

// Define a simpler escape HTML function for server-side rendering
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Extend the Window interface to include our custom method
declare global {
  interface Window {
    __scrollToLog?: (logId: string) => void;
  }
}

interface Log {
  timestamp?: string;
  message?: string;
  level?: string;
  id?: string;
  hostname?: string;
  service?: string;
  [key: string]: any;
}

interface LogReference {
  logId: string;
  index: number;
}

interface LogChatProps {
}

// Define the initial welcome message for consistency
const INITIAL_MESSAGE = 'Hello! I can help you understand your logs. What would you like to know?';

// A simplified component for rendering the initial message to avoid hydration issues
const InitialMessage = () => {
  return <p className="font-normal text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-normal">
    {INITIAL_MESSAGE}
  </p>;
};

export default function LogChat() {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'assistant' | 'user', content: string }>>([
    { role: 'assistant', content: INITIAL_MESSAGE }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [relevantLogs, setRelevantLogs] = useState<Log[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [highlightedLog, setHighlightedLog] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const logRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const messageWasSentRef = useRef(false);
  // Track if we're on the client to handle hydration
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true after initial render to handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Wrap scrollToLog in useCallback to prevent unnecessary re-renders
  const scrollToLog = useCallback((logId: string) => {
    // Find the log index in the relevantLogs array
    const logIndex = relevantLogs.findIndex(log => log.id === logId);
    if (logIndex === -1) {
      console.warn(`Attempted to scroll to log ${logId} but it's not in the relevantLogs array`);
      return;
    }
    
    // Ensure the log is expanded
    setExpandedLogs(prev => {
      const newExpanded = new Set(prev);
      newExpanded.add(logIndex);
      return newExpanded;
    });
    
    // Set highlighted log
    setHighlightedLog(logId);
    
    // Scroll to the log element
    setTimeout(() => {
      const logElement = logRefs.current.get(logId);
      if (logElement) {
        logElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      
      // Clear highlight after a delay
      setTimeout(() => setHighlightedLog(null), 3000);
    }, 100);
  }, [relevantLogs]);

  // Listen for hash changes to handle log navigation through URL
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#log-')) {
        const logId = hash.replace('#log-', '');
        const logExists = relevantLogs.some(log => log.id === logId);
        
        if (logExists) {
          scrollToLog(logId);
        }
        
        // Clear the hash without page jump
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    // Check for hash on initial load
    handleHashChange();
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [relevantLogs, scrollToLog]);

  // Add a listener to handle clicks on log references
  useEffect(() => {
    const handleLogRefClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('data-log-id')) {
        const logId = target.getAttribute('data-log-id');
        if (logId) {
          scrollToLog(logId);
        }
      }
    };
    
    document.addEventListener('click', handleLogRefClick);
    return () => {
      document.removeEventListener('click', handleLogRefClick);
    };
  }, [scrollToLog]);

  // Create window.__scrollToLog function for backwards compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__scrollToLog = scrollToLog;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.__scrollToLog = undefined;
      }
    };
  }, [scrollToLog]);

  useEffect(() => {
    // Check for query parameters when component mounts
    if (typeof window !== 'undefined' && !initialMessageSent && !messageWasSentRef.current) {
      const params = new URLSearchParams(window.location.search);
      const presetMessage = params.get('message');
      const logIdsParam = params.get('logIds');
      
      if (presetMessage) {
        setMessage(presetMessage);
        
        // If we have log IDs, we'll add them to the request
        const logIds = logIdsParam ? logIdsParam.split(',') : undefined;
        
        // Auto-send the message after a short delay to ensure component is fully mounted
        setTimeout(() => {
          if (!messageWasSentRef.current) {
            messageWasSentRef.current = true;
            handleSendMessageWithLogIds(presetMessage, logIds);
            setInitialMessageSent(true);
            
            // Clean up URL parameters to prevent sending on refresh/navigation
            if (window.history && window.history.replaceState) {
              // Keep the path but remove the query parameters
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            }
          }
        }, 500);
      }
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [chatMessages]);

  // Replace the parseMessageContent function
  const parseMessageContent = (content: string) => {
    // Skip processing if this is the initial message
    if (content === INITIAL_MESSAGE) {
      return <p>{content}</p>;
    }

    if (!content) return null;
    
    // Handle server-side rendering consistently
    if (!isClient) {
      return <div 
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: `<p>${escapeHtml(content)}</p>` }}
      />;
    }
    
    // Find all references in the content - updated to handle uppercase letters
    const refRegex = /\[ref:([a-zA-Z0-9-]+)\]/g;
    
    // Debug logging to check if references are being detected
    const refMatches = content.match(refRegex);
    console.log('Detected log references:', {
      content: content.substring(0, 100) + '...',
      refMatches: refMatches ? refMatches.length : 0,
      matches: refMatches,
      refRegexPattern: refRegex.toString()
    });
    
    // Build a map of log IDs to reference numbers for consistent numbering
    let refCounter = 1;
    const refMap: Record<string, number> = {};
    let contentCopy = content;
    let match;
    
    // First pass: collect all references to assign consistent numbers
    while ((match = refRegex.exec(contentCopy)) !== null) {
      const logId = match[1];
      if (!refMap[logId]) {
        refMap[logId] = refCounter++;
      }
    }
    
    // Second pass: replace references with markdown links
    let processedContent = content;
    Object.entries(refMap).forEach(([logId, refNumber]) => {
      const refPattern = new RegExp(`\\[ref:${logId}\\]`, 'g');
      processedContent = processedContent.replace(
        refPattern, 
        `[#${refNumber}](#log-${logId})`
      );
    });

    // Custom components for ReactMarkdown
    const components = {
      // Custom handler for links
      a: ({ node, href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string, node?: any, children?: React.ReactNode }) => {
        // Check if this is a log reference link (starts with #log-)
        if (href && href.startsWith('#log-')) {
          // Extract the log ID from the href
          const logId = href.replace('#log-', '');
          const logExists = relevantLogs.some(log => log.id === logId);
          
          return (
            <a
              {...props}
              href={href}
              className={logExists 
                ? 'inline-block cursor-pointer text-primary font-medium mx-0.5 no-underline' 
                : 'inline-block cursor-pointer text-gray-500 mx-0.5 no-underline'
              }
              data-log-id={logExists ? logId : undefined}
              data-log-missing={!logExists ? logId : undefined}
              title={logExists 
                ? `View log ${logId}` 
                : `Log ${logId} referenced but not available`
              }
              onClick={(e) => {
                // Prevent default navigation/scrolling
                e.preventDefault();
                
                if (logExists) {
                  // Handle the log reference click
                  scrollToLog(logId);
                }
              }}
            >
              {children}
            </a>
          );
        }
        
        // For regular links, open in new tab
        return <a {...props} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
      }
    };
    
    return (
      <div className="markdown-content">
        <ReactMarkdown components={components}>
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  };
  
  const handleSendMessageWithLogIds = async (messageText: string, logIds?: string[]) => {
    if (!messageText.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setMessage('');
    setIsLoading(true);
    setRelevantLogs([]); // Clear previous logs when sending a new message

    // Show initial loading message
    const loadingMessage = { 
      role: 'assistant' as const, 
      content: 'Analyzing logs, please wait...'
    };
    setChatMessages(prev => [...prev, loadingMessage]);

    try {
      // Create conversation history to send to API
      const conversationHistory = chatMessages.slice(-10); // Take only last 10 messages
      
      // Log the request to help debug
      console.log('Sending chat request with:', { 
        messageLength: messageText.length,
        hasLogIds: logIds && logIds.length > 0,
        logIdsCount: logIds?.length
      });
      
      const response = await fetch('/api/log-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversation: conversationHistory,
          logIds
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Enhanced debugging to check if logs are being returned
      console.log('Received API response:', { 
        responseLength: data.response.length,
        hasLogs: !!data.relevantLogs,
        relevantLogsCount: data.relevantLogs?.length,
        firstFewRefs: (data.response.match(/\[ref:[a-zA-Z0-9-]+\]/g) || []).slice(0, 5)
      });
      
      // Replace loading message with AI response
      setChatMessages(prev => [
        ...prev.slice(0, prev.length - 1), 
        { role: 'assistant', content: data.response }
      ]);
      
      // Set relevant logs WITHOUT auto-expanding them
      if (data.relevantLogs && data.relevantLogs.length) {
        setRelevantLogs(data.relevantLogs);
        // Remove auto-expansion of logs
        setExpandedLogs(new Set());
      } else {
        console.warn('No relevant logs received from API, but references may exist in response');
        // Extract any log IDs from the response to log the discrepancy
        const refsInResponse = data.response.match(/\[ref:([a-zA-Z0-9-]+)\]/g) || [];
        if (refsInResponse.length > 0) {
          console.warn('References in response without corresponding logs:', refsInResponse);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Replace loading message with error message
      setChatMessages(prev => [
        ...prev.slice(0, prev.length - 1),
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error processing your request. This might be due to the API limits or server issues. Please try a more specific query or try again later.' 
        }
      ]);
    } finally {
      setIsLoading(false);
      
      // Focus the input field after sending
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await handleSendMessageWithLogIds(message);
  };

  const getLogLevelIcon = (level?: string) => {
    const lowerLevel = level?.toLowerCase() || '';
    
    if (lowerLevel.includes('error') || lowerLevel === 'err') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    } else if (lowerLevel.includes('warn')) {
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    } else {
      return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm:ss.SSS');
    } catch (error) {
      return timestamp;
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'yyyy-MM-dd');
    } catch (error) {
      return timestamp.split('T')[0];
    }
  };
  
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };
  
  // Enhanced JSON syntax highlighting for better visualization
  const syntaxHighlight = (json: string) => {
    if (!json) return '';
    
    // Format the JSON with indentation if it's a valid JSON string
    let formatted = json;
    try {
      formatted = JSON.stringify(JSON.parse(json), null, 2);
    } catch (e) {
      // If it's not valid JSON, just use the original string
    }
    
    // Enhanced syntax highlighting with better color palette
    return formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-indigo-500'; // Changed purple to indigo for better contrast
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-gray-600 font-semibold'; // Darker gray for property names
          } else {
            cls = 'text-emerald-600'; // Changed green to emerald for better readability
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-blue-700'; // Deeper blue for booleans
        } else if (/null/.test(match)) {
          cls = 'text-gray-500'; // Keep gray for null values
        } else if (/\d+/.test(match)) {
          cls = 'text-rose-600'; // Changed red to rose for numbers
        }
        return `<span class="${cls}">${match}</span>`;
      });
  };
  
  // Save log refs for scrolling
  const setLogRef = (logId: string, ref: HTMLDivElement | null) => {
    if (ref) {
      logRefs.current.set(logId, ref);
    } else {
      logRefs.current.delete(logId);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex overflow-hidden rounded-lg">
        {/* Chat Area */}
        <div className="w-1/2 flex flex-col border border-border rounded-l-lg">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-lg">Log Chat</CardTitle>
          </CardHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4" ref={scrollAreaRef}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-5 ${
                    msg.role === 'user' ? 'ml-auto text-right' : ''
                  }`}
                >
                  <div
                    className={`rounded-lg px-6 py-3 max-w-[90%] overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground inline-block ml-auto'
                        : 'bg-muted/80 text-foreground block w-full'
                    }`}
                  >
                    <div 
                      className={`${
                        msg.role === 'assistant' 
                          ? 'font-normal text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-normal' 
                          : 'font-medium'
                      }`}
                    >
                      {msg.role === 'assistant' 
                        ? (msg.content === INITIAL_MESSAGE && !isClient 
                            ? <InitialMessage /> 
                            : parseMessageContent(msg.content)
                          ) 
                        : msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mb-4">
                  <div className="inline-block rounded-lg px-6 py-3 max-w-[85%] bg-muted/80 text-foreground">
                    <div className="flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      <span>Analyzing logs...</span>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
          
          <div className="p-4 border-t">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                ref={messageInputRef}
                type="text"
                placeholder="Ask about your logs..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading}>
                Send
              </Button>
            </form>
          </div>
        </div>
        
        {/* Logs Area */}
        <div className="w-1/2 flex flex-col border border-l-0 border-border rounded-r-lg">
          <CardHeader className="px-6 py-4 border-b">
            <CardTitle className="text-lg">Relevant Logs</CardTitle>
          </CardHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {relevantLogs.length > 0 ? (
                <div className="p-4 space-y-3">
                  {relevantLogs.map((log, index) => (
                    <div 
                      key={log.id || index} 
                      ref={(ref) => log.id && setLogRef(log.id, ref)}
                      className={`border ${highlightedLog === log.id 
                        ? 'border-primary shadow-md' 
                        : 'border-border/80'} rounded-lg overflow-hidden transition-all duration-300 hover:shadow-sm`}
                    >
                      <div 
                        className={`flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/50 ${
                          highlightedLog === log.id ? 'bg-primary/5' : 'bg-card'
                        }`}
                        onClick={() => toggleExpanded(index)}
                      >
                        <div className="flex items-center max-w-[70%]">
                          {getLogLevelIcon(log.level)}
                          <span className="ml-2.5 text-sm font-medium truncate">
                            {log.message}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="mr-2 px-2 py-0.5 rounded bg-muted/50">{log.service}</span>
                          <span className="mx-2 hidden sm:inline">{formatTimestamp(log.timestamp || '')}</span>
                          {expandedLogs.has(index) ? (
                            <ChevronDown className="h-4 w-4 ml-1 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 ml-1 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {expandedLogs.has(index) && (
                        <div className="p-5 text-xs border-t border-border bg-zinc-50 dark:bg-zinc-900 font-mono rounded-b-lg">
                          <div className="mb-3 flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.timestamp || '')} {formatTimestamp(log.timestamp || '')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ID: {log.id?.substring(0, 8)}...
                            </span>
                          </div>
                          <pre 
                            className="whitespace-pre-wrap overflow-x-auto bg-white dark:bg-zinc-950 p-4 rounded border border-border/50 shadow-sm"
                            dangerouslySetInnerHTML={{ 
                              __html: syntaxHighlight(JSON.stringify(log, null, 2)) 
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No relevant logs to display
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
} 
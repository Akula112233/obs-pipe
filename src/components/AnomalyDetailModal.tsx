import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/dialog';
import { Card, CardContent } from '@/components/card';
import { Button } from '@/components/button';
import { AlertTriangle, AlertCircle, Info, ArrowRight, MessageSquare, ExternalLink } from 'lucide-react';
import { Anomaly } from './AnomalyCard';
import { useRouter } from 'next/navigation';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  hostname?: string;
  [key: string]: any;
}

interface AnomalyDetailModalProps {
  anomaly: Anomaly | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AnomalyDetailModal({ 
  anomaly, 
  isOpen, 
  onClose 
}: AnomalyDetailModalProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch logs when the modal opens and anomaly changes
  useEffect(() => {
    const fetchLogs = async () => {
      if (!anomaly || !anomaly.log_ids || anomaly.log_ids.length === 0) {
        setLogs([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch logs by ID
        const response = await fetch(`/api/logs/by-id?ids=${anomaly.log_ids.join(',')}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }
        
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Failed to load log details');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && anomaly) {
      fetchLogs();
    }
  }, [isOpen, anomaly]);

  if (!anomaly) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <Info className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    level = level.toUpperCase();
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
      case 'FATAL':
        return 'text-red-600 bg-red-100';
      case 'WARNING':
      case 'WARN':
        return 'text-amber-600 bg-amber-100';
      case 'INFO':
        return 'text-blue-600 bg-blue-100';
      case 'DEBUG':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  const handleQueryClick = (query: string) => {
    // Navigate to the chat page with the query
    // We'll use URL parameters to pass the query and log IDs
    const params = new URLSearchParams();
    params.append('message', query);
    
    // Add the log IDs as context
    if (anomaly.log_ids && anomaly.log_ids.length > 0) {
      params.append('logIds', anomaly.log_ids.join(','));
    }

    // Navigate to the chat page
    // Using push instead of replace to ensure a clean navigation
    router.push(`/log-chat?${params.toString()}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getSeverityIcon(anomaly.severity)}
            <DialogTitle>{anomaly.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {anomaly.problem}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2">Business Impact</h3>
              <p className="text-sm text-gray-600">{anomaly.business_impact}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2">Evidence</h3>
              <p className="text-sm text-gray-600">{anomaly.evidence}</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Evidence Logs ({logs.length} of {anomaly.log_ids.length})</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-600">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-600">
              No logs available for this anomaly.
            </div>
          ) : (
            <div className="space-y-3 rounded-md border p-2 bg-gray-50">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-3 rounded text-sm overflow-hidden bg-white border ${
                    log.level?.toUpperCase() === 'ERROR' || log.level?.toUpperCase() === 'CRITICAL'
                      ? 'border-red-200' 
                      : log.level?.toUpperCase() === 'WARNING' || log.level?.toUpperCase() === 'WARN'
                        ? 'border-amber-200' 
                        : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`px-1.5 py-0.5 rounded text-xs ${getLogLevelColor(log.level || 'INFO')}`}
                        >
                          {log.level?.toUpperCase() || 'INFO'}
                        </span>
                        <span className="text-gray-500 text-xs">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleLogExpand(log.id)}
                      >
                        {expandedLogId === log.id ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up">
                            <path d="m18 15-6-6-6 6"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        )}
                      </Button>
                    </div>
                    <div className="font-medium">{log.message}</div>
                    {(log.service || log.hostname) && (
                      <div className="mt-1 text-xs text-gray-500">
                        {log.service && <span className="mr-3">Service: {log.service}</span>}
                        {log.hostname && <span>Host: {log.hostname}</span>}
                      </div>
                    )}
                    {expandedLogId === log.id && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-md overflow-x-auto">
                        <pre className="text-xs text-gray-700">{formatJson(log)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-3">Example Queries</h3>
          <div className="space-y-2">
            {anomaly.example_queries.map((query, index) => (
              <Button 
                key={index}
                variant="outline" 
                className="w-full justify-between text-left font-normal h-auto py-3"
                onClick={() => handleQueryClick(query)}
              >
                <span>{query}</span>
                <div className="flex items-center text-blue-600">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  <ExternalLink className="h-4 w-4" />
                </div>
              </Button>
            ))}
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
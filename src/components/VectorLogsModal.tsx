'use client';

import { useEffect, useState } from 'react';
import { Card } from './card';
import { ScrollArea } from './scroll-area';
import { Search, Clock } from 'lucide-react';
import { Input } from './input';

interface VectorLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  timestamp: string;
  content: string;
  raw: string;
}

const VectorLogsModal = ({ isOpen, onClose }: VectorLogsModalProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/vector/logs')
        .then(res => res.json())
        .then(data => {
          // Split logs into individual entries and filter out empty lines
          const logEntries = data.logs
            .split('\n')
            .filter(Boolean)
            .map((log: string) => {
              // Try to extract timestamp from the log line
              const timestampMatch = log.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
              const timestamp = timestampMatch ? timestampMatch[0] : '';
              const content = timestamp ? log.substring(timestamp.length).trim() : log;
              
              return {
                timestamp,
                content,
                raw: log
              };
            });
          setLogs(logEntries);
        })
        .catch(err => {
          setLogs([{
            timestamp: new Date().toISOString(),
            content: `Failed to fetch Vector logs: ${err.message}`,
            raw: `Failed to fetch Vector logs: ${err.message}`
          }]);
        });
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(log => 
    log.raw.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <Card className="w-[90vw] max-w-4xl h-[80vh] flex flex-col bg-white shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b shrink-0">
          <h2 className="text-xl font-semibold">Internal Docker Logs</h2>
          <button 
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {searchTerm ? 'No matching logs found' : 'No logs available'}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border bg-gray-50 font-mono text-sm"
                >
                  {log.timestamp && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  )}
                  <div className="max-w-full overflow-x-auto">
                    <div className="whitespace-pre-wrap break-all text-gray-800">
                      {log.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default VectorLogsModal; 
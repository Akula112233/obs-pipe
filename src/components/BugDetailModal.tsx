import React, { useState } from 'react';
import { X, AlertTriangle, Clock, Database, HardDrive, RefreshCw, MessageSquare, Send, X as XIcon, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/dialog';
import { Card, CardContent } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { CodeBlock } from '@/components/CodeBlock';
import { Button } from '@/components/button';
import { ScrollArea } from '@/components/scroll-area';
import { Input } from '@/components/input';
import Image from 'next/image';

export interface BugInstance {
  id: string;
  title: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'race-condition' | 'memory-leak' | 'deadlock' | 'data-corruption' | 'performance';
  impactedServices: string[];
  detectedAt: string;
  occurrences: number;
  logs: {
    timestamp: string;
    level: string;
    message: string;
    service?: string;
    userId?: string;
    requestId?: string;
    sessionId?: string;
    throughput?: string | number;
    [key: string]: any;
  }[];
  explanation: string;
  suggestedFix?: string;
  relatedErrors?: string[];
}

interface BugDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bug: BugInstance | null;
}

export default function BugDetailModal({ 
  isOpen, 
  onClose, 
  bug 
}: BugDetailModalProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);

  if (!bug) return null;

  const getBugTypeIcon = (type: string) => {
    switch (type) {
      case 'race-condition':
        return <RefreshCw className="h-5 w-5 text-red-500" />;
      case 'memory-leak':
        return <HardDrive className="h-5 w-5 text-amber-500" />;
      case 'deadlock':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'data-corruption':
        return <Database className="h-5 w-5 text-red-500" />;
      case 'performance':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const formatLogTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    
    // Add user message to chat
    setChatHistory([...chatHistory, { role: 'user', content: chatMessage }]);
    
    // Clear input
    setChatMessage('');
    
    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
      let response = '';
      
      if (chatMessage.toLowerCase().includes('why') || chatMessage.toLowerCase().includes('how')) {
        response = `Based on the logs, this appears to be a ${bug.type} where multiple thread operations aren't properly synchronized. The key issue is that the user's session state is being modified concurrently by different services without proper locking mechanisms.`;
      } else if (chatMessage.toLowerCase().includes('fix') || chatMessage.toLowerCase().includes('solve')) {
        response = `To fix this issue, I recommend implementing proper locking around the session state updates. You could use distributed locks with Redis or implement optimistic concurrency control with version numbers in your database operations.`;
      } else if (chatMessage.toLowerCase().includes('impact') || chatMessage.toLowerCase().includes('affect')) {
        response = `This bug is impacting approximately 2.3% of user sessions during high traffic periods. It primarily affects users who are performing multiple operations in rapid succession, such as updating cart items while processing a payment.`;
      } else {
        response = `I've analyzed the logs further and found that this ${bug.type} occurs mainly during periods of high traffic (>1000 req/min). The issue is triggered when multiple services try to update the same user session simultaneously, leading to inconsistent state.`;
      }
      
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getBugTypeIcon(bug.type)}
            <DialogTitle>{bug.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {bug.summary}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2">Bug Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{bug.type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity:</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${getSeverityColor(bug.severity)}`}>
                    {bug.severity.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Detected:</span>
                  <span className="font-medium">{bug.detectedAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-2">Impact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Occurrences:</span>
                  <span className="font-medium">{bug.occurrences} times</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services:</span>
                  <span className="font-medium">{bug.impactedServices.join(', ')}</span>
                </div>
                {bug.relatedErrors && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Related errors:</span>
                    <span className="font-medium">{bug.relatedErrors.length}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="logs" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="logs">Evidence Logs</TabsTrigger>
            <TabsTrigger value="explanation">Analysis</TabsTrigger>
            <TabsTrigger value="chat">Investigate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Log Sequence Evidence</h3>
                <div className="space-y-3 rounded-md border p-2 bg-slate-50">
                  {bug.logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded text-sm font-mono overflow-x-auto bg-white border ${
                        log.level.toUpperCase() === 'ERROR' 
                          ? 'border-red-200' 
                          : log.level.toUpperCase() === 'WARN' 
                            ? 'border-amber-200' 
                            : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start">
                        <span className="text-slate-500 mr-2 font-normal">{formatLogTimestamp(log.timestamp)}</span>
                        <span 
                          className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                            log.level.toUpperCase() === 'ERROR' 
                              ? 'bg-red-100 text-red-700' 
                              : log.level.toUpperCase() === 'WARN' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                        <span>{log.message}</span>
                      </div>
                      {(log.userId || log.requestId || log.service || log.throughput) && (
                        <div className="mt-1 text-xs text-slate-500 pt-1 border-t border-dashed border-slate-200">
                          {log.service && <span className="mr-3">service: {log.service}</span>}
                          {log.userId && <span className="mr-3">user: {log.userId}</span>}
                          {log.requestId && <span className="mr-3">request: {log.requestId}</span>}
                          {log.sessionId && <span className="mr-3">session: {log.sessionId}</span>}
                          {log.throughput && <span className="ml-auto font-medium text-blue-600">throughput: {log.throughput}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="explanation">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Bug Analysis</h3>
                <p className="text-sm mb-4 whitespace-pre-line">{bug.explanation}</p>
                
                {bug.suggestedFix && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Suggested Fix</h3>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                      {bug.suggestedFix}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="chat">
            <Card>
              <CardContent className="p-4 space-y-4">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-slate-50">
                  <div className="space-y-4">
                    {/* Initial assistant message */}
                    <div className="flex items-start space-x-3">
                      <div className="h-8 w-8 relative flex-shrink-0 rounded-full overflow-hidden border border-slate-200">
                        <Image 
                          src="/sift-dev-icon.svg" 
                          alt="Sift Assistant" 
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                      <div className="bg-white p-3 rounded-md shadow-sm max-w-[80%] border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Sift Assistant</p>
                        <p className="text-sm">
                          I've identified a {bug.type.replace('-', ' ')} issue in the {bug.impactedServices.join(', ')} services. 
                          Summary: {bug.summary}
                          <br /><br />
                          What would you like to know about this issue?
                        </p>
                      </div>
                    </div>
                    
                    {/* Chat history */}
                    {chatHistory.map((message, index) => (
                      <div key={index} className={`flex items-start ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'assistant' && (
                          <div className="h-8 w-8 relative flex-shrink-0 rounded-full overflow-hidden border border-slate-200 mr-3">
                            <Image 
                              src="/sift-dev-icon.svg" 
                              alt="Sift Assistant" 
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        )}
                        <div className={`p-3 rounded-md shadow-sm max-w-[80%] ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border border-slate-200'
                        }`}>
                          {message.role === 'assistant' && (
                            <p className="text-xs text-slate-500 mb-1">Sift Assistant</p>
                          )}
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 ml-3">
                            <span className="text-xs font-bold">You</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Ask more about this issue..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="pr-24 focus-visible:ring-blue-500"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="absolute right-1 top-1 h-7 text-slate-400 hover:text-slate-600"
                      onClick={() => setChatMessage('')}
                    >
                      Clear
                    </Button>
                  </div>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSendMessage}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 
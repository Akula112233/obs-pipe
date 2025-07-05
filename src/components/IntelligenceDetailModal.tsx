import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, Settings, Code, Check, X as XIcon, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/dialog';
import { Card, CardContent } from '@/components/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { CodeBlock } from '@/components/CodeBlock';
import { Button } from '@/components/button';

export interface IntelligenceNotification {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: 'efficiency' | 'security' | 'reliability' | 'routing';
  volumeSavings: number; // percentage
  sizeReduction: number; // percentage
  detailedExplanation: string;
  sampleLogs?: string[];
  reducedLogs?: string[];
  suggestedConfig: string;
  before?: {
    count: number;
    size: string;
  };
  after?: {
    count: number;
    size: string;
  };
  configType?: string;
}

interface IntelligenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: IntelligenceNotification | null;
}

export default function IntelligenceDetailModal({ 
  isOpen, 
  onClose, 
  notification 
}: IntelligenceDetailModalProps) {
  if (!notification) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleApply = () => {
    // In a real app, this would apply the configuration
    alert('Configuration would be applied. This is a demo.');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getSeverityIcon(notification.severity)}
            <DialogTitle>{notification.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-500">
            {notification.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Volume Savings</p>
                <p className="text-2xl font-bold text-green-600">{notification.volumeSavings}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Size Reduction</p>
                <p className="text-2xl font-bold text-blue-600">{notification.sizeReduction}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Code className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {notification.before && notification.after && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <Card className="border-red-100">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Before Optimization</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Log count:</span>
                    <span className="font-medium">{notification.before.count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Log size:</span>
                    <span className="font-medium">{notification.before.size}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-100">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">After Optimization</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Log count:</span>
                    <span className="font-medium">{notification.after.count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Log size:</span>
                    <span className="font-medium">{notification.after.size}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <Tabs defaultValue="logs-comparison" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="logs-comparison">Logs Comparison</TabsTrigger>
            <TabsTrigger value="explanation">Explanation</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="explanation" className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm whitespace-pre-line">{notification.detailedExplanation}</p>
          </TabsContent>
          
          <TabsContent value="logs-comparison">
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-100 p-3 border-b">
                  <h3 className="font-medium text-gray-700">Before Transformation</h3>
                  <p className="text-xs text-gray-500 mt-1">Original logs before applying the transformation</p>
                </div>
                <div className="p-4 space-y-3 max-h-60 overflow-y-auto bg-gray-50">
                  {notification.sampleLogs && notification.sampleLogs.map((log, index) => (
                    <div key={index} className="bg-white p-3 rounded text-sm font-mono overflow-x-auto border border-gray-200 shadow-sm">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-center my-2">
                <div className="bg-blue-100 rounded-full p-2">
                  <ArrowDown className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              
              <div className="border rounded-md overflow-hidden border-green-200">
                <div className="bg-green-100 p-3 border-b border-green-200">
                  <h3 className="font-medium text-gray-700">After Transformation</h3>
                  <p className="text-xs text-gray-500 mt-1">Transformed logs after applying the optimization</p>
                </div>
                <div className="p-4 space-y-3 bg-green-50">
                  {notification.reducedLogs && notification.reducedLogs.map((log, index) => (
                    <div key={index} className="bg-white p-3 rounded text-sm font-mono overflow-x-auto border border-green-200 shadow-sm">
                      {log}
                    </div>
                  ))}
                  {!notification.reducedLogs && (
                    <p className="text-sm text-gray-500 p-4">No transformed logs sample available</p>
                  )}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
                <h4 className="font-medium text-blue-800 mb-2">Transformation Summary</h4>
                <p className="text-sm text-gray-600">
                  {notification.id === '1' 
                    ? `Multiple identical logs have been combined into a single log entry with a count field, reducing ${notification.volumeSavings}% of log volume.`
                    : notification.id === '2'
                    ? `Non-critical error logs are sampled at 25%, while critical errors are preserved at 100%, resulting in ${notification.volumeSavings}% log volume reduction.`
                    : notification.id === '4'
                    ? `Operational and error logs are routed to Splunk, while debug and development logs are sent to S3 cold storage, reducing Splunk costs by ${notification.volumeSavings}% while preserving all log data.`
                    : notification.volumeSavings < 0
                    ? `Preserves all logs from critical services that contain error information, leading to a ${Math.abs(notification.volumeSavings)}% increase in volume compared to current sampling, but capturing essential error data that was being lost.`
                    : `Selectively samples INFO logs at 40% from standard services, while preserving all logs from sensitive services that contain error information, resulting in ${notification.volumeSavings}% log volume reduction.`
                  }
                </p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="config">
            <CodeBlock
              code={notification.suggestedConfig}
              language={notification.configType || "yaml"}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              <XIcon className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            <Button onClick={handleApply}>
              <Check className="h-4 w-4 mr-2" />
              Apply Optimization
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
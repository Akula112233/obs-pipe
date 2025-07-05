import React from 'react';
import { AlertTriangle, Info, CheckCircle, ChevronRight, BarChart } from 'lucide-react';
import { Card, CardContent } from '@/components/card';
import { Badge } from '@/components/badge';
import { IntelligenceNotification } from './IntelligenceDetailModal';

interface IntelligenceNotificationListProps {
  notifications: IntelligenceNotification[];
  onSelectNotification: (notification: IntelligenceNotification) => void;
}

export default function IntelligenceNotificationList({
  notifications,
  onSelectNotification
}: IntelligenceNotificationListProps) {
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'efficiency':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Efficiency</Badge>;
      case 'security':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Security</Badge>;
      case 'reliability':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">Reliability</Badge>;
      case 'routing':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Routing</Badge>;
      default:
        return <Badge variant="secondary">General</Badge>;
    }
  };

  if (notifications.length === 0) {
    return (
      <Card className="bg-muted">
        <CardContent className="p-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground py-8">
            No optimization suggestions available yet. Start using your pipelines to receive personalized recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card 
          key={notification.id}
          className="hover:border-blue-200 cursor-pointer transition-all"
          onClick={() => onSelectNotification(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  {getSeverityIcon(notification.severity)}
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium">{notification.title}</h3>
                    {getSeverityBadge(notification.severity)}
                    {getCategoryBadge(notification.category)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{notification.description}</p>
                  
                  <div className="flex space-x-6 text-sm">
                    <div className="flex items-center">
                      <BarChart className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-gray-700">Volume Savings: </span>
                      <span className="font-medium text-green-600 ml-1">{notification.volumeSavings}%</span>
                    </div>
                    <div className="flex items-center">
                      <BarChart className="h-4 w-4 text-blue-500 mr-1" />
                      <span className="text-gray-700">Size Reduction: </span>
                      <span className="font-medium text-blue-600 ml-1">{notification.sizeReduction}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 
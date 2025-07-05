import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface Anomaly {
  id: string;
  title: string;
  problem: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  business_impact: string;
  log_count: number;
  log_ids: string[];
  evidence: string;
  example_queries: string[];
}

interface AnomalyCardProps {
  anomaly: Anomaly;
  onClick: (anomaly: Anomaly) => void;
}

export default function AnomalyCard({ anomaly, onClick }: AnomalyCardProps) {
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

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick(anomaly)}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {getSeverityIcon(anomaly.severity)}
          <CardTitle className="text-lg">{anomaly.title}</CardTitle>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(anomaly.severity)}`}>
          {anomaly.severity.toUpperCase()}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <p className="text-sm text-gray-600 mb-3">{anomaly.problem}</p>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Affected logs: {anomaly.log_count}</span>
          <span>Log IDs: {anomaly.log_ids.length}</span>
        </div>
      </CardContent>
    </Card>
  );
} 
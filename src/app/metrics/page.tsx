'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/card';
import { Alert, AlertDescription } from '../../components/alert';
import { Activity, AlertTriangle, Waves } from 'lucide-react';

interface ComponentMetrics {
  eventsInTotal: number;
  eventsOutTotal: number;
  bytesInTotal: number;
  bytesOutTotal: number;
  componentType: string;
  componentName: string;
  timeoutTotal: number;
  errorTotal: number;
}

interface Component {
  metrics: ComponentMetrics;
}

interface ProcessedMetric {
  timestamp: number;
  eventsIn: number;
  eventsOut: number;
  bytesIn: number;
  bytesOut: number;
  errors: number;
}

interface MetricCardProps {
  title: string;
  value: number | undefined;
  subValue?: number;
  icon?: React.ReactNode;
  format: (n: number | undefined) => string;
}

export default function MetricsPage() {
  const [metricsData, setMetricsData] = useState<ProcessedMetric[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<ProcessedMetric | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const processMetrics = (components: Component[]): ProcessedMetric => {
    console.log('Processing components:', components);
    const timestamp = Date.now();
    return components.reduce((acc: ProcessedMetric, component) => ({
      timestamp,
      eventsIn: (acc.eventsIn || 0) + (component.metrics?.eventsInTotal || 0),
      eventsOut: (acc.eventsOut || 0) + (component.metrics?.eventsOutTotal || 0),
      bytesIn: (acc.bytesIn || 0) + (component.metrics?.bytesInTotal || 0),
      bytesOut: (acc.bytesOut || 0) + (component.metrics?.bytesOutTotal || 0),
      errors: (acc.errors || 0) + (component.metrics?.errorTotal || 0)
    }), { timestamp: 0, eventsIn: 0, eventsOut: 0, bytesIn: 0, bytesOut: 0, errors: 0 });
  };

  useEffect(() => {
    async function loadOrgId() {
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.isAuthenticated && data.orgId) {
            setOrgId(data.orgId);
          } else {
            setError('You must be logged in to view metrics');
          }
        } else {
          setError('Failed to load authentication status');
        }
      } catch (error) {
        console.error('Failed to fetch authentication status:', error);
        setError('Failed to load authentication status');
      }
    }

    async function fetchMetrics() {
      try {
        if (!orgId) return; // Don't fetch metrics if we don't have an orgId
        
        const response = await fetch(`http://vector-${orgId}:8686/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetMetrics {
                components {
                  metrics {
                    eventsInTotal
                    eventsOutTotal
                    bytesInTotal
                    bytesOutTotal
                    componentType
                    componentName
                    timeoutTotal
                    errorTotal
                  }
                }
              }
            `
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch metrics');
        const data = await response.json();
        console.log('Received data:', data);
        
        if (data.errors) {
          throw new Error(data.errors[0].message);
        }

        const metrics = processMetrics(data.data.components);
        console.log('Processed metrics:', metrics);
        setCurrentMetrics(metrics);
        setMetricsData(prev => [...prev, metrics].slice(-20));
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    }

    loadOrgId();
    
    // Set up interval for fetching metrics
    const intervalId = setInterval(fetchMetrics, 1000);

    // Initial fetch
    fetchMetrics();

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [orgId]);

  const formatBytes = (bytes: number | undefined): string => {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  console.log('Current render state:', { isLoading, error, currentMetrics, metricsData });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">Loading metrics...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pipeline Metrics</h1>
        {error && (
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Events"
          value={currentMetrics?.eventsIn}
          subValue={currentMetrics?.eventsOut}
          icon={<Activity />}
          format={n => n?.toLocaleString() ?? '0'}
        />
        <MetricCard
          title="Throughput"
          value={currentMetrics?.bytesIn}
          subValue={currentMetrics?.bytesOut}
          icon={<Waves />}
          format={formatBytes}
        />
        <MetricCard
          title="Errors"
          value={currentMetrics?.errors}
          icon={<AlertTriangle />}
          format={n => n?.toLocaleString() ?? '0'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Real-time Pipeline Metrics</CardTitle>
          <CardDescription>Live monitoring of events and throughput</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['auto', 'auto']}
                  tickFormatter={ts => new Date(ts).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={ts => new Date(ts).toLocaleTimeString()}
                />
                <Legend />
                <Line type="monotone" dataKey="eventsIn" stroke="#8884d8" name="Events In" />
                <Line type="monotone" dataKey="eventsOut" stroke="#82ca9d" name="Events Out" />
                <Line type="monotone" dataKey="errors" stroke="#ff0000" name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const MetricCard = ({ title, value, subValue, icon, format }: MetricCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{format(value)}</div>
      {subValue !== undefined && (
        <p className="text-xs text-muted-foreground">
          {format(subValue)} out
        </p>
      )}
    </CardContent>
  </Card>
);
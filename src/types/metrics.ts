// app/types/metrics.ts

export interface ComponentMetric {
  eventsInTotal: number;
  eventsOutTotal: number;
  bytesInTotal: number;
  bytesOutTotal: number;
  componentType: string;
  componentName: string;
  timeoutTotal: number;
  errorTotal: number;
}

export interface ProcessedMetric {
  timestamp: number;
  eventsIn: number;
  eventsOut: number;
  bytesIn: number;
  bytesOut: number;
  errors: number;
}
  
export interface MetricCardProps {
  title: string;
  value: number | undefined;
  subValue?: number;
  icon?: React.ReactNode;
  format: (n: number | undefined) => string;
}



export interface MetricData {
  timestamp: Date;
  value: number;
}

export interface SourceMetrics {
  receivedBytesTotal: MetricData;
  receivedEventsTotal: MetricData;
  sentEventsTotal: MetricData;
}

export interface TransformMetrics {
  receivedEventsTotal: MetricData;
  sentEventsTotal: MetricData;
}

export interface SinkMetrics {
  receivedEventsTotal: MetricData;
  sentBytesTotal: MetricData;
    sentEventsTotal: MetricData;
  }

export interface ComponentCardProps {
  title: string;
  metrics: SourceMetrics | TransformMetrics | SinkMetrics;
  type: 'source' | 'transform' | 'sink';
}
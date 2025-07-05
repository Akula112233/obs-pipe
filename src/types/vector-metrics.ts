export interface ComponentMetrics {
  receivedBytesTotal?: { value: number; timestamp: Date };
  receivedEventsTotal?: { value: number; timestamp: Date };
  sentBytesTotal?: { value: number; timestamp: Date };
  sentEventsTotal?: { value: number; timestamp: Date };
}

export interface VectorComponentConfig {
  type: string;
  [key: string]: any;
}

export interface MetricsResponse {
  data: {
    sources: {
      edges: Array<{
        node: {
          componentId: string;
          metrics: {
            receivedBytesTotal?: { receivedBytesTotal: number };
            receivedEventsTotal?: { receivedEventsTotal: number };
            sentEventsTotal?: { sentEventsTotal: number };
          };
        };
      }>;
    };
    transforms: {
      edges: Array<{
        node: {
          componentId: string;
          metrics: {
            receivedEventsTotal?: { receivedEventsTotal: number };
            sentEventsTotal?: { sentEventsTotal: number };
          };
        };
      }>;
    };
    sinks: {
      edges: Array<{
        node: {
          componentId: string;
          metrics: {
            receivedEventsTotal?: { receivedEventsTotal: number };
            sentBytesTotal?: { sentBytesTotal: number };
            sentEventsTotal?: { sentEventsTotal: number };
          };
        };
      }>;
    };
  };
} 
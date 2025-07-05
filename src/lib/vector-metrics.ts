import { ComponentMetrics, MetricsResponse } from '@/types/vector-metrics';

export const METRICS_QUERY = `
  query GetMetrics {
    sinks {
      edges {
        node {
          componentId
          metrics {
            ... on GenericSinkMetrics {
              receivedEventsTotal {
                receivedEventsTotal
              }
              sentBytesTotal {
                sentBytesTotal
              }
              sentEventsTotal {
                sentEventsTotal
              }
            }
          }
        }
      }
    }
    sources {
      edges {
        node {
          componentId
          metrics {
            ... on GenericSourceMetrics {
              receivedBytesTotal {
                receivedBytesTotal
              }
              receivedEventsTotal {
                receivedEventsTotal
              }
              sentEventsTotal {
                sentEventsTotal
              }
            }
          }
        }
      }
    }
    transforms {
      edges {
        node {
          componentId
          metrics {
            ... on GenericTransformMetrics {
              receivedEventsTotal {
                receivedEventsTotal
              }
              sentEventsTotal {
                sentEventsTotal
              }
            }
          }
        }
      }
    }
  }
`;

export function processMetrics(data: MetricsResponse): Record<string, ComponentMetrics> {
  const newMetrics: Record<string, ComponentMetrics> = {};
  
  // Process Sources
  data.data.sources.edges.forEach(({ node }) => {
    const metrics = node.metrics;
    newMetrics[node.componentId] = {
      receivedBytesTotal: {
        value: metrics.receivedBytesTotal?.receivedBytesTotal || 0,
        timestamp: new Date()
      },
      receivedEventsTotal: {
        value: metrics.receivedEventsTotal?.receivedEventsTotal || 0,
        timestamp: new Date()
      },
      sentEventsTotal: {
        value: metrics.sentEventsTotal?.sentEventsTotal || 0,
        timestamp: new Date()
      }
    };
  });

  // Process Transforms
  data.data.transforms.edges.forEach(({ node }) => {
    const metrics = node.metrics;
    newMetrics[node.componentId] = {
      receivedEventsTotal: {
        value: metrics.receivedEventsTotal?.receivedEventsTotal || 0,
        timestamp: new Date()
      },
      sentEventsTotal: {
        value: metrics.sentEventsTotal?.sentEventsTotal || 0,
        timestamp: new Date()
      }
    };
  });

  // Process Sinks - filter out internal sinks
  data.data.sinks.edges
    .filter(({ node }) => !['raw_logs', 'processed_logs'].includes(node.componentId))
    .forEach(({ node }) => {
      const metrics = node.metrics;
      newMetrics[node.componentId] = {
        receivedEventsTotal: {
          value: metrics.receivedEventsTotal?.receivedEventsTotal || 0,
          timestamp: new Date()
        },
        sentBytesTotal: {
          value: metrics.sentBytesTotal?.sentBytesTotal || 0,
          timestamp: new Date()
        },
        sentEventsTotal: {
          value: metrics.sentEventsTotal?.sentEventsTotal || 0,
          timestamp: new Date()
        }
      };
    });

  return newMetrics;
}

export async function fetchVectorMetrics(): Promise<Record<string, ComponentMetrics>> {
  try {
    const response = await fetch('/api/vector/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: METRICS_QUERY }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Failed to fetch metrics: ${response.statusText}`);
    }

    const data = await response.json();
    return processMetrics(data);
  } catch (error: any) {
    console.error('Error in fetchVectorMetrics:', error);
    throw new Error(error.message || 'Failed to fetch metrics');
  }
} 
import yaml from 'js-yaml';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { envConfig } from './env-config';

export interface VectorConfig {
  vectors?: {
    enabled: boolean;
  };
  sources: Record<string, { type: string; [key: string]: any }>;
  transforms: Record<string, { type: string; [key: string]: any }>;
  sinks: Record<string, { type: string; [key: string]: any }>;
}

export async function getVectorConfig(): Promise<VectorConfig> {
  try {
    const response = await fetch('/api/vector/config');
    const data = await response.json();
    
    // Log the response data to help debug
    // console.log('Vector config response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch pipeline config');
    }

    if (!data.config) {
      console.warn('No config found in response, using default empty config');
      return {
        sources: {},
        transforms: {},
        sinks: {}
      };
    }

    return data.config;
  } catch (e) {
    console.error('Error loading pipeline config:', e);
    // Return empty config as fallback
    return {
      sources: {},
      transforms: {},
      sinks: {}
    };
  }
}

function createPreviewTransform(componentId: string, componentType: 'source' | 'sink', orgId: string) {
  return {
    type: 'remap',
    inputs: [componentId],
    source: `.siftdev_preview_component = "${componentId}"
.siftdev_preview_type = "${componentType}"
.siftdev_org_id = "${orgId}"
.timestamp = now()`,
  };
}

function createPreviewSink() {
  const host = 'shift-dev-worker';
  const port = '3000';

  return {
    type: 'http',
    uri: `http://${host}:${port}/api/vector/preview-logs`,
    method: 'post',
    encoding: {
      codec: 'json'
    },
    compression: 'none',
    batch: {
      max_bytes: 1049000,
      max_events: 10
    },
    request: {
      headers: {
        'Content-Type': 'application/json'
      }
    },
    healthcheck: {
      enabled: true
    }
  };
}

export function addPreviewCapabilities(config: VectorConfig, orgId: string): VectorConfig {
  const newConfig = { ...config };
  
  // Add preview sink that will receive all preview data
  if (!newConfig.sinks) newConfig.sinks = {};
  const previewSinkId = 'preview_sink';
  newConfig.sinks[previewSinkId] = createPreviewSink();
  newConfig.sinks[previewSinkId].inputs = []; // Initialize inputs array

  // Add preview capabilities to sources
  if (newConfig.sources) {
    Object.entries(newConfig.sources).forEach(([sourceId, source]) => {
      if (!newConfig.transforms) newConfig.transforms = {};
      const previewTransformId = `${sourceId}_preview`;
      
      // For OpenTelemetry sources, use sourceId.logs as input
      const sourceInput = source.type === 'opentelemetry' ? `${sourceId}.logs` : sourceId;
      
      newConfig.transforms[previewTransformId] = {
        ...createPreviewTransform(sourceId, 'source', orgId),
        inputs: [sourceInput]
      };
      
      // Add the preview transform as an input to the preview sink
      newConfig.sinks[previewSinkId].inputs.push(previewTransformId);
    });
  }

  // Add preview capabilities to sinks by monitoring their inputs
  if (newConfig.sinks) {
    Object.entries(newConfig.sinks).forEach(([sinkId, sink]) => {
      if (sinkId === previewSinkId) return; // Skip the preview sink itself
      
      if (!newConfig.transforms) newConfig.transforms = {};
      const previewTransformId = `${sinkId}_preview`;
      
      // Create a transform that takes the same inputs as the sink
      const sinkInputs = (sink as any).inputs || [];
      newConfig.transforms[previewTransformId] = {
        ...createPreviewTransform(sinkId, 'sink', orgId),
        inputs: [...sinkInputs]
      };
      
      // Add the preview transform as an input to the preview sink
      newConfig.sinks[previewSinkId].inputs.push(previewTransformId);
    });
  }

  return newConfig;
}
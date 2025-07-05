'use client';

import React, { useCallback, useEffect, useState, useRef, memo, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { Database, ArrowRightLeft, ArrowDownToLine, LayoutGrid, Rows, Maximize2, Minimize2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { VectorConfig } from '@/lib/config';

interface VectorGraphProps {
  config: VectorConfig | null;
  metrics: any;
  onSourceClick: (sourceId: string) => void;
  onSinkClick: (sinkId: string) => void;
  onTransformClick: () => void;
}

interface NodeData {
  label: string;
  type: string;
  metrics: any;
  prevMetrics?: any; // Add previous metrics for rate calculation
  icon: any;
  onClick: () => void;
}

interface MetricValue {
  value: number;
  timestamp: Date;
}

interface ComponentMetric {
  receivedEventsTotal?: MetricValue;
  sentEventsTotal?: MetricValue;
}

const CustomNode = memo(({ data }: { data: NodeData }) => {
  const Icon = data.icon;

  const calculateRate = (current: any, previous: any) => {
    if (!current || !previous) return 0;
    const currentValue = current.value || 0;
    const previousValue = previous.value || 0;
    const timeDiff = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000; // Convert to seconds
    if (timeDiff <= 0) return 0;
    return Math.round((currentValue - previousValue) / timeDiff);
  };

  return (
    <div>
      {[0, 1, 2].map((i) => (
        <React.Fragment key={`handle-${data.label}-${i}`}>
          <Handle
            key={`source-${data.label}-${i}`}
            type="source"
            position={Position.Right}
            id={`${data.label}-${i}`}
            style={{ 
              background: '#94a3b8',
              top: `${45 + i * 20}%`
            }}
          />
          <Handle
            key={`target-${data.label}-${i}`}
            type="target"
            position={Position.Left}
            id={`${data.label}-${i}`}
            style={{ 
              background: '#94a3b8',
              top: `${45 + i * 20}%`
            }}
          />
        </React.Fragment>
      ))}
      <Card 
        className="min-w-[300px] bg-white animate-in fade-in-50 duration-500 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          if (data.onClick) {
            data.onClick();
          }
        }}
      >
        <CardHeader className="flex flex-col space-y-1.5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-10 w-10 text-muted-foreground" />
              <CardTitle className="text-xl font-medium">{data.label}</CardTitle>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">{data.type}</p>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          {data.metrics?.receivedEventsTotal && (
            <div className="flex justify-between">
              <span className="text-lg text-muted-foreground">Received Events/s</span>
              <span className="text-lg">{calculateRate(data.metrics.receivedEventsTotal, data.prevMetrics?.receivedEventsTotal)}</span>
            </div>
          )}
          {data.metrics?.sentEventsTotal && (
            <div className="flex justify-between">
              <span className="text-lg text-muted-foreground">Sent Events/s</span>
              <span className="text-lg">{calculateRate(data.metrics.sentEventsTotal, data.prevMetrics?.sentEventsTotal)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
CustomNode.displayName = 'CustomNode';

const GroupNode = memo(({ data }: { data: { transforms: string[] } }) => {
  return (
    <div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#94a3b8' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#94a3b8' }}
      />
      <Card 
        className="min-w-[300px] bg-white/95 animate-in fade-in-50 duration-500 hover:shadow-lg transition-shadow cursor-pointer"
      >
        <CardHeader className="flex flex-row items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-10 w-10" />
            <CardTitle className="text-xl font-medium">Transform Group</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 p-3">
          {data.transforms.map((name) => (
            <div key={name} className="text-lg text-muted-foreground">{name}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
});
GroupNode.displayName = 'GroupNode';

// Move getLayoutedElements to module scope
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ 
    rankdir: 'LR',
    align: 'DL',
    nodesep: 50,
    ranksep: 150,
    edgesep: 30,
    marginx: 30,
    marginy: 30
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 450, height: node.type === 'group' ? 350 : 250 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - 225,
          y: nodeWithPosition.y - (node.type === 'group' ? 175 : 125)
        }
      };
    }),
    edges
  };
};

// Add these helper functions before the VectorGraph component
const getEdgeStyle = (sourceType: string, targetType: string, index: number = 0) => {
  const baseStyle = {
    strokeWidth: 2,
    stroke: '#94a3b8'
  };

  // Use different edge types for parallel edges
  const types = ['default', 'step', 'smoothstep'] as const;
  return {
    ...baseStyle,
    type: types[index % types.length]
  };
};

const createEdge = (source: string, target: string, sourceType: string, targetType: string, parallelIndex: number = 0) => {
  const style = getEdgeStyle(sourceType, targetType, parallelIndex);
  
  // Calculate offset for parallel edges
  const offset = parallelIndex * 20;
  
  return {
    id: `${source}-to-${target}-${parallelIndex}`,
    source,
    target,
    type: style.type,
    animated: true,
    style: { ...style },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: style.stroke,
    },
    sourceHandle: `${source}-${parallelIndex}`,
    targetHandle: `${target}-${parallelIndex}`,
    // Add different curvature for parallel edges
    data: { parallelIndex }
  };
};

export default function VectorGraph({ config: initialConfig, metrics, onSourceClick, onSinkClick, onTransformClick }: VectorGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isCompact, setIsCompact] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<{ type: 'source' | 'sink' | 'transform', name: string, metrics: any } | null>(null);
  const reactFlowInstance = useRef<any>(null);
  const [config, setConfig] = useState<VectorConfig | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<Record<string, ComponentMetric>>({});

  // Update local config when prop changes
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Track previous metrics
  useEffect(() => {
    setPrevMetrics(prev => {
      const newPrevMetrics = { ...prev };
      Object.entries(metrics).forEach(([key, value]) => {
        const metric = value as ComponentMetric;
        // Only update if we have new metrics and they're different from current
        if (metric && (!prev[key] || 
            metric.receivedEventsTotal?.value !== prev[key]?.receivedEventsTotal?.value ||
            metric.sentEventsTotal?.value !== prev[key]?.sentEventsTotal?.value)) {
          newPrevMetrics[key] = {
            receivedEventsTotal: metric.receivedEventsTotal ? {
              value: metric.receivedEventsTotal.value,
              timestamp: new Date(metric.receivedEventsTotal.timestamp)
            } : undefined,
            sentEventsTotal: metric.sentEventsTotal ? {
              value: metric.sentEventsTotal.value,
              timestamp: new Date(metric.sentEventsTotal.timestamp)
            } : undefined
          };
        }
      });
      return newPrevMetrics;
    });
  }, [metrics]);

  // Add effect to update selectedNode metrics when they change
  useEffect(() => {
    if (selectedNode && metrics[selectedNode.name]) {
      setSelectedNode(prev => ({
        ...prev!,
        metrics: metrics[selectedNode.name]
      }));
    }
  }, [metrics, selectedNode?.name]);

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
    group: GroupNode,
  }), []);

  const createExpandedLayout = useCallback(() => {
    if (!config) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Filter out internal sinks
    const filteredSinks = { ...config.sinks };
    delete filteredSinks.raw_logs;
    delete filteredSinks.processed_logs;
    
    // Add sources
    Object.entries(config.sources || {}).forEach(([name, conf]: [string, any]) => {
      newNodes.push({
        id: name,
        data: {
          label: name,
          type: conf.type,
          metrics: metrics[name],
          prevMetrics: prevMetrics[name],
          icon: Database,
          onClick: () => onSourceClick(name)
        },
        type: 'custom',
        position: { x: 0, y: 0 }
      });
    });

    // Add all transforms individually
    Object.entries(config.transforms || {}).forEach(([name, conf]: [string, any]) => {
      newNodes.push({
        id: name,
        data: {
          label: name,
          type: conf.type,
          metrics: metrics[name],
          prevMetrics: prevMetrics[name],
          icon: ArrowRightLeft,
          onClick: () => onTransformClick()
        },
        type: 'custom',
        position: { x: 0, y: 0 }
      });

      // Add edges from inputs
      conf.inputs?.forEach((input: string) => {
        const [baseName, routeOutput] = input.split('.');
        const sourceType = config.sources[baseName] ? 'source' : 'transform';
        newEdges.push(createEdge(
          baseName,
          name,
          sourceType,
          'transform'
        ));
      });
    });

    // Add sinks
    Object.entries(filteredSinks).forEach(([name, conf]: [string, any]) => {
      newNodes.push({
        id: name,
        data: {
          label: name,
          type: conf.type,
          metrics: metrics[name],
          prevMetrics: prevMetrics[name],
          icon: ArrowDownToLine,
          onClick: () => onSinkClick(name)
        },
        type: 'custom',
        position: { x: 0, y: 0 }
      });

      // Add edges from inputs
      conf.inputs?.forEach((input: string) => {
        const [baseName, routeOutput] = input.split('.');
        newEdges.push(createEdge(
          baseName,
          name,
          'transform',
          'sink'
        ));
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [config, metrics, prevMetrics, setNodes, setEdges, onSourceClick, onSinkClick, onTransformClick]);

  const createGraphLayout = useCallback(() => {
    if (!config) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Filter out internal sinks
    const filteredSinks = { ...config.sinks };
    delete filteredSinks.raw_logs;
    delete filteredSinks.processed_logs;

    // Create a map of transform chains
    const transformChains: { [key: string]: string[] } = {};
    const processedTransforms = new Set<string>();

    // Helper to find all outputs (transforms and sinks) for a given transform
    const findOutputs = (transformName: string) => {
      const outputs: string[] = [];
      
      // Check transforms that take this as input
      Object.entries(config.transforms || {}).forEach(([name, conf]: [string, any]) => {
        if (conf.inputs?.some((input: string) => {
          // Handle both direct matches and dot notation (e.g., "route_by_severity.critical")
          return input === transformName || input.split('.')[0] === transformName;
        })) {
          outputs.push(name);
        }
      });
      
      // Check sinks that take this as input
      Object.entries(filteredSinks || {}).forEach(([name, conf]: [string, any]) => {
        if (conf.inputs?.some((input: string) => {
          // Handle both direct matches and dot notation
          return input === transformName || input.split('.')[0] === transformName;
        })) {
          outputs.push(name);
        }
      });
      
      return outputs;
    };

    // Helper to find all downstream transforms
    const findDownstreamTransforms = (startTransform: string): string[] => {
      const chain = [startTransform];
      processedTransforms.add(startTransform);

      const findNext = (current: string) => {
        const outputs = findOutputs(current);
        const nextTransforms = outputs.filter(output => config.transforms[output]);
        
        // Only continue if there's exactly one next transform and no sinks
        if (nextTransforms.length === 1 && outputs.length === nextTransforms.length) {
          const nextTransform = nextTransforms[0];
          // Only add to chain if the next transform has only this transform as input
          const nextInputs = config.transforms[nextTransform].inputs || [];
          if (nextInputs.length === 1 && !processedTransforms.has(nextTransform)) {
            chain.push(nextTransform);
            processedTransforms.add(nextTransform);
            findNext(nextTransform);
          }
        }
      };

      findNext(startTransform);
      return chain;
    };

    // Build transform chains starting only from source outputs
    Object.entries(config.transforms || {}).forEach(([name, conf]: [string, any]) => {
      if (!processedTransforms.has(name) && 
          conf.inputs?.every((input: string) => config.sources?.[input]) &&
          conf.inputs?.length === 1) {  // Only start chains from transforms with single inputs
        transformChains[name] = findDownstreamTransforms(name);
      }
    });

    // Add sources
    Object.entries(config.sources || {}).forEach(([name, conf]: [string, any]) => {
      newNodes.push({
        id: name,
        data: {
          label: name,
          type: conf.type,
          metrics: metrics[name],
          prevMetrics: prevMetrics[name],
          icon: Database,
          onClick: () => onSourceClick(name)
        },
        type: 'custom',
        position: { x: 0, y: 0 }
      });
    });

    // Add transform chains and remaining transforms
    const addedTransforms = new Set<string>();

    // First add the chains
    Object.entries(transformChains).forEach(([_, chain]) => {
      if (chain.length > 1) {
        const groupId = `group-${chain.join('-')}`;
        newNodes.push({
          id: groupId,
          data: {
            transforms: chain
          },
          type: 'group',
          position: { x: 0, y: 0 }
        });

        // Add edges from sources to group
        const firstTransform = chain[0];
        const inputs = config.transforms[firstTransform].inputs || [];
        inputs.forEach((input: string) => {
          newEdges.push(createEdge(
            input,
            groupId,
            'source',
            'transform'
          ));
        });

        chain.forEach(transformName => addedTransforms.add(transformName));
      }
    });

    // Then add remaining transforms
    Object.entries(config.transforms || {}).forEach(([name, conf]: [string, any]) => {
      if (!addedTransforms.has(name)) {
        newNodes.push({
          id: name,
          data: {
            label: name,
            type: conf.type,
            metrics: metrics[name],
            prevMetrics: prevMetrics[name],
            icon: ArrowRightLeft,
            onClick: () => onTransformClick()
          },
          type: 'custom',
          position: { x: 0, y: 0 }
        });

        // Add edges from inputs
        conf.inputs?.forEach((input: string) => {
          const [baseName, routeOutput] = input.split('.');
          const sourceChain = Object.entries(transformChains).find(([_, chain]) => 
            chain.length > 1 && chain[chain.length - 1] === baseName
          );

          if (sourceChain) {
            const groupId = `group-${sourceChain[1].join('-')}`;
            newEdges.push(createEdge(
              groupId,
              name,
              'transform',
              'transform'
            ));
          } else {
            const sourceType = config.sources[baseName] ? 'source' : 'transform';
            newEdges.push(createEdge(
              baseName,
              name,
              sourceType,
              'transform'
            ));
          }
        });
      }
    });

    // Add sinks
    Object.entries(filteredSinks).forEach(([name, conf]: [string, any]) => {
      newNodes.push({
        id: name,
        data: {
          label: name,
          type: conf.type,
          metrics: metrics[name],
          prevMetrics: prevMetrics[name],
          icon: ArrowDownToLine,
          onClick: () => onSinkClick(name)
        },
        type: 'custom',
        position: { x: 0, y: 0 }
      });

      // Add edges from transforms to sinks
      conf.inputs?.forEach((input: string) => {
        const [baseName, routeOutput] = input.split('.');
        const sourceChain = Object.entries(transformChains).find(([_, chain]) => 
          chain.length > 1 && chain[chain.length - 1] === baseName
        );

        if (sourceChain) {
          const groupId = `group-${sourceChain[1].join('-')}`;
          newEdges.push(createEdge(
            groupId,
            name,
            'transform',
            'sink'
          ));
        } else {
          newEdges.push(createEdge(
            baseName,
            name,
            'transform',
            'sink'
          ));
        }
      });
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [config, metrics, setNodes, setEdges, onSourceClick, onSinkClick, onTransformClick]);

  // Effect for layout updates
  useEffect(() => {
    if (config) {
      if (isCompact) {
        createGraphLayout();
      } else {
        createExpandedLayout();
      }
    }
  }, [isCompact, createGraphLayout, createExpandedLayout, config]);

  // Separate effect for centering, only runs on view mode change and initialization
  useEffect(() => {
    // Add a small delay to ensure the nodes are updated
    const timer = setTimeout(() => {
      reactFlowInstance.current?.fitView({ padding: 0.2 });
    }, 50);

    return () => clearTimeout(timer);
  }, [isCompact, isFullScreen]); // isCompact already handles view mode changes

  return (
    <div className={`flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 bg-background' : 'h-[80vh]'} w-full bg-background rounded-lg border`}>
      {!initialConfig ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-500">Loading pipeline configuration...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 p-4 border-b">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCompact(!isCompact)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
              >
                {isCompact ? <Rows className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                {isCompact ? 'Expanded View' : 'Compact View'}
              </button>
            </div>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors"
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>
          </div>
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              attributionPosition="bottom-left"
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={true}
              selectNodesOnDrag={false}
              zoomOnScroll={false}
              panOnDrag={true}
              panOnScroll={true}
              onInit={(instance) => { reactFlowInstance.current = instance; }}
            >
              <Background />
              <Controls 
                showInteractive={false}
                showZoom={false}
                showFitView={true}
              />
            </ReactFlow>
          </div>
        </>
      )}
    </div>
  );
} 
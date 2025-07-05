'use client';

import { useEffect, useState, useRef } from 'react';
import { getVectorConfig, VectorConfig } from '@/lib/config';
import { fetchVectorMetrics } from '@/lib/vector-metrics';
import { ComponentMetrics } from '@/types/vector-metrics';
import LogModal from '../../components/LogModal';
import VectorGraph from '../../components/VectorGraph';
import VectorLogsModal from '../../components/VectorLogsModal';
import Header from '../../components/Header';
import IntegrationOptionsModal from '@/components/IntegrationOptionsModal';
import { Button } from '@/components/button';
import { PlusCircle, Info } from 'lucide-react';

export default function Home() {
  const [vectorConfig, setVectorConfig] = useState<VectorConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, ComponentMetrics>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<{ id: string; type: 'source' | 'sink' } | null>(null);
  const [isVectorRunning, setIsVectorRunning] = useState(false);
  const [dockerLogsOpen, setDockerLogsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  
  // Show integration modal when page loads 
  useEffect(() => {
    // Check if we've shown the modal before using sessionStorage
    const hasShownModal = sessionStorage.getItem('hasShownIntegrationModal');
    if (!hasShownModal) {
      // Wait a moment before showing the modal to prevent it appearing during page transition
      const timer = setTimeout(() => {
        setShowIntegrationModal(true);
        sessionStorage.setItem('hasShownIntegrationModal', 'true');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Combined initialization effect
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setConfigLoading(true);
        setIsInitializing(true);

        // First check vector status
        const statusResult = await fetch('/api/vector/status', { method: 'POST' });
        const statusData = await statusResult.json();
        
        if (!isMounted) return;
        
        setIsVectorRunning(statusData.isRunning);

        // Then get vector config
        const config = await getVectorConfig();
        
        if (!isMounted) return;
        
        // console.log('Vector config loaded:', config);
        setVectorConfig(config);
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setError('Failed to initialize');
        }
      } finally {
        if (isMounted) {
          setConfigLoading(false);
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Metrics effect - only run when not initializing
  useEffect(() => {
    if (isInitializing) return;

    const updateMetrics = async () => {
      try {
        const vectorsEnabled = vectorConfig?.vectors?.enabled ?? true;

        if (!isVectorRunning || !vectorsEnabled) {
          setMetrics({});
          return;
        }

        const newMetrics = await fetchVectorMetrics();
        setMetrics(newMetrics);
      } catch (err: any) {
        console.error('Error fetching metrics:', err);
        setError('Failed to fetch metrics');
      }
    };

    let interval: NodeJS.Timeout | null = null;
    if (isVectorRunning) {
      interval = setInterval(updateMetrics, 1000);
      updateMetrics(); // Initial fetch
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [vectorConfig, isVectorRunning, isInitializing]);

  const toggleVector = async (action: 'start' | 'stop') => {
    try {
      setError(null);
      if (action === 'start') {
        setIsStarting(true);
      } else {
        setIsStopping(true);
        setIsVectorRunning(false);
        setMetrics({});
      }

      const response = await fetch(`/api/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Failed to ${action} Pipeline`);

      // Wait a moment for Vector to fully start/stop
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check status multiple times for start action
      if (action === 'start') {
        let retries = 3;
        while (retries > 0) {
          try {
            const statusResponse = await fetch('/api/vector/status', { method: 'POST' });
            const statusData = await statusResponse.json();
            if (statusData.isRunning) {
              setIsVectorRunning(true);
              setIsStarting(false);
              break;
            }
          } catch (err) {
            console.error('Error checking status:', err);
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (retries === 0) {
          throw new Error('Pipeline failed to start');
        }
      } else {
        setIsStopping(false);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing pipeline:`, error);
      setError(`Failed to ${action} pipeline: ${error.message}`);
      setIsStarting(false);
      setIsStopping(false);
    }
  };

  // Handler functions for VectorGraph
  const handleSourceClick = (sourceId: string) => {
    setSelectedComponent({ id: sourceId, type: 'source' });
    setLogsOpen(true);
  };

  const handleSinkClick = (sinkId: string) => {
    setSelectedComponent({ id: sinkId, type: 'sink' });
    setLogsOpen(true);
  };

  const handleTransformClick = () => {
    setSelectedComponent(null);
    setLogsOpen(true);
  };

  return (
    <div className="page-container flex flex-col h-screen">
      <Header
        isVectorRunning={isVectorRunning}
        isStarting={isStarting}
        isStopping={isStopping}
        onToggleVector={toggleVector}
        onOpenLogs={() => setLogsOpen(true)}
        onOpenDockerLogs={() => setDockerLogsOpen(true)}
        config={vectorConfig || undefined}
      />

      {/* Integration Prompt Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-4 mb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 text-blue-600 dark:text-blue-400">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-300">Multiple ways to send data</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Connect via our SDK or integrate with your existing logging solutions
              </p>
            </div>
          </div>
          <Button 
            className="shrink-0"
            onClick={() => setShowIntegrationModal(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Connect data source
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
          <h3 className="text-red-800 dark:text-red-400 font-medium">Error</h3>
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Make the graph container take up remaining height */}
      {!configLoading && vectorConfig && (
        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
          <VectorGraph
            config={vectorConfig}
            metrics={metrics}
            onSourceClick={handleSourceClick}
            onSinkClick={handleSinkClick}
            onTransformClick={handleTransformClick}
          />
        </div>
      )}

      {configLoading && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary m-auto"></div>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      )}

      {selectedComponent && (
        <LogModal
          isOpen={logsOpen}
          onClose={() => {
            setLogsOpen(false);
            setSelectedComponent(null);
          }}
          componentId={selectedComponent.id}
          componentType={selectedComponent.type}
          title="Logs Preview"
          isVectorRunning={isVectorRunning}
          config={vectorConfig || undefined}
        />
      )}

      {!selectedComponent && (
        <LogModal
          isOpen={logsOpen}
          onClose={() => setLogsOpen(false)}
          title="Live Logs"
          isVectorRunning={isVectorRunning}
          config={vectorConfig || undefined}
        />
      )}

      <VectorLogsModal
        isOpen={dockerLogsOpen}
        onClose={() => setDockerLogsOpen(false)}
      />
      
      <IntegrationOptionsModal
        isOpen={showIntegrationModal}
        onClose={() => setShowIntegrationModal(false)}
      />
    </div>
  );
}
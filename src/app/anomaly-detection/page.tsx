'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
import { AlertTriangle } from 'lucide-react';
import AnomalyCard, { Anomaly } from '@/components/AnomalyCard';
import AnomalyDetailModal from '@/components/AnomalyDetailModal';

export default function AnomalyDetection() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/anomalies');
        
        if (!response.ok) {
          throw new Error('Failed to fetch anomalies');
        }
        
        const data = await response.json();
        setAnomalies(data.anomalies);
        setMetadata(data.metadata);
        setError(null);
      } catch (err) {
        console.error('Error fetching anomalies:', err);
        setError('An error occurred while fetching anomalies. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnomalies();
  }, []);

  const handleSelectAnomaly = (anomaly: Anomaly) => {
    setSelectedAnomaly(anomaly);
  };

  const handleCloseModal = () => {
    setSelectedAnomaly(null);
  };

  return (
    <div className="page-container">
      <div className="page-header mb-6">
        <h1 className="page-title">Anomaly Detection</h1>
        <p className="page-description text-gray-600">
          Detect and analyze system anomalies and issues across your infrastructure
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <Card className="border-red-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-medium">Error</h3>
            </div>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {metadata && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>System Status Overview</CardTitle>
                <CardDescription>
                  {metadata.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Total Issues</p>
                    <p className="text-2xl font-bold text-blue-600">{metadata.total_issues}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Related Logs</p>
                    <p className="text-2xl font-bold text-blue-600">{metadata.total_related_logs}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Generated At</p>
                    <p className="text-md font-medium">{new Date(metadata.generated_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <h2 className="text-xl font-semibold mb-4">Detected Anomalies</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {anomalies.map((anomaly) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={anomaly}
                onClick={handleSelectAnomaly}
              />
            ))}
          </div>
          
          {selectedAnomaly && (
            <AnomalyDetailModal
              anomaly={selectedAnomaly}
              isOpen={!!selectedAnomaly}
              onClose={handleCloseModal}
            />
          )}
        </>
      )}
    </div>
  );
} 
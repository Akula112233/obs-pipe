import { Card, CardContent, CardHeader, CardTitle } from './card';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  metrics: any;
}

export default function MetricsModal({ isOpen, onClose, title, metrics }: MetricsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-[90vw] max-w-2xl bg-white shadow-xl">
        <CardHeader className="border-b flex flex-row items-center justify-between p-4">
          <CardTitle>{title} Metrics</CardTitle>
          <button 
            onClick={onClose}
            className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {metrics?.receivedEventsTotal && (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-lg font-medium">Received Events</span>
              <span className="text-lg">{metrics.receivedEventsTotal.value * 100}</span>
            </div>
          )}
          {metrics?.sentEventsTotal && (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-lg font-medium">Sent Events</span>
              <span className="text-lg">{metrics.sentEventsTotal.value * 100}</span>
            </div>
          )}
          {metrics?.sentBytesTotal && (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-lg font-medium">Sent Bytes</span>
              <span className="text-lg">{metrics.sentBytesTotal.value}</span>
            </div>
          )}
          {metrics?.receivedBytesTotal && (
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <span className="text-lg font-medium">Received Bytes</span>
              <span className="text-lg">{metrics.receivedBytesTotal.value}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
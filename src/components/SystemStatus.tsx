'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';

interface SystemStatus {
  enabled: boolean;
  message: string | null;
  timestamp: string;
}

const CHECK_INTERVAL = 60000;

export default function SystemStatus() {
  const { isSystemEnabled, isLoading, isOnline, setAppState } = useAppState();
  const lastCheckRef = useRef<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      // Prevent multiple simultaneous checks
      const now = Date.now();
      if (now - lastCheckRef.current < 5000) { // 5 second minimum between checks
        return;
      }
      lastCheckRef.current = now;

      try {
        const response = await fetch('/api/system-status');
        if (response.ok) {
          const data = await response.json() as SystemStatus;
          setAppState({
            isSystemEnabled: data?.enabled ?? false,
            isLoading: false
          });
          setStatusMessage(data?.message || null);
        } else {
          setAppState({ isSystemEnabled: false, isLoading: false });
          setStatusMessage(null);
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
        setAppState({ isSystemEnabled: false, isLoading: false });
        setStatusMessage(null);
      }
    };

    // Initial check
    checkStatus();

    // Set up interval for periodic checks, but only when the tab is visible
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    }, CHECK_INTERVAL);

    // Add visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setAppState]);

  // Don't show if we're offline or on the about page
  if (!isOnline || isLoading || isSystemEnabled || window.location.pathname === '/about') return null;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            System Temporarily Unavailable
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-muted-foreground">
            <p className="mb-2">
              {statusMessage || 'The system is currently unavailable. We apologize for the inconvenience.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/about'}
            >``
              View Documentation
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            For support, contact{' '}
            <a 
              href="mailto:support@trysift.dev" 
              className="text-primary hover:underline"
            >
              support@trysift.dev
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
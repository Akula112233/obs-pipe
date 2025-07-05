'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Loader2, WifiOff, RefreshCw, Wrench } from 'lucide-react';
import { useAppState } from '../contexts/AppStateContext';

const CHECK_INTERVAL = 30000; // Check every 30 seconds
const DEBOUNCE_DELAY = 2000; // 2 second debounce

export default function InternetCheck() {
  const { isOnline, isLoading, setAppState } = useAppState();
  const pathname = usePathname();
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCheckRef = useRef<number>(0);

  const checkConnection = useCallback(async (isRetry = false) => {
    // Debounce checks
    const now = Date.now();
    if (now - lastCheckRef.current < DEBOUNCE_DELAY) {
      return;
    }
    lastCheckRef.current = now;

    if (isRetry) {
      setAppState({ isLoading: true });
    }

    try {
      const response = await fetch('/api/health-check', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      setAppState({
        isOnline: response.ok,
        isLoading: false
      });

    } catch (error) {
      setAppState({
        isOnline: false,
        isLoading: false
      });
    }
  }, [setAppState]);

  useEffect(() => {
    const handleOnline = () => {
      // Clear any pending checks
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      
      // Debounce the online event
      checkTimeoutRef.current = setTimeout(() => {
        setAppState({ isOnline: true });
        checkConnection();
      }, DEBOUNCE_DELAY);
    };

    const handleOffline = () => {
      // Clear any pending checks
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      setAppState({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkConnection();

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    }, CHECK_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [checkConnection, setAppState]);

  // Don't show on about page or troubleshoot page or when everything is fine
  if (isOnline || pathname === '/about' || pathname === '/troubleshoot') {
    return null;
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-none w-full sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-destructive" />
            Connection Issues Detected
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-muted-foreground">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking connection...
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  We're having trouble connecting to our services. This could be due to:
                </p>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  <li>No internet connection</li>
                  <li>Firewall restrictions</li>
                  <li>Proxy configuration</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="default"
              className="flex items-center gap-2"
              onClick={() => checkConnection(true)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Check Again
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => window.location.href = '/troubleshoot'}
            >
              <Wrench className="h-4 w-4" />
              Troubleshoot
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/about'}
            >
              View Offline Documentation
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
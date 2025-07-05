'use client';

import { useEffect, useState } from 'react';
import { X, Bell, BellOff } from 'lucide-react';
import { Button } from './button';
import { usePathname } from 'next/navigation';

interface Announcement {
  id: string;
  message: string;
  timestamp: string;
  allowDismiss?: boolean;  // If false, banner cannot be dismissed
  severity?: 'info' | 'warning' | 'critical';  // Different styling based on importance
}

type AnnouncementsResponse = Announcement[];

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Don't show announcements on error pages
  const isErrorPage = pathname?.includes('/auth/auth-code-error') || 
                     pathname?.includes('/error') ||
                     pathname?.includes('/auth/signin?error') ||
                     pathname === '/not-found';

  useEffect(() => {
    const checkAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements');
        if (response.ok) {
          const data = await response.json() as AnnouncementsResponse;
          
          if (data?.length) {
            // Filter out permanently dismissed announcements
            const dismissedAnnouncements = JSON.parse(localStorage.getItem('permanentlyDismissed') || '{}');
            const filteredAnnouncements = data.filter(announcement => 
              announcement.allowDismiss === false || !dismissedAnnouncements[announcement.id]
            );
            
            setAnnouncements(filteredAnnouncements);
          } else {
            setAnnouncements([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    if (!isErrorPage) {
      checkAnnouncements();
    }
  }, [isErrorPage]);

  const dismissAnnouncement = (id: string, permanent: boolean = false) => {
    if (permanent) {
      const dismissedAnnouncements = JSON.parse(localStorage.getItem('permanentlyDismissed') || '{}');
      dismissedAnnouncements[id] = true;
      localStorage.setItem('permanentlyDismissed', JSON.stringify(dismissedAnnouncements));
    }
    setAnnouncements(current => current.filter(a => a.id !== id));
  };

  if (loading || announcements.length === 0 || isErrorPage) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-[90%] w-[90%] space-y-3 pointer-events-none">
      {announcements.map(announcement => (
        <div 
          key={announcement.id}
          className={`
            rounded-lg bg-gradient-to-r text-white shadow-lg pointer-events-auto
            ${announcement.severity === 'critical' ? 'from-red-500/95 to-red-600/95' :
              announcement.severity === 'warning' ? 'from-yellow-500/95 to-yellow-600/95' :
              'from-blue-500/95 to-indigo-600/95'}
          `}
        >
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-lg font-medium">
                {announcement.message}
              </div>
              {announcement.allowDismiss !== false && (
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAnnouncement(announcement.id, false)}
                    title="Hide until next refresh"
                    className="text-white hover:bg-white/20"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Hide</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAnnouncement(announcement.id, true)}
                    title="Don't show again"
                    className="text-white hover:bg-white/20"
                  >
                    <BellOff className="h-4 w-4" />
                    <span className="ml-2 hidden sm:inline">Don't Show Again</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAnnouncement(announcement.id, false)}
                    title="Close"
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Home, Database, Brain, LogOut, MessageCircle, Building, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { createBrowserComponentClient } from '@/utils/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface SideNavigationProps {
  className?: string;
}

export function SideNavigation({ className }: SideNavigationProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { organization } = useOrganization();

  // Initialize from localStorage once component mounts
  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed) {
      setCollapsed(savedCollapsed === 'true');
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    }
  }, [collapsed, mounted]);

  // Handle logout
  const handleLogout = async () => {
    try {
      const supabase = createBrowserComponentClient();
      await supabase.auth.signOut();
      router.push('/auth/signin');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback if the above fails
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('session');
        sessionStorage.clear();
        window.location.href = '/auth/signin';
      }
    }
  };

  // Don't show on auth pages or docs pages
  const isAuthPage = pathname?.includes('/auth');
  const isDocsPage = pathname?.includes('/docs');
  if (isAuthPage || isDocsPage) return null;

  const navigationItems = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      active: pathname === '/'
    },
    {
        name: 'Anomaly Detection',
        href: '/anomaly-detection',
        icon: AlertCircle,
        active: pathname?.includes('/anomaly-detection')
    },
    {
      name: 'Log Chat',
      href: '/log-chat',
      icon: MessageCircle,
      active: pathname?.includes('/log-chat')
    },
    {
      name: 'Send Data',
      href: '/pipeline',
      icon: Database,
      active: pathname === '/pipeline'
    }
  ];

  return (
    <aside 
      className={cn(
        "flex flex-col border-r border-border bg-card h-screen transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[240px]",
        className
      )}
    >
      <div className={cn(
        "flex items-center p-4 border-b border-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="relative h-8 w-[140px]">
            <Image 
              src="/sift-dev-logo-light.svg" 
              alt="Sift Logo" 
              fill
              priority
              style={{ objectFit: 'contain', objectPosition: 'left' }}
            />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className={cn("h-8 w-8", collapsed ? "" : "ml-auto")}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {navigationItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                item.active 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-primary hover:bg-secondary",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                item.active ? "text-primary-foreground" : "text-muted-foreground"
              )} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Organization name */}
      <div className="p-3 border-t border-border">
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium",
            "text-muted-foreground",
            collapsed && "justify-center px-2"
          )}
        >
          <Building className="h-5 w-5 text-muted-foreground" />
          {!collapsed && (
            <span className="truncate" title={organization?.name || "Organization"}>
              {organization?.name || "Organization"}
            </span>
          )}
        </div>
      </div>

      {/* Logout button */}
      <div className="p-3 border-t border-border mt-auto">
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
} 
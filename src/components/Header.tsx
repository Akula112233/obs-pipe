'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/button';
import { Power, PowerOff, Settings, Scroll, Info, MoreVertical, Terminal, BookOpen, LineChart, Key } from 'lucide-react';
import { createBrowserComponentClient } from '@/utils/supabase/client';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { envConfig } from '@/lib/env-config';

interface HeaderProps {
  isVectorRunning: boolean;
  isStarting: boolean;
  isStopping: boolean;
  onToggleVector: (action: 'start' | 'stop') => void;
  onOpenLogs: () => void;
  onOpenDockerLogs: () => void;
  config?: {
    sources: Record<string, any>;
    sinks: Record<string, any>;
  };
}

export default function Header({ 
  isVectorRunning, 
  isStarting, 
  isStopping, 
  onToggleVector,
  onOpenLogs,
  onOpenDockerLogs,
  config
}: HeaderProps) {
  const router = useRouter();
  const supabase = createBrowserComponentClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  const openSignozDashboard = () => {
    window.open(envConfig.signozUrl, '_blank');
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Pipeline Dashboard</h1>
        <div className="flex items-center gap-2">
          {/* <Link
            href="/about"
            className="flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="About"
          >
            <Info className="h-4 w-4" />
          </Link> */}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/docs"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">Getting Started</span>
        </Link>
        <Button
          onClick={() => onToggleVector(isVectorRunning ? 'stop' : 'start')}
          disabled={isStarting || isStopping}
          className={`flex items-center gap-2 px-6 py-2 text-base ${
            isStarting || isStopping
              ? 'bg-gray-300 cursor-not-allowed'
              : isVectorRunning
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isVectorRunning ? (
            <>
              <PowerOff className="h-5 w-5" />
              {isStopping ? 'Stopping Pipeline...' : 'Stop Pipeline'}
            </>
          ) : (
            <>
              <Power className="h-5 w-5" />
              {isStarting ? 'Starting Pipeline...' : 'Start Pipeline'}
            </>
          )}
        </Button>

        {/* TODO: Add back in when we have a way to view logs */}
        {/* <Button
          onClick={openSignozDashboard}
          className="flex items-center gap-2 px-6 py-2 text-base bg-blue-500 hover:bg-blue-600 text-white"
        >
          <LineChart className="h-5 w-5" />
          View Logs
        </Button> */}

        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <Link href="/config">
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Edit Config
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={onOpenLogs} className="cursor-pointer">
              <Scroll className="mr-2 h-4 w-4" />
              Preview Live Logs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenDockerLogs} className="cursor-pointer">
              <Terminal className="mr-2 h-4 w-4" />
              View Internal Logs
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/api-keys">
                <Key className="mr-2 h-4 w-4" />
                API Keys
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
      </div>
    </div>
  );
} 
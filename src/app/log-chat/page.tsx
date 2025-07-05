'use client';

import React from 'react';
import LogChat from '@/components/LogChat';

export default function LogChatPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Log Chat</h1>
        <p className="page-description">
          Chat with your logs to extract insights and troubleshoot issues
        </p>
      </div>

      <div className="h-[calc(100vh-220px)]">
        <LogChat />
      </div>
    </div>
  );
} 
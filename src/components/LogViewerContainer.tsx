'use client';

import React from 'react';
import LogViewer from './LogViewer';

export default function LogViewerContainer() {
  return (
    <div className="h-full flex flex-col">
      <LogViewer />
    </div>
  );
} 
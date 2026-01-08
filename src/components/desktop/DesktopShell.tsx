// Desktop Shell Component

'use client';

import React from 'react';
import { Dock } from './Dock';
import { WindowManager } from './WindowManager';
import { TopBar } from './TopBar';

interface DesktopShellProps {
  projectId: string;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({ projectId }) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg-primary relative">
      {/* Desktop Background - Subtle texture/grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />
      </div>
      
      {/* Top Bar */}
      <TopBar projectId={projectId} />
      
      {/* Window Manager */}
      <WindowManager projectId={projectId} />
      
      {/* Dock */}
      <Dock projectId={projectId} />
    </div>
  );
};


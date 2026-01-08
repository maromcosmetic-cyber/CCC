// Window Manager Component

'use client';

import React, { useState, useCallback } from 'react';
import { Window } from './Window';
import { Dashboard } from '@/components/apps/Dashboard';
import { Campaigns } from '@/components/apps/Campaigns';
import { Audiences } from '@/components/apps/Audiences';
import { Products } from '@/components/apps/Products';
import { AIStudio } from '@/components/apps/AIStudio';
import { MediaLibrary } from '@/components/apps/MediaLibrary';
import { CompanyProfile } from '@/components/apps/CompanyProfile';
import { ControlSystem } from '@/components/apps/ControlSystem';

interface WindowState {
  id: string;
  title: string;
  component: React.ComponentType<{ projectId: string }>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
}

interface WindowManagerProps {
  projectId: string;
}

const APP_COMPONENTS: Record<string, React.ComponentType<{ projectId: string }>> = {
  dashboard: Dashboard,
  campaigns: Campaigns,
  audiences: Audiences,
  products: Products,
  'ai-studio': AIStudio,
  'media-library': MediaLibrary,
  'company-profile': CompanyProfile,
  'control-system': ControlSystem,
};

const APP_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  campaigns: 'Campaigns',
  audiences: 'Audiences',
  products: 'Products',
  'ai-studio': 'AI Studio',
  'media-library': 'Media Library',
  'company-profile': 'Company Profile',
  'control-system': 'Control System',
};

export const WindowManager: React.FC<WindowManagerProps> = ({ projectId }) => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(1000);

  const openWindow = useCallback((appId: string) => {
    setWindows((prev) => {
      // Check if window already exists
      const existing = prev.find((w) => w.id === appId);
      if (existing) {
        // Bring to front
        return prev.map((w) =>
          w.id === appId ? { ...w, zIndex: maxZIndex + 1, isMinimized: false } : w
        );
      }

      // Create new window
      const Component = APP_COMPONENTS[appId];
      if (!Component) return prev;

      const newWindow: WindowState = {
        id: appId,
        title: APP_TITLES[appId] || appId,
        component: Component,
        position: { x: 100 + prev.length * 30, y: 100 + prev.length * 30 },
        size: { width: 900, height: 700 },
        zIndex: maxZIndex + 1,
        isMinimized: false,
      };

      setMaxZIndex((prev) => prev + 1);
      return [...prev, newWindow];
    });
  }, [maxZIndex]);

  const closeWindow = useCallback((appId: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== appId));
  }, []);

  const minimizeWindow = useCallback((appId: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === appId ? { ...w, isMinimized: true } : w))
    );
  }, []);

  const focusWindow = useCallback((appId: string) => {
    setWindows((prev) => {
      const newMaxZ = maxZIndex + 1;
      setMaxZIndex(newMaxZ);
      return prev.map((w) => (w.id === appId ? { ...w, zIndex: newMaxZ } : w));
    });
  }, [maxZIndex]);

  // Expose openWindow to Dock via context or prop drilling
  React.useEffect(() => {
    (window as any).__openWindow = openWindow;
  }, [openWindow]);

  return (
    <div className="absolute inset-0 top-12 bottom-20">
      {windows
        .filter((w) => !w.isMinimized)
        .map((window) => {
          const Component = window.component;
          return (
            <Window
              key={window.id}
              id={window.id}
              title={window.title}
              initialPosition={window.position}
              initialSize={window.size}
              zIndex={window.zIndex}
              onClose={() => closeWindow(window.id)}
              onMinimize={() => minimizeWindow(window.id)}
              onFocus={() => focusWindow(window.id)}
            >
              <Component projectId={projectId} />
            </Window>
          );
        })}
    </div>
  );
};



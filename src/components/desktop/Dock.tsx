// Dock Component

'use client';

import React from 'react';
import { useWindowManager } from '@/hooks/useWindowManager';

interface DockProps {
  projectId: string;
}

const DOCK_APPS = [
  { id: 'dashboard', name: 'Dashboard', label: 'Dash' },
  { id: 'campaigns', name: 'Campaigns', label: 'Camp' },
  { id: 'audiences', name: 'Audiences', label: 'Aud' },
  { id: 'products', name: 'Products', label: 'Prod' },
  { id: 'ai-studio', name: 'AI Studio', label: 'AI' },
  { id: 'media-library', name: 'Media Library', label: 'Media' },
  { id: 'company-profile', name: 'Company Profile', label: 'Profile' },
  { id: 'control-system', name: 'Control System', label: 'Control' },
];

export const Dock: React.FC<DockProps> = ({ projectId }) => {
  const { openWindow } = useWindowManager();
  const [activeApp, setActiveApp] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Track active windows via window focus events
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const windowEl = target.closest('[data-window-id]');
      if (windowEl) {
        setActiveApp(windowEl.getAttribute('data-window-id'));
      }
    };
    window.addEventListener('focusin', handleFocus);
    return () => window.removeEventListener('focusin', handleFocus);
  }, []);

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-bg-elevated backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-1 border border-border-subtle shadow-dock">
        {DOCK_APPS.map((app) => {
          const isActive = activeApp === app.id;
          return (
            <button
              key={app.id}
              onClick={() => openWindow(app.id)}
              className={`
                relative px-3 py-2 rounded-md transition-all duration-200
                ${isActive 
                  ? 'bg-accent/20 text-accent' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                }
              `}
              title={app.name}
            >
              {/* Subtle glow on active */}
              {isActive && (
                <div className="absolute inset-0 rounded-md bg-accent/10 blur-sm" />
              )}
              <span className="relative text-xs font-medium tracking-wide">{app.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};


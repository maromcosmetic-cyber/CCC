// Window Manager Hook

'use client';

import { useCallback } from 'react';

export function useWindowManager() {
  const openWindow = useCallback((appId: string) => {
    if (typeof window !== 'undefined' && (window as any).__openWindow) {
      (window as any).__openWindow(appId);
    }
  }, []);

  return { openWindow };
}



// Top Bar Component

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

interface TopBarProps {
  projectId: string;
}

export const TopBar: React.FC<TopBarProps> = ({ projectId }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="absolute top-0 left-0 right-0 h-11 bg-bg-secondary/95 backdrop-blur-sm border-b border-border-subtle flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <a href="/projects" className="text-text-primary font-medium hover:text-accent transition-colors tracking-wide">
          CCC
        </a>
        <div className="text-text-muted text-xs font-mono">{projectId.substring(0, 8)}</div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="text-text-muted hover:text-text-primary transition-colors" title="Search">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {!loading && (
          <div className="flex items-center gap-2">
            <div className="text-text-muted text-xs hidden md:block font-mono">{userName}</div>
            <button
              onClick={handleSignOut}
              className="w-7 h-7 rounded-md bg-bg-elevated border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors text-xs font-medium"
              title={user?.email || 'User'}
            >
              {userInitial}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


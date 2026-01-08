// Dashboard App

'use client';

import React from 'react';

interface DashboardProps {
  projectId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ projectId }) => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-elevated border border-border-subtle p-4 rounded-md">
          <h2 className="text-sm font-medium text-text-primary mb-2">Recent actions</h2>
          <p className="text-xs text-text-muted">No recent actions</p>
        </div>
        <div className="bg-bg-elevated border border-border-subtle p-4 rounded-md">
          <h2 className="text-sm font-medium text-text-primary mb-2">Integration status</h2>
          <p className="text-xs text-text-muted">All systems operational</p>
        </div>
      </div>
    </div>
  );
};


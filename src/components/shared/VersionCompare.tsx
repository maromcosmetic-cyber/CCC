// Version Compare component

import React from 'react';
import { clsx } from 'clsx';

interface VersionCompareProps {
  version1: { version: number; data: any; created_at: string };
  version2: { version: number; data: any; created_at: string };
  fields: Array<{ key: string; label: string; render?: (value: any) => React.ReactNode }>;
}

export const VersionCompare: React.FC<VersionCompareProps> = ({
  version1,
  version2,
  fields,
}) => {
  const renderValue = (field: typeof fields[0], value: any) => {
    if (field.render) {
      return field.render(value);
    }
    if (typeof value === 'object') {
      return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
    }
    return String(value ?? 'N/A');
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h3 className="font-semibold mb-2">Version {version1.version}</h3>
        <div className="space-y-2">
          {fields.map((field) => {
            const value = version1.data[field.key];
            return (
              <div key={field.key} className="border rounded p-2">
                <div className="text-sm font-medium text-gray-700">{field.label}</div>
                <div className="mt-1">{renderValue(field, value)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Version {version2.version}</h3>
        <div className="space-y-2">
          {fields.map((field) => {
            const value = version2.data[field.key];
            const changed = JSON.stringify(version1.data[field.key]) !== JSON.stringify(value);
            return (
              <div
                key={field.key}
                className={clsx(
                  'border rounded p-2',
                  changed && 'bg-yellow-50 border-yellow-300'
                )}
              >
                <div className="text-sm font-medium text-gray-700">{field.label}</div>
                <div className="mt-1">{renderValue(field, value)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};



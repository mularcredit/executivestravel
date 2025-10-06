import React from 'react';

interface StatusBadgeProps {
  active: boolean;
}

export function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      active 
        ? 'bg-green-100 text-green-800 border border-green-200' 
        : 'bg-gray-100 text-gray-800 border border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        active ? 'bg-green-500' : 'bg-gray-500'
      }`}></span>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
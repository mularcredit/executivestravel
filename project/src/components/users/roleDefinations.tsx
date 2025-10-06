import React from 'react';
import { Shield, Settings, User, Eye } from 'lucide-react';

export const ROLES = {
  ADMIN: {
    label: 'Admin',
    description: 'Full access to all features and settings across all locations',
    icon: <Shield className="w-4 h-4 text-purple-500" />,
    requiresLocation: false
  },
  MANAGER: {
    label: 'Manager',
    description: 'Can manage users and content for specific locations',
    icon: <Settings className="w-4 h-4 text-blue-500" />,
    requiresLocation: true
  },
  REGIONAL: {
    label: 'Regional',
    description: 'Can manage users and content for specific locations',
    icon: <Settings className="w-4 h-4 text-blue-500" />,
    requiresLocation: true
  },
  OPERATIONS: {
    label: 'Operations',
    description: 'Can manage users and content for specific locations',
    icon: <Settings className="w-4 h-4 text-blue-500" />,
    requiresLocation: true
  },
  STAFF: {
    label: 'Staff',
    description: 'Standard access with limited permissions for specific locations',
    icon: <User className="w-4 h-4 text-green-500" />,
    requiresLocation: true
  },
  HR: {
    label: 'HR',
    description: 'Read-only access to location-specific features',
    icon: <Eye className="w-4 h-4 text-gray-500" />,
    requiresLocation: true
  },
  CHECKER: {
    label: 'CHECKER',
    description: 'Read-only access to location-specific features',
    icon: <Eye className="w-4 h-4 text-gray-500" />,
    requiresLocation: true
  }
};
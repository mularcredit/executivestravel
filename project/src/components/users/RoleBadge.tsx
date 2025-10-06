import React from 'react';
import { Shield, Settings, User, Eye } from 'lucide-react';
import { UserRole } from '../../types/user';

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const getRoleConfig = () => {
    switch (role) {
      case 'ADMIN':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          icon: <Shield className="w-3 h-3" />
        };
      case 'MANAGER':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: <Settings className="w-3 h-3" />
        };
      case 'REGIONAL':
        return {
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-800',
          borderColor: 'border-indigo-200',
          icon: <Settings className="w-3 h-3" />
        };
      case 'OPERATIONS':
        return {
          bgColor: 'bg-violet-100',
          textColor: 'text-violet-800',
          borderColor: 'border-violet-200',
          icon: <Settings className="w-3 h-3" />
        };
      case 'STAFF':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          icon: <User className="w-3 h-3" />
        };
      case 'HR':
        return {
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-200',
          icon: <Eye className="w-3 h-3" />
        };
      case 'CHECKER':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200',
          icon: <Eye className="w-3 h-3" />
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          icon: <User className="w-3 h-3" />
        };
    }
  };

  const config = getRoleConfig();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      {config.icon}
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}
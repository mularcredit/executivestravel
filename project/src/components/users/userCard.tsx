import { useState } from 'react';
import { User, Edit, Trash2, MoreVertical } from 'lucide-react';
import { AppUser } from '../../../src/types/user';
import { StatusBadge } from './statusBudge';
import { RoleBadge } from './RoleBadge';

interface UserCardProps {
  user: AppUser;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  currentUserIsAdmin: boolean;
}

export function UserCard({ user, onEdit, onDelete, currentUserIsAdmin }: UserCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-gray-900 text-xs truncate">
              {user.email}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {user.user_metadata.full_name || 'No name provided'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.last_sign_in_at ? `Last active: ${new Date(user.last_sign_in_at).toLocaleDateString()}` : 'Never active'}
            </p>
          </div>
        </div>
        
        {currentUserIsAdmin && (
          <div className="relative flex-shrink-0">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit(user);
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Edit className="w-4 h-4" />
                    Edit User
                  </button>
                  <button
                    onClick={() => {
                      onDelete(user);
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <StatusBadge active={user.active} />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Role</p>
          <RoleBadge role={user.role} />
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-1">Created</p>
        <p className="text-xs text-gray-700">
          {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>

      {user.user_metadata.location && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Location</p>
          <p className="text-xs text-gray-700 truncate">
            {user.user_metadata.location}
          </p>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Check, User, Mail, MapPin } from 'lucide-react';
import { AppUser, UserRole } from '../../types/user';
import { ROLES } from './roleDefinations';

interface UserEditModalProps {
  user: AppUser | null;
  onClose: () => void;
  onSave: (userData: any) => void;
}

export function UserEditModal({ user, onClose, onSave }: UserEditModalProps) {
  const [editedUser, setEditedUser] = useState<any>({
    email: '',
    full_name: '',
    role: 'OPERATIONS' as UserRole,
    active: true,
    password: '',
    confirmPassword: '',
    location: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setEditedUser({
        email: user.email,
        full_name: user.user_metadata.full_name || '',
        role: user.role,
        active: user.active,
        password: '',
        confirmPassword: '',
        location: user.user_metadata.location || ''
      });
    } else {
      setEditedUser({
        email: '',
        full_name: '',
        role: 'OPERATIONS',
        active: true,
        password: '',
        confirmPassword: '',
        location: ''
      });
    }
    setPasswordError('');
    setFormErrors({});
  }, [user]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!editedUser.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(editedUser.email)) {
      errors.email = 'Email is invalid';
    }

    if (!user) {
      if (!editedUser.password) {
        errors.password = 'Password is required';
      } else if (editedUser.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }

      if (editedUser.password !== editedUser.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (!editedUser.full_name) {
      errors.full_name = 'Full name is required';
    }

    const roleInfo = ROLES[editedUser.role as UserRole];
    if (roleInfo?.requiresLocation && !editedUser.location) {
      errors.location = 'Location is required for this role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    const userToSave = {
      email: editedUser.email,
      role: editedUser.role,
      active: editedUser.active,
      password: editedUser.password,
      full_name: editedUser.full_name,
      location: editedUser.location
    };
    
    onSave(userToSave);
  };

  const handleRoleChange = (role: UserRole) => {
    setEditedUser({ ...editedUser, role });
    // Clear location error when role changes
    if (formErrors.location) {
      setFormErrors(prev => ({ ...prev, location: '' }));
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditedUser({ ...editedUser, [field]: value });
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const roleInfo = ROLES[editedUser.role as UserRole];

  // Filter roles to only show ADMIN and OPERATIONS
  const availableRoles = (Object.keys(ROLES) as UserRole[]).filter(role => 
    role === 'ADMIN' || role === 'OPERATIONS'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Email Address
            </label>
            <input
              type="email"
              value={editedUser.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${
                formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
              } ${user ? 'text-gray-500 cursor-not-allowed' : ''}`}
              placeholder="user@example.com"
              disabled={!!user}
            />
            {formErrors.email && (
              <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-3 h-3" />
              Full Name
            </label>
            <input
              type="text"
              value={editedUser.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${
                formErrors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
              }`}
              placeholder="John Doe"
            />
            {formErrors.full_name && (
              <p className="text-xs text-red-500 mt-1">{formErrors.full_name}</p>
            )}
          </div>
          
          {/* Password Fields (only for new users) */}
          {!user && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={editedUser.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs pr-10 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${
                      formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                    }`}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={editedUser.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${
                    formErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                  }`}
                  placeholder="••••••"
                />
                {formErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.confirmPassword}</p>
                )}
              </div>
            </>
          )}
          
          {/* Location */}
          {roleInfo?.requiresLocation && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </label>
              <input
                type="text"
                value={editedUser.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-100 focus:border-blue-500 ${
                  formErrors.location ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                }`}
                placeholder="Enter location"
              />
              {formErrors.location && (
                <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>
              )}
            </div>
          )}
          
          {/* Role Selection - Only ADMIN and OPERATIONS */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`p-2 border rounded-lg text-xs font-medium transition-all ${
                    editedUser.role === role ? 
                    (role === 'ADMIN' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' :
                     'border-violet-500 bg-violet-50 text-violet-700 shadow-sm') :
                    'border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {ROLES[role].label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {roleInfo?.description}
            </p>
          </div>
          
          {/* Account Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs font-medium text-gray-900">Account Status</p>
              <p className="text-xs text-gray-500">
                {editedUser.active ? 'User can sign in' : 'User cannot sign in'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={editedUser.active}
                onChange={(e) => setEditedUser({ ...editedUser, active: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            {user ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
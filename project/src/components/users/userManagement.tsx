import { useState, useEffect } from 'react';
import { useUserManagement } from '../../hooks/useUserManagement';
import { useAuth } from '../../contexts/AuthContext';
import { UserCard } from './userCard';
import { UserEditModal } from './userEditModal';
import { Pagination } from './Pagination';
import { Search, Filter, UserPlus, Shield, Users, Eye, EyeOff, RefreshCw, AlertCircle, Home } from 'lucide-react';
import { AppUser } from '../../types/user';
import { ROLES } from './roleDefinations';
import { useNavigate } from 'react-router-dom'; // Add this import

export function UserManagement() {
  const { users, loading, error, createUser, updateUser, deleteUser, refreshUsers } = useUserManagement();
  const { isAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate(); // Add this hook
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(12);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add home navigation function
  const handleGoHome = () => {
    navigate('/dashboard');
  };

  // Redirect or show error if not admin
  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <Shield className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600 text-sm">
            You need administrator privileges to access this page.
          </p>
          <button
            onClick={handleGoHome}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Handle refresh with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUsers();
    setIsRefreshing(false);
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'ALL' || 
                        (selectedStatus === 'ACTIVE' && user.active) || 
                        (selectedStatus === 'INACTIVE' && !user.active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleDeleteUser = async (user: AppUser) => {
    // Prevent deleting yourself
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleSaveUser = async (userData: any) => {
    try {
      if (editingUser) {
        // Prevent demoting yourself from admin
        if (editingUser.id === currentUser?.id && userData.role !== 'ADMIN') {
          alert('You cannot remove admin privileges from your own account.');
          return;
        }

        await updateUser(editingUser.id, {
          email: userData.email,
          role: userData.role,
          active: userData.active,
          user_metadata: {
            full_name: userData.full_name,
            location: userData.location
          }
        });
        setEditingUser(null);
      } else {
        await createUser({
          email: userData.email,
          password: userData.password,
          role: userData.role,
          active: userData.active,
          user_metadata: {
            full_name: userData.full_name,
            location: userData.location
          }
        });
        setShowAddUserModal(false);
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      alert(err.message || `Failed to ${editingUser ? 'update' : 'create'} user`);
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedStatus]);

  // Stats calculations
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active).length;
  const adminUsers = users.filter(u => u.role === 'ADMIN').length;
  const inactiveUsers = users.filter(u => !u.active).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {/* Home Button */}
            <button
              onClick={handleGoHome}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg text-xs font-medium transition-colors border border-gray-200"
              title="Back to Dashboard"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>
            
            <div>
              
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          </div>
        </div>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error fetching users</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="text-sm text-red-800 underline hover:no-underline mt-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Search Users
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm transition-colors"
                />
              </div>
            </div>
            
            {/* Role Filter */}
            {/* <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Filter by Role
              </label>
              <div className="relative">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm appearance-none transition-colors"
                >
                  <option value="ALL">All Roles</option>
                  {(Object.keys(ROLES) as Array<keyof typeof ROLES>).map((role) => (
                    <option key={role} value={role}>{ROLES[role].label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
            </div> */}
            
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                Filter by Status
              </label>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm appearance-none transition-colors"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <Filter className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Users</p>
                <p className="text-xl font-bold text-gray-900">{totalUsers}</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Users</p>
                <p className="text-xl font-bold text-gray-900">{activeUsers}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}% of total` : '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Eye className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admins</p>
                <p className="text-xl font-bold text-gray-900">{adminUsers}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalUsers > 0 ? `${Math.round((adminUsers / totalUsers) * 100)}% of total` : '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inactive Users</p>
                <p className="text-xl font-bold text-gray-900">{inactiveUsers}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalUsers > 0 ? `${Math.round((inactiveUsers / totalUsers) * 100)}% of total` : '0%'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                <EyeOff className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Results Info */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {currentUsers.length} of {filteredUsers.length} users
            {filteredUsers.length !== users.length && ` (filtered from ${users.length} total)`}
          </p>
          
          {filteredUsers.length > 0 && (
            <p className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
        
        {/* Users Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 text-sm">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentUsers.length > 0 ? (
                currentUsers.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    onEdit={setEditingUser}
                    onDelete={handleDeleteUser}
                    currentUserIsAdmin={isAdmin}
                    currentUserId={currentUser?.id}
                  />
                ))
              ) : (
                <div className="col-span-full bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm mb-2">No users found matching your criteria</p>
                  <p className="text-gray-400 text-xs">
                    Try adjusting your search or filters, or{" "}
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      add a new user
                    </button>
                  </p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {filteredUsers.length > usersPerPage && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={setCurrentPage} 
                />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modals */}
      {showAddUserModal && (
        <UserEditModal 
          user={null} 
          onClose={() => setShowAddUserModal(false)} 
          onSave={handleSaveUser}
        />
      )}
      
      {editingUser && (
        <UserEditModal 
          user={editingUser} 
          onClose={() => setEditingUser(null)} 
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}
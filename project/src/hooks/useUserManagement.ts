// hooks/useUserManagement.ts
import { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { AppUser, CreateUserData, UpdateUserData } from '../types/user';

export function useUserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching users from Supabase...');
      
      if (!supabaseAdmin) {
        throw new Error('Admin access not configured. Please check your VITE_SUPABASE_SERVICE_ROLE_KEY environment variable.');
      }

      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('Admin API error:', authError);
        throw new Error(`Failed to fetch users: ${authError.message}`);
      }

      if (!authUsers) {
        throw new Error('No users data returned from Supabase');
      }

      console.log(`✅ Successfully fetched ${authUsers.length} users`);

      // Transform to AppUser format with approval status
      const transformedUsers: AppUser[] = authUsers.map(user => ({
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role || 'STAFF',
        active: !user.banned,
        approved: user.user_metadata?.approved || false,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        user_metadata: {
          role: user.user_metadata?.role || 'STAFF',
          full_name: user.user_metadata?.full_name || '',
          location: user.user_metadata?.location || '',
          approved: user.user_metadata?.approved || false
        }
      }));

      setUsers(transformedUsers);
      
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: CreateUserData) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin access not configured');
      }

      console.log('👤 Creating user:', userData.email);
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          role: userData.role,
          full_name: userData.user_metadata?.full_name || '',
          location: userData.user_metadata?.location || '',
          approved: true // Auto-approve admin-created users
        }
      });

      if (error) throw error;
      
      await fetchUsers();
      return data.user;
    } catch (err: any) {
      console.error('❌ Error creating user:', err);
      throw err;
    }
  };

  const updateUser = async (userId: string, updates: UpdateUserData) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin access not configured');
      }

      console.log('✏️ Updating user:', userId);
      
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const updateData: any = {
        user_metadata: {
          ...user.user_metadata,
          ...updates.user_metadata
        }
      };

      if (updates.email) updateData.email = updates.email;
      if (updates.active !== undefined) {
        updateData.ban_duration = updates.active ? 'none' : 'permanent';
      }
      if (updates.role !== undefined) {
        updateData.user_metadata.role = updates.role;
      }
      if (updates.approved !== undefined) {
        updateData.user_metadata.approved = updates.approved;
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

      if (error) throw error;
      
      await fetchUsers();
    } catch (err: any) {
      console.error('❌ Error updating user:', err);
      throw err;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin access not configured');
      }

      console.log('🗑️ Deleting user:', userId);
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      
      await fetchUsers();
    } catch (err: any) {
      console.error('❌ Error deleting user:', err);
      throw err;
    }
  };

  // Add approve user function
  const approveUser = async (userId: string) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin access not configured');
      }

      console.log('✅ Approving user:', userId);
      
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          approved: true
        }
      });

      if (error) throw error;
      
      await fetchUsers();
    } catch (err: any) {
      console.error('❌ Error approving user:', err);
      throw err;
    }
  };

  // Add reject user function
  const rejectUser = async (userId: string) => {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin access not configured');
      }

      console.log('❌ Rejecting user:', userId);
      
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          approved: false
        }
      });

      if (error) throw error;
      
      await fetchUsers();
    } catch (err: any) {
      console.error('❌ Error rejecting user:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    approveUser,
    rejectUser,
    refreshUsers: fetchUsers
  };
}
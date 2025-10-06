export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  approved: boolean; // Add this field
  last_sign_in_at: string | null;
  created_at: string;
  user_metadata: {
    role?: UserRole;
    location?: string | null;
    full_name?: string;
    approved?: boolean; // Add this to metadata as well
  };
}

export type UserRole = 
  | 'ADMIN' 
  | 'MANAGER' 
  | 'REGIONAL' 
  | 'OPERATIONS' 
  | 'STAFF' 
  | 'HR' 
  | 'CHECKER';

export interface CreateUserData {
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  approved?: boolean; // Add this optional field
  user_metadata?: {
    full_name?: string;
    location?: string;
    approved?: boolean; // Add this
  };
}

export interface UpdateUserData {
  email?: string;
  role?: UserRole;
  active?: boolean;
  approved?: boolean; // Add this field
  user_metadata?: {
    full_name?: string;
    location?: string;
    approved?: boolean; // Add this
  };
}
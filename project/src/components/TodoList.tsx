import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check, Circle, Trash2, Calendar, AlertCircle, Clock, User, ChevronDown, X, Users, Building, Globe, Shield, RadioTower, Filter } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';

// Constants
const TODO_CONSTANTS = {
  priorities: ['low', 'medium', 'high'] as const,
  countries: [
    { name: 'Kenya', code: 'KE' },
    { name: 'South Sudan', code: 'SS' },
    { name: 'Other', code: 'XX' }
  ] as const
} as const;

// Date filter options
const dateFilterOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' }
];

// Types
type Todo = {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  branch_name: string | null;
  country: string | null;
  assigned_user_name?: string;
  user_name?: string;
};

type FormData = {
  title: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  branchName: string;
  country: string;
};

type TeamMember = {
  id: string;
  email: string;
  name: string;
};

// Utility functions
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getPriorityDot = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-slate-500';
  }
};

const getDisplayName = (name: string, email: string) => {
  return name || email?.split('@')[0] || 'Unknown User';
};

const getCountryName = (countryCode: string) => {
  const country = TODO_CONSTANTS.countries.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin': return <Shield className="w-4 h-4" />;
    case 'operations': return <User className="w-4 h-4" />;
    default: return <User className="w-4 h-4" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'operations': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};



// Simple Form Components without complex memoization
const FormInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required,
  type = "text",
  icon: Icon,
  autoFocus = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  icon?: any;
  autoFocus?: boolean;
}) => {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full ${Icon ? 'pl-9' : 'px-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs`}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
        />
      </div>
    </div>
  );
};

const FormSelect = ({ 
  label, 
  value, 
  onChange, 
  options, 
  icon: Icon 
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon?: any;
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-2">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${Icon ? 'pl-9' : 'px-4'} pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer text-xs relative z-0`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

// Standalone TodoFormModal component
const TodoFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  teamMembers, 
  user 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  teamMembers: TeamMember[];
  user: any;
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    branchName: '',
    country: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        priority: 'medium',
        due_date: '',
        assigned_to: '',
        branchName: '',
        country: ''
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const teamMemberOptions = [
    { value: '', label: 'Unassigned' },
    ...teamMembers.map((member) => ({
      value: member.id,
      label: `${getDisplayName(member.name, member.email)}${member.id === user?.id ? ' (Me)' : ''}`
    }))
  ];

  const countryOptions = [
    { value: '', label: 'Select country' },
    ...TODO_CONSTANTS.countries.map(country => ({
      value: country.code,
      label: country.name
    }))
  ];

  const priorityOptions = TODO_CONSTANTS.priorities.map(priority => ({
    value: priority,
    label: priority.charAt(0).toUpperCase() + priority.slice(1)
  }));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">Create New Task</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              {/* Task Title - Fixed with direct state update */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Task Title</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, title: e.target.value }));
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs"
                    placeholder="What needs to be done?"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <FormSelect
                label="Assign To"
                value={formData.assigned_to}
                onChange={(value) => handleInputChange('assigned_to', value)}
                icon={Users}
                options={teamMemberOptions}
              />

              {/* Branch and Country Fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Branch Name - Fixed with direct state update */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Branch Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={formData.branchName}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, branchName: e.target.value }));
                      }}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs"
                      placeholder="Enter branch name"
                    />
                  </div>
                </div>

                <FormSelect
                  label="Country"
                  value={formData.country}
                  onChange={(value) => handleInputChange('country', value)}
                  icon={Globe}
                  options={countryOptions}
                />
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Priority"
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value)}
                  options={priorityOptions}
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => handleInputChange('due_date', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Priority Preview */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Priority Preview</label>
                <div className="flex gap-2">
                  {TODO_CONSTANTS.priorities.map((priority) => (
                    <span
                      key={priority}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                        formData.priority === priority 
                          ? getPriorityColor(priority)
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Assignment Preview */}
              {formData.assigned_to && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Assigned To</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-700">
                      {formData.assigned_to === user?.id 
                        ? `Me (${getDisplayName(teamMembers.find(m => m.id === user?.id)?.name || '', user?.email || '')})`
                        : getDisplayName(teamMembers.find(m => m.id === formData.assigned_to)?.name || '', '')
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Country Preview */}
              {formData.country && formData.country !== 'XX' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Selected Country</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <ReactCountryFlag
                      countryCode={formData.country}
                      svg
                      style={{
                        width: '1.5em',
                        height: '1.5em',
                      }}
                      title={getCountryName(formData.country)}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {getCountryName(formData.country)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-xs"
            >
              Create Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold transition-all text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Dashboard Summary Component
const DashboardSummary = ({ 
  filteredTodos, 
  user, 
  canManageAllTasks 
}: { 
  filteredTodos: Todo[];
  user: any;
  canManageAllTasks: boolean;
}) => {
  const myAssignedTodos = filteredTodos.filter(todo => 
    todo.assigned_to === user?.id && !todo.completed
  );
  const myCreatedTodos = filteredTodos.filter(todo => 
    todo.user_id === user?.id && !todo.completed
  );
  const overdueTodos = filteredTodos.filter(todo => 
    !todo.completed && 
    todo.due_date && 
    new Date(todo.due_date) < new Date()
  );

  if (canManageAllTasks) return null; // Don't show for admins

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">My Task Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{myAssignedTodos.length}</div>
          <div className="text-xs text-slate-600">Assigned to Me</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{myCreatedTodos.length}</div>
          <div className="text-xs text-slate-600">Created by Me</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {overdueTodos.filter(t => t.assigned_to === user?.id).length}
          </div>
          <div className="text-xs text-slate-600">Overdue</div>
        </div>
      </div>
      {myAssignedTodos.length === 0 && myCreatedTodos.length === 0 && (
        <div className="text-center mt-3">
          <p className="text-xs text-slate-500">No tasks assigned to you yet.</p>
        </div>
      )}
    </div>
  );
};

// Main Component
export function TodoList() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [roleLoading, setRoleLoading] = useState(true);
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Branch and Country filter states
  const [branchFilter, setBranchFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showBranchCountryFilter, setShowBranchCountryFilter] = useState(false);

  // Memoized handlers
  const handleFormSubmit = useCallback(async (formData: FormData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('todos').insert([{
        user_id: user.id,
        title: formData.title,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        branch_name: formData.branchName || null,
        country: formData.country || null,
        completed: false,
      }]);

      if (error) throw error;

      fetchTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  }, [user]);

  const closeForm = useCallback(() => {
    setShowForm(false);
  }, []);

  // Data fetching with user roles
  useEffect(() => {
    if (user) {
      fetchUserRoleAndData();
    }
  }, [user]);

  // Extract available branches from todos
  useEffect(() => {
    if (todos.length > 0) {
      const branches = [...new Set(todos
        .map(t => t.branch_name)
        .filter(Boolean) as string[]
      )].sort();
      setAvailableBranches(branches);
    }
  }, [todos]);

  // Apply all filters when todos or filter settings change
  useEffect(() => {
    applyAllFilters();
  }, [todos, dateFilter, customStartDate, customEndDate, branchFilter, countryFilter]);

  const applyAllFilters = useCallback(() => {
    if (!todos.length) {
      setFilteredTodos([]);
      return;
    }

    let filtered = [...todos];

    // Apply date filter
    filtered = applyDateFilterToTodos(filtered);

    // Apply branch filter
    if (branchFilter) {
      filtered = filtered.filter(todo => 
        todo.branch_name?.toLowerCase().includes(branchFilter.toLowerCase())
      );
    }

    // Apply country filter
    if (countryFilter) {
      filtered = filtered.filter(todo => todo.country === countryFilter);
    }

    setFilteredTodos(filtered);
  }, [todos, dateFilter, customStartDate, customEndDate, branchFilter, countryFilter]);

  const applyDateFilterToTodos = useCallback((todosToFilter: Todo[]) => {
    if (dateFilter === 'all') {
      return todosToFilter;
    }

    const now = new Date();
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfWeek = (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };
    const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

    let filtered = [...todosToFilter];

    switch (dateFilter) {
      case 'today':
        const today = startOfDay(now);
        filtered = filtered.filter(todo => 
          startOfDay(new Date(todo.created_at)).getTime() === today.getTime()
        );
        break;

      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = startOfDay(yesterday);
        filtered = filtered.filter(todo => 
          startOfDay(new Date(todo.created_at)).getTime() === yesterdayStart.getTime()
        );
        break;

      case 'thisWeek':
        const thisWeekStart = startOfWeek(new Date(now));
        filtered = filtered.filter(todo => 
          new Date(todo.created_at) >= thisWeekStart
        );
        break;

      case 'lastWeek':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekStartDate = startOfWeek(lastWeekStart);
        const lastWeekEndDate = new Date(lastWeekStartDate);
        lastWeekEndDate.setDate(lastWeekEndDate.getDate() + 6);
        filtered = filtered.filter(todo => {
          const todoDate = new Date(todo.created_at);
          return todoDate >= lastWeekStartDate && todoDate <= lastWeekEndDate;
        });
        break;

      case 'thisMonth':
        const thisMonthStart = startOfMonth(now);
        filtered = filtered.filter(todo => 
          new Date(todo.created_at) >= thisMonthStart
        );
        break;

      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        filtered = filtered.filter(todo => {
          const todoDate = new Date(todo.created_at);
          return todoDate >= lastMonthStart && todoDate <= lastMonthEnd;
        });
        break;

      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter(todo => {
            const todoDate = new Date(todo.created_at);
            return todoDate >= start && todoDate <= end;
          });
        }
        break;
    }

    return filtered;
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchUserRoleAndData = async () => {
    try {
      setRoleLoading(true);
      setLoading(true);
      
      // First fetch the user role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      let role = 'user';
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No role found for user, defaulting to "user"');
        } else if (error.code === '42P01') {
          console.log('user_roles table does not exist, defaulting to "user"');
        } else {
          console.error('Error fetching user role:', error);
        }
      } else {
        role = data?.role || 'user';
      }
      
      setUserRole(role);
      
      // Now fetch todos and team members with the correct role
      await Promise.all([
        fetchTodos(role),
        fetchTeamMembers(role)
      ]);
    } catch (error) {
      console.error('Error in fetchUserRoleAndData:', error);
      setUserRole('user');
      await Promise.all([
        fetchTodos('user'),
        fetchTeamMembers('user')
      ]);
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchTeamMembers = async (role?: string) => {
    const currentRole = role || userRole;
    
    try {
      if (['admin', 'operations'].includes(currentRole)) {
        // For admin/operations, get all users using supabaseAdmin
        if (!supabaseAdmin) {
          throw new Error('Admin client not available');
        }

        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) throw error;
        
        // Map all users to TeamMember format and fetch names from profiles
        const membersWithNames = await Promise.all(
          (users || []).map(async (u) => {
            let userName = '';
            
            // Try to get name from profiles table first
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, name')
                .eq('id', u.id)
                .single();
              
              // Try different field names that might contain the name
              userName = profile?.full_name || profile?.name || '';
            } catch (profileError) {
              console.log(`No profile found for user ${u.id}, using email as fallback`);
            }
            
            // If no name found in profile, use email username as fallback
            if (!userName && u.email) {
              userName = u.email.split('@')[0];
            }
            
            return {
              id: u.id,
              email: u.email || '',
              name: userName || 'Unknown User'
            };
          })
        );
        
        setTeamMembers(membersWithNames);
      } else {
        // For regular users, only show themselves
        // Try to get current user's name from profile
        let currentUserName = '';
        if (user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, name')
              .eq('id', user.id)
              .single();
            
            currentUserName = profile?.full_name || profile?.name || '';
          } catch (profileError) {
            console.log('No profile found for current user');
          }
        }
        
        setTeamMembers([{
          id: user?.id || '',
          email: user?.email || '',
          name: currentUserName || (user?.email ? user.email.split('@')[0] : 'Me')
        }]);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      // Fallback to current user only
      setTeamMembers([{
        id: user?.id || '',
        email: user?.email || '',
        name: user?.email ? user.email.split('@')[0] : 'Me'
      }]);
    }
  };

  const fetchTodos = async (role?: string) => {
  const currentRole = role || userRole;
  
  try {
    let data, error;

    // Enhanced filtering logic for assigned tasks
    if (!['admin', 'operations'].includes(currentRole) && user?.id) {
      // Use TWO separate queries instead of .or() to avoid UUID/text error
      const [createdResult, assignedResult] = await Promise.all([
        supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('todos')
          .select('*')
          .eq('assigned_to', user.id)
      ]);

      if (createdResult.error) throw createdResult.error;
      if (assignedResult.error) throw assignedResult.error;

      // Merge and deduplicate by ID
      const todoMap = new Map();
      [...(createdResult.data || []), ...(assignedResult.data || [])].forEach(todo => {
        todoMap.set(todo.id, todo);
      });
      
      // Convert back to array and sort
      data = Array.from(todoMap.values()).sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      error = null;
      
      console.log('Fetching todos for user:', user?.id);
      console.log('Filter: user_id OR assigned_to =', user?.id);
    } else {
      // For admin/operations, fetch all tasks
      const { data: fetchedData, error: fetchError } = await supabase
        .from('todos')
        .select('*')
        .order('completed', { ascending: true })
        .order('created_at', { ascending: false });
      
      data = fetchedData;
      error = fetchError;
      
      console.log('Fetching all todos for admin/operations role');
    }

    if (error) throw error;

    console.log('Raw todos data:', data?.length);
    
    // Fetch user names for todos
    const todosWithUserNames = await Promise.all(
      (data || []).map(async (todo) => {
        try {
          // Get creator name
          let creatorName = '';
          try {
            const { data: userData } = await supabase
              .from('profiles')
              .select('full_name, name')
              .eq('id', todo.user_id)
              .single();
            
            creatorName = userData?.full_name || userData?.name || '';
            
            if (!creatorName && supabaseAdmin) {
              const { data: { user: creatorUser } } = await supabaseAdmin.auth.admin.getUserById(todo.user_id);
              creatorName = creatorUser?.email ? creatorUser.email.split('@')[0] : '';
            }
          } catch (profileError) {
            if (supabaseAdmin) {
              try {
                const { data: { user: creatorUser } } = await supabaseAdmin.auth.admin.getUserById(todo.user_id);
                creatorName = creatorUser?.email ? creatorUser.email.split('@')[0] : '';
              } catch (adminError) {
                creatorName = `user_${todo.user_id.substring(0, 8)}`;
              }
            } else {
              creatorName = `user_${todo.user_id.substring(0, 8)}`;
            }
          }

          // Get assigned user name if assigned
          let assignedUserName = '';
          if (todo.assigned_to) {
            try {
              const { data: assignedUserData } = await supabase
                .from('profiles')
                .select('full_name, name')
                .eq('id', todo.assigned_to)
                .single();
              
              assignedUserName = assignedUserData?.full_name || assignedUserData?.name || '';
              
              if (!assignedUserName && supabaseAdmin) {
                const { data: { user: assignedUser } } = await supabaseAdmin.auth.admin.getUserById(todo.assigned_to);
                assignedUserName = assignedUser?.email ? assignedUser.email.split('@')[0] : '';
              }
            } catch (profileError) {
              if (supabaseAdmin) {
                try {
                  const { data: { user: assignedUser } } = await supabaseAdmin.auth.admin.getUserById(todo.assigned_to);
                  assignedUserName = assignedUser?.email ? assignedUser.email.split('@')[0] : '';
                } catch (adminError) {
                  assignedUserName = `user_${todo.assigned_to.substring(0, 8)}`;
                }
              } else {
                assignedUserName = `user_${todo.assigned_to.substring(0, 8)}`;
              }
            }
          }

          return {
            ...todo,
            user_name: creatorName,
            assigned_user_name: assignedUserName
          };
        } catch (error) {
          console.error('Error fetching user data for todo:', error);
          return {
            ...todo,
            user_name: `user_${todo.user_id.substring(0, 8)}`,
            assigned_user_name: todo.assigned_to ? `user_${todo.assigned_to.substring(0, 8)}` : ''
          };
        }
      })
    );

    // Log filtered results for debugging
    console.log('Processed todos:', todosWithUserNames.length);
    if (!['admin', 'operations'].includes(currentRole)) {
      const assignedTodos = todosWithUserNames.filter(t => t.assigned_to === user?.id);
      const createdTodos = todosWithUserNames.filter(t => t.user_id === user?.id);
      console.log(`Assigned to user: ${assignedTodos.length}, Created by user: ${createdTodos.length}`);
    }

    setTodos(todosWithUserNames);
  } catch (error) {
    console.error('Error fetching todos:', error);
  } finally {
    setLoading(false);
  }
};

  // Permission checks
  const canManageAllTasks = useCallback((role = userRole) => {
    return ['admin', 'operations'].includes(role);
  }, [userRole]);

  const canReassignTasks = useCallback((role = userRole) => {
    return ['admin', 'operations'].includes(role);
  }, [userRole]);

  const canDeleteTask = useCallback((todo: Todo, role = userRole) => {
    if (['admin', 'operations'].includes(role)) return true;
    return todo.user_id === user?.id;
  }, [userRole, user]);

  // Filter reset functions
  const resetDateFilter = useCallback(() => {
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  }, []);

  const resetBranchCountryFilter = useCallback(() => {
    setBranchFilter('');
    setCountryFilter('');
  }, []);

  const resetAllFilters = useCallback(() => {
    resetDateFilter();
    resetBranchCountryFilter();
  }, [resetDateFilter, resetBranchCountryFilter]);

  const hasActiveFilters = useCallback(() => {
    return dateFilter !== 'all' || branchFilter || countryFilter;
  }, [dateFilter, branchFilter, countryFilter]);

  // Todo actions
  const toggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          completed: !completed, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }, []);

  const reassignTask = useCallback(async (id: string, assigned_to: string | null) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          assigned_to,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error reassigning task:', error);
    }
  }, []);

  // UI Components
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  const EmptyState = () => (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg p-16 text-center border border-slate-200/60">
      <div className="w-20 h-20 bg-gradient-to-br  to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <RadioTower className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-xl font-base text-slate-900 mb-2">
        {todos.length === 0 ? 'No Tasks Yet' : 'No Tasks Match Your Filter'}
      </h3>
      <p className="text-xs text-slate-500">
        {todos.length === 0 
          ? 'Create your first task to get started' 
          : 'Try adjusting your filters to see more results'
        }
      </p>
      {todos.length > 0 && hasActiveFilters() && (
        <button
          onClick={resetAllFilters}
          className="mt-4 text-blue-500 hover:text-blue-700 text-xs font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  const BranchCountryFilterDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setShowBranchCountryFilter(!showBranchCountryFilter)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-slate-200 text-xs"
      >
        <Building className="w-4 h-4" />
        Branch & Country
        {(branchFilter || countryFilter) && (
          <span className="bg-blue-500 text-white rounded-full w-2 h-2"></span>
        )}
      </button>

      {/* Branch & Country Filter Dropdown */}
      {showBranchCountryFilter && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Filter by Branch & Country</h3>
            <button 
              onClick={() => setShowBranchCountryFilter(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Branch Filter - Fixed with direct state update */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Branch Name</label>
            <input
              type="text"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              placeholder="Search branch name..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
            />
            {availableBranches.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto">
                {availableBranches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => setBranchFilter(branch)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                      branchFilter === branch
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Country Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Country</label>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
            >
              <option value="">All Countries</option>
              {TODO_CONSTANTS.countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Info */}
          {(branchFilter || countryFilter) && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex flex-wrap gap-2 mb-3">
                {branchFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    Branch: {branchFilter}
                    <button onClick={() => setBranchFilter('')} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {countryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                    Country: {getCountryName(countryFilter)}
                    <button onClick={() => setCountryFilter('')} className="text-purple-500 hover:text-purple-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={resetBranchCountryFilter}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium"
              >
                Clear branch & country filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const DateFilterDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setShowDateFilter(!showDateFilter)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-slate-200 text-xs"
      >
        <Filter className="w-4 h-4" />
        Filter by Date
        {dateFilter !== 'all' && (
          <span className="bg-blue-500 text-white rounded-full w-2 h-2"></span>
        )}
      </button>

      {/* Date Filter Dropdown */}
      {showDateFilter && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Filter by Date</h3>
            <button 
              onClick={() => setShowDateFilter(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Options */}
          <div className="space-y-2 mb-4">
            {dateFilterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  setDateFilter(option.value);
                  if (option.value !== 'custom') {
                    setShowDateFilter(false);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  dateFilter === option.value
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {dateFilter === 'custom' && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDateFilter(false)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition-all text-xs"
                >
                  Apply Filter
                </button>
                <button
                  onClick={resetDateFilter}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold transition-all text-xs"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Active Filter Info */}
          {dateFilter !== 'all' && dateFilter !== 'custom' && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                Showing: {dateFilterOptions.find(opt => opt.value === dateFilter)?.label}
              </p>
              <button
                onClick={resetDateFilter}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium mt-2"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const TodoItem = ({ todo }: { todo: Todo }) => {
    const isAssignedToMe = todo.assigned_to === user?.id;
    const isCreatedByMe = todo.user_id === user?.id;
    
    return (
      <div
        className={`group bg-white/70 backdrop-blur-xl rounded-2xl shadow-md hover:shadow-xl p-5 border border-slate-200/60 transition-all duration-300 hover:scale-[1.02] flex flex-col h-full ${
          todo.completed ? 'opacity-60 hover:opacity-100' : ''
        } ${isAssignedToMe ? 'border-l-4 border-l-blue-500' : ''}`}
      >
        {/* Header with title and delete button */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-1 pr-2">
            <button
              onClick={() => toggleComplete(todo.id, todo.completed)}
              className={`flex-shrink-0 transition-all transform hover:scale-110 ${
                todo.completed 
                  ? 'text-green-500 hover:text-slate-400' 
                  : 'text-slate-300 hover:text-blue-600'
              }`}
            >
              {todo.completed ? (
                <Check className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                <Circle className="w-5 h-5" strokeWidth={2.5} />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold leading-tight ${todo.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                  {todo.title}
                </h3>
                {isAssignedToMe && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                    <User className="w-3 h-3" />
                    Assigned to Me
                  </span>
                )}
              </div>
              
              {/* Show creator/assignee info */}
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                {isCreatedByMe && <span>Created by me</span>}
                {!isCreatedByMe && todo.user_name && (
                  <span>By: {todo.user_name}</span>
                )}
                {isAssignedToMe && !isCreatedByMe && (
                  <span className="text-blue-600 font-medium">✓ Assigned to me</span>
                )}
              </div>
            </div>
          </div>
          {canDeleteTask(todo) && (
            <button
              onClick={() => handleDelete(todo.id)}
              className="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(todo.priority)}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(todo.priority)}`} />
            {todo.priority}
          </span>
          
          {todo.assigned_to && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
              <User className="w-3 h-3" />
              {todo.assigned_user_name 
                ? (todo.assigned_to === user?.id ? 'Me' : todo.assigned_user_name)
                : 'Assigned'
              }
            </span>
          )}

          {todo.due_date && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${
              new Date(todo.due_date) < new Date() && !todo.completed
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <Calendar className="w-3 h-3" />
              {new Date(todo.due_date).toLocaleDateString()}
            </span>
          )}

          {/* Branch and Country Tags */}
          {(todo.branch_name || todo.country) && (
            <>
              {todo.branch_name && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                  <Building className="w-3 h-3" />
                  {todo.branch_name}
                </span>
              )}
              {todo.country && todo.country !== 'XX' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                  <ReactCountryFlag
                    countryCode={todo.country}
                    svg
                    style={{
                      width: '1em',
                      height: '1em',
                    }}
                    title={getCountryName(todo.country)}
                  />
                  {getCountryName(todo.country)}
                </span>
              )}
              {todo.country === 'XX' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                  <Globe className="w-3 h-3" />
                  Other
                </span>
              )}
            </>
          )}
        </div>

        {/* Assignment Section */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Assign to:</span>
              <div className="relative">
                <select
                  value={todo.assigned_to || ''}
                  onChange={(e) => reassignTask(todo.id, e.target.value || null)}
                  disabled={!canReassignTasks()}
                  className={`text-xs bg-transparent border-none focus:outline-none focus:ring-0 pr-6 appearance-none font-medium text-slate-700 ${
                    canReassignTasks() 
                      ? 'cursor-pointer hover:text-slate-900' 
                      : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {getDisplayName(member.name, member.email)}
                      {member.id === user?.id && ' (Me)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span className="font-medium">
                {new Date(todo.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  const activeTodos = filteredTodos.filter((t) => !t.completed);
  const completedTodos = filteredTodos.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Task Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {activeTodos.length} active • {completedTodos.length} completed • {teamMembers.length} team members
              {!canManageAllTasks() && ' (only your tasks)'}
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getRoleColor(userRole)}`}>
              {getRoleIcon(userRole)}
              {userRole}
              {roleLoading && '...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Branch & Country Filter */}
          <BranchCountryFilterDropdown />

          {/* Date Filter */}
          <DateFilterDropdown />

          {/* Clear All Filters Button */}
          {hasActiveFilters() && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all text-xs"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Add Dashboard Summary for regular users */}
      <DashboardSummary 
        filteredTodos={filteredTodos}
        user={user}
        canManageAllTasks={canManageAllTasks()}
      />

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Active Filters:</span>
              <div className="flex flex-wrap gap-2">
                {dateFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    <Calendar className="w-3 h-3" />
                    {dateFilterOptions.find(opt => opt.value === dateFilter)?.label}
                    <button onClick={resetDateFilter} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {branchFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    <Building className="w-3 h-3" />
                    Branch: {branchFilter}
                    <button onClick={() => setBranchFilter('')} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {countryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                    <Globe className="w-3 h-3" />
                    Country: {getCountryName(countryFilter)}
                    <button onClick={() => setCountryFilter('')} className="text-purple-500 hover:text-purple-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={resetAllFilters}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      <TodoFormModal 
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        teamMembers={teamMembers}
        user={user}
      />

      {filteredTodos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </div>
      )}
    </div>
  );
}
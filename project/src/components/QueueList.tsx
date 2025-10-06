import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, DollarSign, Tag, AlertCircle, Clock, Trash2, X, Building, Globe, ChevronDown, Upload, FileText, Image, Download, Check, X as XIcon, MessageSquare, User, Shield, Calendar, Filter, Plane, RadioTower } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';

type Queue = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  amount: number | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  branch_name: string | null;
  country: string | null;
  receipt_url: string | null;
  receipt_name: string | null;
  decisions?: Decision[];
  user_email?: string; 
};

type Decision = {
  id: string;
  queue_id: string;
  user_id: string;
  status: string;
  comment: string | null;
  created_at: string;
  user_email?: string;
};

const categories = ['expense', 'request', 'petty cash', 'travel', 'supplies', 'other'];
const statuses = ['pending', 'approved', 'rejected', 'completed'];
const priorities = ['low', 'medium', 'high'];

const countries = [
  { name: 'Kenya', code: 'KE' },
  { name: 'South Sudan', code: 'SS' },
  { name: 'Other', code: 'XX' }
];

const ACCEPTED_FILE_TYPES = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

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

export function QueueList() {
  const { user } = useAuth();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [filteredQueues, setFilteredQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'expense',
    priority: 'medium',
    branchName: '',
    country: '',
    receipt: null as File | null
  });

  // Fixed: Fetch user role first, then fetch queues
  useEffect(() => {
    if (user) {
      fetchUserRoleAndQueues();
    }
  }, [user]);

  // Extract available branches from queues
  useEffect(() => {
    if (queues.length > 0) {
      const branches = [...new Set(queues
        .map(q => q.branch_name)
        .filter(Boolean) as string[]
      )].sort();
      setAvailableBranches(branches);
    }
  }, [queues]);

  // Apply all filters when queues or filter settings change
  useEffect(() => {
    applyAllFilters();
  }, [queues, dateFilter, customStartDate, customEndDate, branchFilter, countryFilter]);

  const applyAllFilters = () => {
    if (!queues.length) {
      setFilteredQueues([]);
      return;
    }

    let filtered = [...queues];

    // Apply date filter
    filtered = applyDateFilterToQueues(filtered);

    // Apply branch filter
    if (branchFilter) {
      filtered = filtered.filter(queue => 
        queue.branch_name?.toLowerCase().includes(branchFilter.toLowerCase())
      );
    }

    // Apply country filter
    if (countryFilter) {
      filtered = filtered.filter(queue => queue.country === countryFilter);
    }

    setFilteredQueues(filtered);
  };

  const applyDateFilterToQueues = (queuesToFilter: Queue[]) => {
    if (dateFilter === 'all') {
      return queuesToFilter;
    }

    const now = new Date();
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOfWeek = (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };
    const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

    let filtered = [...queuesToFilter];

    switch (dateFilter) {
      case 'today':
        const today = startOfDay(now);
        filtered = filtered.filter(queue => 
          startOfDay(new Date(queue.created_at)).getTime() === today.getTime()
        );
        break;

      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = startOfDay(yesterday);
        filtered = filtered.filter(queue => 
          startOfDay(new Date(queue.created_at)).getTime() === yesterdayStart.getTime()
        );
        break;

      case 'thisWeek':
        const thisWeekStart = startOfWeek(new Date(now));
        filtered = filtered.filter(queue => 
          new Date(queue.created_at) >= thisWeekStart
        );
        break;

      case 'lastWeek':
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekStartDate = startOfWeek(lastWeekStart);
        const lastWeekEndDate = new Date(lastWeekStartDate);
        lastWeekEndDate.setDate(lastWeekEndDate.getDate() + 6);
        filtered = filtered.filter(queue => {
          const queueDate = new Date(queue.created_at);
          return queueDate >= lastWeekStartDate && queueDate <= lastWeekEndDate;
        });
        break;

      case 'thisMonth':
        const thisMonthStart = startOfMonth(now);
        filtered = filtered.filter(queue => 
          new Date(queue.created_at) >= thisMonthStart
        );
        break;

      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        filtered = filtered.filter(queue => {
          const queueDate = new Date(queue.created_at);
          return queueDate >= lastMonthStart && queueDate <= lastMonthEnd;
        });
        break;

      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter(queue => {
            const queueDate = new Date(queue.created_at);
            return queueDate >= start && queueDate <= end;
          });
        }
        break;
    }

    return filtered;
  };

  const fetchUserRoleAndQueues = async () => {
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
      
      // Now fetch queues with the correct role
      await fetchQueues(role);
    } catch (error) {
      console.error('Error in fetchUserRoleAndQueues:', error);
      setUserRole('user');
      await fetchQueues('user');
    } finally {
      setRoleLoading(false);
    }
  };

  const fetchQueues = async (explicitRole?: string) => {
    const currentRole = explicitRole !== undefined ? explicitRole : userRole;
    
    console.log('Fetching queues with role:', currentRole);
    
    try {
      let query = supabase
        .from('queues')
        .select('*')
        .order('created_at', { ascending: false });

      if (!['admin', 'operations'].includes(currentRole)) {
        console.log('Filtering to user-only queues');
        query = query.eq('user_id', user.id);
      } else {
        console.log('Showing all queues for role:', currentRole);
      }

      const { data: queuesData, error } = await query;

      if (error) throw error;

      // Fetch user emails separately to avoid relationship errors
      const queuesWithUserEmails = await Promise.all(
        (queuesData || []).map(async (queue) => {
          try {
            // Get user email for the queue creator
            const { data: userData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', queue.user_id)
              .single();

            // Get decisions with user emails
            const { data: decisions } = await supabase
              .from('decisions')
              .select('*')
              .eq('queue_id', queue.id)
              .order('created_at', { ascending: false });

            // Get decision maker emails
            const decisionsWithEmails = await Promise.all(
              (decisions || []).map(async (decision) => {
                const { data: decisionUserData } = await supabase
                  .from('profiles')
                  .select('email')
                  .eq('id', decision.user_id)
                  .single();

                return {
                  ...decision,
                  user_email: decisionUserData?.email
                };
              })
            );

            return {
              ...queue,
              user_email: userData?.email,
              decisions: decisionsWithEmails || []
            };
          } catch (error) {
            console.error('Error fetching user data for queue:', error);
            return {
              ...queue,
              user_email: '',
              decisions: []
            };
          }
        })
      );

      setQueues(queuesWithUserEmails);
    } catch (error) {
      console.error('Error fetching queues:', error);
    } finally {
      setLoading(false);
    }
  };

  const canApproveReject = (role = userRole) => {
    return ['admin', 'operations'].includes(role);
  };

  const canApproveExpense = (amount: number | null, role = userRole) => {
    if (!amount) return true;
    
    if (role === 'admin') {
      return true;
    }
    
    if (role === 'operations') {
      return amount <= 500;
    }
    
    return false;
  };

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!selectedQueue || !user) return;

    try {
      const { error: queueError } = await supabase
        .from('queues')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', selectedQueue.id);

      if (queueError) throw queueError;

      try {
        const { error: decisionError } = await supabase
          .from('decisions')
          .insert([{
            queue_id: selectedQueue.id,
            user_id: user.id,
            status,
            comment: decisionComment || null,
            created_at: new Date().toISOString()
          }]);

        if (decisionError) {
          console.warn('Could not save decision:', decisionError);
        }
      } catch (decisionError) {
        console.warn('Could not save decision:', decisionError);
      }

      setShowDecisionModal(false);
      setSelectedQueue(null);
      setDecisionComment('');
      fetchQueues();
    } catch (error) {
      console.error('Error making decision:', error);
      alert('Error updating status. Please try again.');
    }
  };

  const openDecisionModal = (queue: Queue, status: 'approved' | 'rejected') => {
    if (status === 'approved' && queue.amount && !canApproveExpense(queue.amount, userRole)) {
      alert('Only admin can approve expenses above $500');
      return;
    }
    
    setSelectedQueue({...queue, status});
    setDecisionComment('');
    setShowDecisionModal(true);
  };

  const handleFileUpload = async (file: File, queueId: string) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${queueId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('queues')
        .update({
          receipt_url: publicUrl,
          receipt_name: file.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (updateError) throw updateError;

      fetchQueues();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Error uploading receipt. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setUploading(true);

      const { data: queueData, error } = await supabase
        .from('queues')
        .insert([{
          user_id: user.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          category: formData.category,
          priority: formData.priority,
          status: 'pending',
          branch_name: formData.branchName.trim() || null,
          country: formData.country || null,
          receipt_url: null,
          receipt_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (formData.receipt && queueData) {
        await handleFileUpload(formData.receipt, queueData.id);
      }

      setFormData({ 
        title: '', 
        description: '', 
        amount: '', 
        category: 'expense', 
        priority: 'medium',
        branchName: '',
        country: '',
        receipt: null
      });
      setShowForm(false);
      fetchQueues();
    } catch (error) {
      console.error('Error creating queue:', error);
      alert('Error creating queue item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { data: queue } = await supabase
        .from('queues')
        .select('receipt_url')
        .eq('id', id)
        .single();

      if (queue?.receipt_url) {
        const fileName = queue.receipt_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('receipts')
            .remove([`${id}/${fileName}`]);
        }
      }

      const { error } = await supabase.from('queues').delete().eq('id', id);
      if (error) throw error;
      fetchQueues();
    } catch (error) {
      console.error('Error deleting queue:', error);
    }
  };

  const handleReceiptUpload = async (file: File, queueId: string) => {
    await handleFileUpload(file, queueId);
  };

  const handleReceiptDelete = async (queueId: string) => {
    try {
      const { data: queue } = await supabase
        .from('queues')
        .select('receipt_url')
        .eq('id', queueId)
        .single();

      if (queue?.receipt_url) {
        const fileName = queue.receipt_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('receipts')
            .remove([`${queueId}/${fileName}`]);
        }
      }

      const { error } = await supabase
        .from('queues')
        .update({
          receipt_url: null,
          receipt_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (error) throw error;
      fetchQueues();
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = Object.values(ACCEPTED_FILE_TYPES)
      .flat()
      .includes(fileExtension);

    if (!isValidType) {
      alert('Please select a valid file type (images, PDF, or Word documents)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setFormData({ ...formData, receipt: file });
  };

  const isFormValid = () => {
    return formData.title.trim() !== '';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <Image className="w-3 h-3" />;
    } else if (fileName.match(/\.(pdf)$/i)) {
      return <FileText className="w-3 h-3" />;
    } else {
      return <FileText className="w-3 h-3" />;
    }
  };

  const getCountryName = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.name : countryCode;
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'operations': return <User className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = () => {
    switch (userRole) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'operations': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const resetDateFilter = () => {
    setDateFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const resetBranchCountryFilter = () => {
    setBranchFilter('');
    setCountryFilter('');
  };

  const resetAllFilters = () => {
    resetDateFilter();
    resetBranchCountryFilter();
  };

  const hasActiveFilters = () => {
    return dateFilter !== 'all' || branchFilter || countryFilter;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Queue Items</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {filteredQueues.length} of {queues.length} items
              {!['admin', 'operations'].includes(userRole) && ' (only your items)'}
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getRoleColor()}`}>
              {getRoleIcon()}
              {userRole}
              {roleLoading && '...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Branch & Country Filter Button */}
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

                {/* Branch Filter */}
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
                    {countries.map(country => (
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

          {/* Date Filter Button */}
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
            New Item
          </button>
        </div>
      </div>

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

      {/* Decision Modal */}
      {showDecisionModal && selectedQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                {selectedQueue.status === 'approved' ? 'Approve' : 'Reject'} Item
              </h3>
              <button 
                onClick={() => setShowDecisionModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-semibold text-slate-900 mb-2">{selectedQueue.title}</h4>
                {selectedQueue.amount && (
                  <p className="text-sm text-slate-600">
                    Amount: ${selectedQueue.amount.toFixed(2)}
                    {selectedQueue.amount > 500 && userRole === 'operations' && (
                      <span className="text-amber-600 text-xs ml-2">(Requires admin approval)</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-slate-500">Category: {selectedQueue.category}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400 text-sm"
                  rows={3}
                  placeholder="Add a comment for your decision..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDecision(selectedQueue.status as 'approved' | 'rejected')}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all text-sm ${
                    selectedQueue.status === 'approved'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
                >
                  Confirm {selectedQueue.status}
                </button>
                <button
                  onClick={() => setShowDecisionModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold text-slate-900">Create New Queue Item</h3>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setFormData({ 
                    title: '', 
                    description: '', 
                    amount: '', 
                    category: 'expense', 
                    priority: 'medium',
                    branchName: '',
                    country: '',
                    receipt: null
                  });
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs"
                      placeholder="Enter item title"
                      required
                      minLength={1}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400 text-xs"
                      rows={3}
                      placeholder="Add a description (optional)"
                      maxLength={500}
                    />
                    <div className="text-right text-xs text-slate-400 mt-1">
                      {formData.description.length}/500
                    </div>
                  </div>

                  {/* Receipt Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Receipt (Optional)
                    </label>
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${
                      formData.receipt 
                        ? 'border-green-300 bg-green-50/50' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}>
                      <input
                        type="file"
                        id="receipt-upload"
                        onChange={handleFileChange}
                        className="hidden"
                        accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                      />
                      <label htmlFor="receipt-upload" className="cursor-pointer block">
                        <div className="text-center">
                          {formData.receipt ? (
                            <FileText className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          ) : (
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          )}
                          <p className="text-xs text-slate-600 font-medium mb-1">
                            {formData.receipt ? formData.receipt.name : 'Click to upload receipt'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Supports: JPG, PNG, PDF, DOC (Max 5MB)
                          </p>
                          {formData.receipt && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, receipt: null });
                              }}
                              className="mt-2 text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              Remove file
                            </button>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Right Column - Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Amount</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer text-xs"
                      >
                        {priorities.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Branch and Country Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Branch Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formData.branchName}
                          onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                          className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs"
                          placeholder="Enter branch name"
                          maxLength={100}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Country</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                        <select
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full pl-9 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer text-xs relative z-0"
                        >
                          <option value="">Select country</option>
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                            formData.category === cat
                              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

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
                  disabled={uploading || !isFormValid()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-xs disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Queue Item'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ 
                      title: '', 
                      description: '', 
                      amount: '', 
                      category: 'expense', 
                      priority: 'medium',
                      branchName: '',
                      country: '',
                      receipt: null
                    });
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-semibold transition-all text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Queue Items Grid */}
      {filteredQueues.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg p-16 text-center border border-slate-200/60">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100  rounded-2xl flex items-center justify-center mx-auto mb-6">
            <RadioTower className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-base text-slate-900 mb-2">
            {queues.length === 0 ? 'No Items Yet' : 'No Items Match Your Filter'}
          </h3>
          <p className="text-xs text-slate-500">
            {queues.length === 0 
              ? 'Create your first queue item to get started' 
              : 'Try adjusting your filters to see more results'
            }
          </p>
          {queues.length > 0 && hasActiveFilters() && (
            <button
              onClick={resetAllFilters}
              className="mt-4 text-blue-500 hover:text-blue-700 text-xs font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredQueues.map((queue) => (
            <div
              key={queue.id}
              className="group bg-white/70 backdrop-blur-xl rounded-2xl shadow-md hover:shadow-xl p-5 border border-slate-200/60 transition-all duration-300 hover:scale-[1.02] flex flex-col h-full"
            >
              {/* Header with title and delete button */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight flex-1 pr-2 line-clamp-2">
                  {queue.title}
                </h3>
                {queue.user_id === user?.id && (
                  <button
                    onClick={() => handleDelete(queue.id)}
                    className="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Show creator email for admin/operations */}
              {['admin', 'operations'].includes(userRole) && queue.user_email && (
                <p className="text-xs text-slate-500 mb-2">By: {queue.user_email}</p>
              )}

              {/* Description */}
              {queue.description && (
                <p className="text-slate-600 text-xs leading-relaxed mb-3 line-clamp-2 flex-1">
                  {queue.description}
                </p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {queue.amount && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                    <DollarSign className="w-3 h-3" />
                    {queue.amount.toFixed(2)}
                    {queue.amount > 500 && (
                      <span className="text-xs">⚠️</span>
                    )}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(queue.priority)}`}>
                  <AlertCircle className="w-3 h-3" />
                  {queue.priority}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200">
                  <Tag className="w-3 h-3" />
                  {queue.category}
                </span>
              </div>

              {/* Receipt Section */}
              <div className="mb-3">
                {queue.receipt_url ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      {getFileIcon(queue.receipt_name || '')}
                      <span className="text-xs font-medium text-green-700 truncate flex-1">
                        {queue.receipt_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={queue.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-green-600 hover:text-green-800 transition-colors"
                        title="Download receipt"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleReceiptDelete(queue.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove receipt"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      id={`receipt-${queue.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleReceiptUpload(file, queue.id);
                      }}
                      className="hidden"
                      accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                    />
                    <label
                      htmlFor={`receipt-${queue.id}`}
                      className="flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600 font-medium">Upload receipt</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Branch and Country Info (if available) */}
              {(queue.branch_name || queue.country) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {queue.branch_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                      <Building className="w-3 h-3" />
                      {queue.branch_name}
                    </span>
                  )}
                  {queue.country && queue.country !== 'XX' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                      <ReactCountryFlag
                        countryCode={queue.country}
                        svg
                        style={{
                          width: '1em',
                          height: '1em',
                        }}
                        title={getCountryName(queue.country)}
                      />
                      {getCountryName(queue.country)}
                    </span>
                  )}
                  {queue.country === 'XX' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                      <Globe className="w-3 h-3" />
                      Other
                    </span>
                  )}
                </div>
              )}

              {/* Decision History */}
              {queue.decisions && queue.decisions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-slate-700 mb-2">Decision History</div>
                  <div className="space-y-2">
                    {queue.decisions.map((decision) => (
                      <div key={decision.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          decision.status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold ${
                              decision.status === 'approved' ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {decision.status}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(decision.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {decision.comment && (
                            <p className="text-xs text-slate-600 mt-1">{decision.comment}</p>
                          )}
                          {decision.user_email && (
                            <p className="text-xs text-slate-400 mt-1">by {decision.user_email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status buttons and date */}
              <div className="mt-auto pt-3 border-t border-slate-100">
                {/* Approval/Rejection buttons for admin/operations */}
                {canApproveReject() && queue.status === 'pending' && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => openDecisionModal(queue, 'approved')}
                      disabled={queue.amount && !canApproveExpense(queue.amount, userRole)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        queue.amount && !canApproveExpense(queue.amount, userRole)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
                      }`}
                      title={
                        queue.amount && !canApproveExpense(queue.amount, userRole)
                          ? 'Only admin can approve expenses above $500'
                          : 'Approve'
                      }
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => openDecisionModal(queue, 'rejected')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-105"
                    >
                      <XIcon className="w-3 h-3" />
                      Reject
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(queue.status)}`}>
                    {queue.status}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    {new Date(queue.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
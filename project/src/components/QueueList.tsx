import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, HandCoins, Tag, AlertCircle, Clock, Trash2, X, Building, Globe, ChevronDown, Upload, FileText, Image, Download, Check, X as XIcon, MessageSquare, User, Shield, Calendar, Filter, Plane, RadioTower, Edit2, Save, ChevronLeft, ChevronRight, Share2, Mail, MessageCircle, Receipt, FileDigit } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';

// Constants-driven architecture
const QUEUE_CONSTANTS = {
  categories: ['expense', 'request', 'petty cash', 'travel', 'supplies', 'other'] as const,
  statuses: ['pending', 'approved', 'rejected', 'amended', 'completed'] as const,
  priorities: ['low', 'medium', 'high'] as const,
  currencies: ['USD', 'KES', 'SSP'] as const,
  branches: ['All', 'Juba', 'Nairobi'] as const,
  countries: [
    { name: 'All', code: 'ALL' },
    { name: 'Kenya', code: 'KE' },
    { name: 'South Sudan', code: 'SS' },
    { name: 'Other', code: 'XX' }
  ] as const,
  itemsPerPage: 6,
  tabs: ['all', 'pending', 'approved', 'rejected', 'amended', 'my-items', 'requires-attention'] as const,
  viewTabs: ['details', 'receipts'] as const
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

const ACCEPTED_FILE_TYPES = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// Fallback currency rates
const FALLBACK_RATES = {
  USD: 1,
  KES: 150,
  SSP: 1000
};

// Currency conversion service
const CURRENCY_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
let ratesCache = {
  timestamp: 0,
  data: null
};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const getLiveConversionRates = async () => {
  if (ratesCache.data && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
    return ratesCache.data;
  }

  try {
    const response = await fetch(CURRENCY_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch conversion rates');
    }
    
    const data = await response.json();
    
    ratesCache = {
      timestamp: Date.now(),
      data: data.rates
    };
    
    return data.rates;
  } catch (error) {
    console.error('Error fetching live conversion rates:', error);
    return FALLBACK_RATES;
  }
};

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  try {
    const rates = await getLiveConversionRates();
    
    if (!rates[toCurrency] || !rates[fromCurrency]) {
      console.warn(`Rate not available for ${fromCurrency} or ${toCurrency}, using fallback`);
      const amountInUSD = amount / FALLBACK_RATES[fromCurrency];
      return amountInUSD * FALLBACK_RATES[toCurrency];
    }
    
    const amountInUSD = amount / rates[fromCurrency];
    return amountInUSD * rates[toCurrency];
  } catch (error) {
    console.error('Error converting currency, using fallback:', error);
    const amountInUSD = amount / FALLBACK_RATES[fromCurrency];
    return amountInUSD * FALLBACK_RATES[toCurrency];
  }
};

// Sync conversion function for immediate use (uses cached rates)
const convertCurrencySync = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  const rates = ratesCache.data || FALLBACK_RATES;
  
  if (!rates[toCurrency] || !rates[fromCurrency]) {
    const amountInUSD = amount / FALLBACK_RATES[fromCurrency];
    return amountInUSD * FALLBACK_RATES[toCurrency];
  }
  
  const amountInUSD = amount / rates[fromCurrency];
  return amountInUSD * rates[toCurrency];
};

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
  invoice_url: string | null;
  invoice_name: string | null;
  currency: string;
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

// Utility functions
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
    case 'amended': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'completed': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
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

const getCountryName = (countryCode: string) => {
  const country = QUEUE_CONSTANTS.countries.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
};

const formatCurrency = (amount: number, currency: string) => {
  const symbols = {
    USD: '$',
    KES: 'KSh ',
    SSP: 'SSP '
  };
  
  return `${symbols[currency as keyof typeof symbols] || ''}${amount.toFixed(2)}`;
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

// Share Options Component
const ShareOptions = ({ queue, onClose }: { queue: Queue; onClose: () => void }) => {
  const generateShareMessage = () => {
    const amountText = queue.amount 
      ? `Amount: ${formatCurrency(queue.amount, queue.currency)}${queue.currency !== 'USD' ? ` ($${convertCurrencySync(queue.amount, queue.currency, 'USD').toFixed(2)} USD)` : ''}`
      : '';

    const branchText = queue.branch_name ? `Branch: ${queue.branch_name}` : '';
    const countryText = queue.country && queue.country !== 'ALL' && queue.country !== 'XX' 
      ? `Country: ${getCountryName(queue.country)}` 
      : '';

    return `Queue Item: ${queue.title}

${queue.description ? `Description: ${queue.description}` : ''}
${amountText}
Category: ${queue.category}
Priority: ${queue.priority}
Status: ${queue.status}
${branchText}
${countryText}

Created: ${new Date(queue.created_at).toLocaleDateString()}`.trim();
  };

  const shareViaWhatsApp = () => {
    const message = generateShareMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const shareViaEmail = () => {
    const message = generateShareMessage();
    const subject = `Queue Item: ${queue.title}`;
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(message);
    const mailtoUrl = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
    window.location.href = mailtoUrl;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Share Queue Item</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="space-y-3">
            <button
              onClick={shareViaWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-base transition-all text-xs"
            >
              <MessageCircle className="w-3 h-3" />
              Share via WhatsApp
            </button>
            
            <button
              onClick={shareViaEmail}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl font-base transition-all text-xs"
            >
              <Mail className="w-3 h-3" />
              Share via Email
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Form Components
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

const FormTextarea = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required 
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) => {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs resize-none"
        placeholder={placeholder}
        required={required}
        rows={3}
      />
    </div>
  );
};

// Dashboard Summary Component
const DashboardSummary = ({ 
  filteredQueues, 
  user, 
  canManageAllQueues 
}: { 
  filteredQueues: Queue[];
  user: any;
  canManageAllQueues: boolean;
}) => {
  const pendingQueues = filteredQueues.filter(queue => queue.status === 'pending');
  const myPendingQueues = filteredQueues.filter(queue => 
    queue.user_id === user?.id && queue.status === 'pending'
  );
  const highPriorityQueues = filteredQueues.filter(queue => 
    queue.priority === 'high' && queue.status === 'pending'
  );
  const requiresAttentionQueues = filteredQueues.filter(queue => 
    queue.amount && convertCurrencySync(queue.amount, queue.currency, 'USD') > 500 && queue.status === 'pending'
  );

  if (canManageAllQueues) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">My Queue Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{myPendingQueues.length}</div>
          <div className="text-xs text-slate-600">My Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{highPriorityQueues.filter(q => q.user_id === user?.id).length}</div>
          <div className="text-xs text-slate-600">High Priority</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {requiresAttentionQueues.filter(q => q.user_id === user?.id).length}
          </div>
          <div className="text-xs text-slate-600">Requires Attention</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {filteredQueues.filter(q => q.user_id === user?.id && q.status === 'approved').length}
          </div>
          <div className="text-xs text-slate-600">Approved</div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Queue Form Modal
const QueueFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  user,
  editingQueue,
  onUpdate
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  user: any;
  editingQueue?: Queue | null;
  onUpdate?: (id: string, formData: any) => void;
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'expense',
    priority: 'medium',
    branchName: '',
    country: '',
    currency: 'USD',
    receipt: null as File | null,
    invoice: null as File | null
  });

  // Reset form when modal opens/closes or editingQueue changes
  useEffect(() => {
    if (isOpen) {
      if (editingQueue) {
        setFormData({
          title: editingQueue.title,
          description: editingQueue.description || '',
          amount: editingQueue.amount?.toString() || '',
          category: editingQueue.category,
          priority: editingQueue.priority,
          branchName: editingQueue.branch_name || '',
          country: editingQueue.country || '',
          currency: editingQueue.currency,
          receipt: null,
          invoice: null
        });
      } else {
        setFormData({
          title: '',
          description: '',
          amount: '',
          category: 'expense',
          priority: 'medium',
          branchName: '',
          country: '',
          currency: 'USD',
          receipt: null,
          invoice: null
        });
      }
    }
  }, [isOpen, editingQueue]);

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    if (formData.amount && formData.currency) {
      const currentAmount = parseFloat(formData.amount);
      if (!isNaN(currentAmount)) {
        const convertedAmount = await convertCurrency(currentAmount, formData.currency, newCurrency);
        setFormData({
          ...formData,
          currency: newCurrency,
          amount: convertedAmount.toFixed(2)
        });
      } else {
        setFormData({
          ...formData,
          currency: newCurrency
        });
      }
    } else {
      setFormData({
        ...formData,
        currency: newCurrency
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQueue && onUpdate) {
      onUpdate(editingQueue.id, formData);
    } else {
      onSubmit(formData);
    }
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'receipt' | 'invoice') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = Object.values(ACCEPTED_FILE_TYPES)
      .flat()
      .includes(fileExtension);

    if (!isValidType) {
      alert('Please select a valid file type (images, PDF, or Word documents)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setFormData({ ...formData, [field]: file });
  };

  const isFormValid = () => {
    return formData.title.trim() !== '' &&
           formData.amount.trim() !== '' &&
           formData.category.trim() !== '' &&
           formData.priority.trim() !== '' &&
           formData.branchName.trim() !== '' &&
           formData.country.trim() !== '' &&
           formData.currency.trim() !== '';
  };

  const categoryOptions = QUEUE_CONSTANTS.categories.map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1)
  }));

  const priorityOptions = QUEUE_CONSTANTS.priorities.map(priority => ({
    value: priority,
    label: priority.charAt(0).toUpperCase() + priority.slice(1)
  }));

  const currencyOptions = QUEUE_CONSTANTS.currencies.map(currency => ({
    value: currency,
    label: currency
  }));

  const branchOptions = QUEUE_CONSTANTS.branches.map(branch => ({
    value: branch,
    label: branch
  }));

  const countryOptions = QUEUE_CONSTANTS.countries.map(country => ({
    value: country.code,
    label: country.name
  }));

  const renderCountryFlag = (countryCode: string, size: string = '1em') => {
    if (!countryCode || countryCode === 'ALL' || countryCode === 'XX') {
      return <Globe className="w-4 h-4" />;
    }
    
    try {
      return (
        <ReactCountryFlag
          countryCode={countryCode}
          svg
          style={{
            width: size,
            height: size,
          }}
          title={getCountryName(countryCode)}
        />
      );
    } catch (error) {
      return <Globe className="w-4 h-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">
            {editingQueue ? 'Edit Queue Item' : 'Create New Queue Item'}
          </h3>
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
              <FormInput
                label="Title"
                value={formData.title}
                onChange={(value) => handleInputChange('title', value)}
                placeholder="Enter item title"
                required
                autoFocus
              />

              <FormTextarea
                label="Description"
                value={formData.description}
                onChange={(value) => handleInputChange('description', value)}
                placeholder="Add a description (optional)"
              />

              {/* Receipt Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Receipt (Optional)
                </label>
                <div className={`border-2 border-dashed rounded-lg p-3 transition-all ${
                  formData.receipt 
                    ? 'border-green-300 bg-green-50/50' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}>
                  <input
                    type="file"
                    id="receipt-upload"
                    onChange={(e) => handleFileChange(e, 'receipt')}
                    className="hidden"
                    accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer block">
                    <div className="flex items-center gap-2">
                      {formData.receipt ? (
                        <>
                          <FileText className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-600 font-medium truncate">
                              {formData.receipt.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInputChange('receipt', null);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-600 font-medium">Upload receipt</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG, PDF, DOC (Max 5MB)</p>
                          </div>
                        </>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 text-xs"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <FormSelect
                  label="Currency"
                  value={formData.currency}
                  onChange={handleCurrencyChange}
                  options={currencyOptions}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Priority"
                  value={formData.priority}
                  onChange={(value) => handleInputChange('priority', value)}
                  options={priorityOptions}
                />

                <FormSelect
                  label="Category"
                  value={formData.category}
                  onChange={(value) => handleInputChange('category', value)}
                  options={categoryOptions}
                />
              </div>

              {/* Branch and Country Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Branch"
                  value={formData.branchName}
                  onChange={(value) => handleInputChange('branchName', value)}
                  options={branchOptions}
                  icon={Building}
                />

                <FormSelect
                  label="Country"
                  value={formData.country}
                  onChange={(value) => handleInputChange('country', value)}
                  options={countryOptions}
                  icon={Globe}
                />
              </div>

              {/* Country Preview */}
              {formData.country && formData.country !== 'XX' && formData.country !== 'ALL' && (
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Selected Country</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {renderCountryFlag(formData.country, '1.5em')}
                    <span className="text-sm font-medium text-slate-700">
                      {getCountryName(formData.country)}
                    </span>
                  </div>
                </div>
              )}

              {/* Invoice Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice (Optional)
                </label>
                <div className={`border-2 border-dashed rounded-lg p-3 transition-all ${
                  formData.invoice 
                    ? 'border-green-300 bg-green-50/50' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}>
                  <input
                    type="file"
                    id="invoice-upload"
                    onChange={(e) => handleFileChange(e, 'invoice')}
                    className="hidden"
                    accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                  />
                  <label htmlFor="invoice-upload" className="cursor-pointer block">
                    <div className="flex items-center gap-2">
                      {formData.invoice ? (
                        <>
                          <FileText className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-600 font-medium truncate">
                              {formData.invoice.name}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInputChange('invoice', null);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-medium flex-shrink-0"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-slate-600 font-medium">Upload invoice</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG, PDFs, DOC (Max 5MB)</p>
                          </div>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={!isFormValid()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-xs disabled:cursor-not-allowed"
            >
              {editingQueue ? 'Update Item' : 'Create Item'}
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

// Enhanced Queue Item Component with Tabs
const QueueItem = ({ 
  queue, 
  user, 
  userRole, 
  onDecision, 
  onDelete, 
  onEdit, 
  onShare, 
  onFileUpload, 
  onFileDelete,
  canManageAllQueues,
  canApproveReject,
  canApproveExpense 
}: { 
  queue: Queue;
  user: any;
  userRole: string;
  onDecision: (queue: Queue, status: 'approved' | 'rejected' | 'amended') => void;
  onDelete: (id: string) => void;
  onEdit: (queue: Queue) => void;
  onShare: (queue: Queue) => void;
  onFileUpload: (file: File, queueId: string, field: 'receipt' | 'invoice') => void;
  onFileDelete: (queueId: string, field: 'receipt' | 'invoice') => void;
  canManageAllQueues: boolean;
  canApproveReject: (role?: string) => boolean;
  canApproveExpense: (amount: number | null, currency: string, role?: string) => boolean;
}) => {
  const [activeViewTab, setActiveViewTab] = useState<(typeof QUEUE_CONSTANTS.viewTabs)[number]>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: queue.title,
    description: queue.description || '',
    amount: queue.amount?.toString() || '',
    category: queue.category,
    priority: queue.priority,
    branchName: queue.branch_name || '',
    country: queue.country || '',
    currency: queue.currency
  });

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('queues')
        .update({
          title: editFormData.title.trim(),
          description: editFormData.description.trim() || null,
          amount: editFormData.amount ? parseFloat(editFormData.amount) : null,
          category: editFormData.category,
          priority: editFormData.priority,
          branch_name: editFormData.branchName.trim() || null,
          country: editFormData.country || null,
          currency: editFormData.currency,
          updated_at: new Date().toISOString()
        })
        .eq('id', queue.id);

      if (error) throw error;
      
      setIsEditing(false);
      onEdit(queue);
    } catch (error) {
      console.error('Error updating queue:', error);
      alert('Error updating item. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditFormData({
      title: queue.title,
      description: queue.description || '',
      amount: queue.amount?.toString() || '',
      category: queue.category,
      priority: queue.priority,
      branchName: queue.branch_name || '',
      country: queue.country || '',
      currency: queue.currency
    });
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'receipt' | 'invoice') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = Object.values(ACCEPTED_FILE_TYPES)
      .flat()
      .includes(fileExtension);

    if (!isValidType) {
      alert('Please select a valid file type (images, PDF, or Word documents)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    onFileUpload(file, queue.id, field);
  };

  const renderCountryFlag = (countryCode: string, size: string = '1em') => {
    if (!countryCode || countryCode === 'ALL' || countryCode === 'XX') {
      return <Globe className="w-3 h-3" />;
    }
    
    try {
      return (
        <ReactCountryFlag
          countryCode={countryCode}
          svg
          style={{
            width: size,
            height: size,
          }}
          title={getCountryName(countryCode)}
        />
      );
    } catch (error) {
      return <Globe className="w-3 h-3" />;
    }
  };

  return (
    <div className="group bg-white/70 backdrop-blur-xl rounded-2xl shadow-md hover:shadow-xl p-5 border border-slate-200/60 transition-all duration-300 hover:scale-[1.02] flex flex-col h-full">
      {/* Header with title and actions */}
      <div className="flex justify-between items-start mb-3">
        {isEditing ? (
          <input
            type="text"
            value={editFormData.title}
            onChange={(e) => handleEditInputChange('title', e.target.value)}
            className="flex-1 text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <h3 className="text-sm font-semibold text-slate-900 leading-tight flex-1 pr-2 line-clamp-2">
            {queue.title}
          </h3>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Share Button */}
          <button
            onClick={() => onShare(queue)}
            className="text-slate-400 hover:text-blue-500 transition-all p-1.5 rounded-lg hover:bg-blue-50"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          
          {queue.user_id === user?.id && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-slate-400 hover:text-blue-500 transition-all p-1.5 rounded-lg hover:bg-blue-50"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {queue.user_id === user?.id && (
            <button
              onClick={() => onDelete(queue.id)}
              className="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Show creator email for admin/operations */}
      {canManageAllQueues && queue.user_email && (
        <p className="text-xs text-slate-500 mb-2">By: {queue.user_email}</p>
      )}

      {/* View Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-4">
        {QUEUE_CONSTANTS.viewTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveViewTab(tab)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeViewTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'details' ? (
              <>
                <FileText className="w-3 h-3" />
                Details
              </>
            ) : (
              <>
                <Receipt className="w-3 h-3" />
                Receipts & Invoices
              </>
            )}
          </button>
        ))}
      </div>

      {/* Details Tab Content */}
      {activeViewTab === 'details' && (
        <div className="space-y-4 flex-1">
          {/* Description */}
          {isEditing ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">Description</label>
              <textarea
                value={editFormData.description}
                onChange={(e) => handleEditInputChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs resize-none"
                rows={3}
                placeholder="Add a description..."
              />
            </div>
          ) : (
            queue.description && (
              <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                {queue.description}
              </p>
            )
          )}

          {/* Editable Fields */}
          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            {isEditing ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Amount</label>
                <div className="relative">
                  <HandCoins className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editFormData.amount}
                    onChange={(e) => handleEditInputChange('amount', e.target.value)}
                    className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ) : (
              queue.amount && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                  <HandCoins className="w-3 h-3" />
                  {formatCurrency(queue.amount, queue.currency)}
                  {queue.currency !== 'USD' && (
                    <span className="text-xs text-slate-500">
                      (${convertCurrencySync(queue.amount, queue.currency, 'USD').toFixed(2)})
                    </span>
                  )}
                </div>
              )
            )}

            {/* Currency */}
            {isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Currency</label>
                <select
                  value={editFormData.currency}
                  onChange={(e) => handleEditInputChange('currency', e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                >
                  {QUEUE_CONSTANTS.currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-3">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => handleEditInputChange('category', e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    {QUEUE_CONSTANTS.categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Priority</label>
                  <select
                    value={editFormData.priority}
                    onChange={(e) => handleEditInputChange('priority', e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    {QUEUE_CONSTANTS.priorities.map(priority => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(queue.priority)}`}>
                  <AlertCircle className="w-3 h-3" />
                  {queue.priority}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200">
                  <Tag className="w-3 h-3" />
                  {queue.category}
                </span>
              </>
            )}
          </div>

          {/* Branch and Country */}
          <div className="grid grid-cols-2 gap-3">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Branch</label>
                  <select
                    value={editFormData.branchName}
                    onChange={(e) => handleEditInputChange('branchName', e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    {QUEUE_CONSTANTS.branches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Country</label>
                  <select
                    value={editFormData.country}
                    onChange={(e) => handleEditInputChange('country', e.target.value)}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                  >
                    {QUEUE_CONSTANTS.countries.map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                {queue.branch_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                    <Building className="w-3 h-3" />
                    {queue.branch_name}
                  </span>
                )}
                {queue.country && queue.country !== 'XX' && queue.country !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                    {renderCountryFlag(queue.country)}
                    {getCountryName(queue.country)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition-all text-xs flex items-center justify-center gap-1"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold transition-all text-xs"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Receipts & Invoices Tab Content */}
      {activeViewTab === 'receipts' && (
        <div className="space-y-4 flex-1">
          {/* Receipt Section */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Receipt className="w-3 h-3" />
              Receipt
            </h4>
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
                    onClick={() => onFileDelete(queue.id, 'receipt')}
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
                  onChange={(e) => handleFileChange(e, 'receipt')}
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

          {/* Invoice Section */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <FileDigit className="w-3 h-3" />
              Invoice
            </h4>
            {queue.invoice_url ? (
              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  {getFileIcon(queue.invoice_name || '')}
                  <span className="text-xs font-medium text-blue-700 truncate flex-1">
                    {queue.invoice_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={queue.invoice_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Download invoice"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => onFileDelete(queue.id, 'invoice')}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Remove invoice"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  id={`invoice-${queue.id}`}
                  onChange={(e) => handleFileChange(e, 'invoice')}
                  className="hidden"
                  accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
                />
                <label
                  htmlFor={`invoice-${queue.id}`}
                  className="flex items-center gap-2 p-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-600 font-medium">Upload invoice</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision History */}
      {queue.decisions && queue.decisions.length > 0 && activeViewTab === 'details' && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-slate-700 mb-2">Decision History</div>
          <div className="space-y-2">
            {queue.decisions.map((decision) => (
              <div key={decision.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  decision.status === 'approved' ? 'bg-green-500' : 
                  decision.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold ${
                      decision.status === 'approved' ? 'text-green-700' : 
                      decision.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
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
        {/* Approval/Rejection/Amend buttons for admin/operations */}
        {canApproveReject(userRole) && queue.status === 'pending' && activeViewTab === 'details' && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => onDecision(queue, 'approved')}
              disabled={queue.amount && !canApproveExpense(queue.amount, queue.currency, userRole)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                queue.amount && !canApproveExpense(queue.amount, queue.currency, userRole)
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white hover:scale-105'
              }`}
              title={
                queue.amount && !canApproveExpense(queue.amount, queue.currency, userRole)
                  ? `Only admin can approve expenses above $500 USD equivalent. This amount (${formatCurrency(queue.amount, queue.currency)} = $${convertCurrencySync(queue.amount, queue.currency, 'USD').toFixed(2)} USD) exceeds the operations approval limit.`
                  : 'Approve'
              }
            >
              <Check className="w-3 h-3" />
              Approve
            </button>
            
            {/* Amend Button */}
            <button
              onClick={() => onDecision(queue, 'amended')}
              className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all hover:scale-105"
            >
              <Edit2 className="w-3 h-3" />
              Amend
            </button>
            
            <button
              onClick={() => onDecision(queue, 'rejected')}
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
  );
};

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
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [queueToShare, setQueueToShare] = useState<Queue | null>(null);
  
  // Enhanced state management
  const [activeTab, setActiveTab] = useState<(typeof QUEUE_CONSTANTS.tabs)[number]>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showBranchCountryFilter, setShowBranchCountryFilter] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [amountFilter, setAmountFilter] = useState('');

  // Calculate pagination using constants
  const totalPages = Math.ceil(filteredQueues.length / QUEUE_CONSTANTS.itemsPerPage);
  const startIndex = (currentPage - 1) * QUEUE_CONSTANTS.itemsPerPage;
  const currentItems = filteredQueues.slice(startIndex, startIndex + QUEUE_CONSTANTS.itemsPerPage);

  // Apply tab filters
  const applyTabFilter = useCallback((queuesToFilter: Queue[]) => {
    switch (activeTab) {
      case 'pending':
        return queuesToFilter.filter(queue => queue.status === 'pending');
      case 'approved':
        return queuesToFilter.filter(queue => queue.status === 'approved');
      case 'rejected':
        return queuesToFilter.filter(queue => queue.status === 'rejected');
      case 'amended':
        return queuesToFilter.filter(queue => queue.status === 'amended');
      case 'my-items':
        return queuesToFilter.filter(queue => queue.user_id === user?.id);
      case 'requires-attention':
        return queuesToFilter.filter(queue => 
          (queue.amount && convertCurrencySync(queue.amount, queue.currency, 'USD') > 500 && queue.status === 'pending') || 
          queue.priority === 'high'
        );
      default:
        return queuesToFilter;
    }
  }, [activeTab, user]);

  // Apply all filters
  const applyAllFilters = useCallback(() => {
    if (!queues.length) {
      setFilteredQueues([]);
      return;
    }

    let filtered = [...queues];

    // Apply tab filter first
    filtered = applyTabFilter(filtered);

    // Apply date filter
    filtered = applyDateFilterToQueues(filtered);

    // Apply branch filter
    if (branchFilter && branchFilter !== 'All') {
      filtered = filtered.filter(queue => 
        queue.branch_name?.toLowerCase().includes(branchFilter.toLowerCase())
      );
    }

    // Apply country filter
    if (countryFilter && countryFilter !== 'ALL') {
      filtered = filtered.filter(queue => queue.country === countryFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(queue => queue.category === categoryFilter);
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(queue => queue.priority === priorityFilter);
    }

    // Apply amount filter
    if (amountFilter) {
      const amount = parseFloat(amountFilter);
      if (!isNaN(amount)) {
        filtered = filtered.filter(queue => queue.amount && queue.amount >= amount);
      }
    }

    setFilteredQueues(filtered);
    setCurrentPage(1);
  }, [queues, dateFilter, customStartDate, customEndDate, branchFilter, countryFilter, categoryFilter, priorityFilter, amountFilter, applyTabFilter]);

  // Apply filters when dependencies change
  useEffect(() => {
    applyAllFilters();
  }, [applyAllFilters]);

  // Extract available branches
  useEffect(() => {
    if (queues.length > 0) {
      const branches = [...new Set(queues
        .map(q => q.branch_name)
        .filter(Boolean) as string[]
      )].sort();
      setAvailableBranches(branches);
    }
  }, [queues]);

  // Date filter function
  const applyDateFilterToQueues = useCallback((queuesToFilter: Queue[]) => {
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
  }, [dateFilter, customStartDate, customEndDate]);

  // Data fetching
  useEffect(() => {
    if (user) {
      fetchUserRoleAndQueues();
    }
  }, [user]);

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

  // Permission checks - UPDATED WITH CURRENCY CONVERSION
  const canManageAllQueues = useCallback((role = userRole) => {
    return ['admin', 'operations'].includes(role);
  }, [userRole]);

  const canApproveReject = (role = userRole) => {
    return ['admin', 'operations'].includes(role);
  };

  const canApproveExpense = (amount: number | null, currency: string, role = userRole) => {
    if (!amount) return true;
    
    // Convert amount to USD for approval limit checking
    let amountInUSD = amount;
    
    if (currency !== 'USD') {
      amountInUSD = convertCurrencySync(amount, currency, 'USD');
    }
    
    console.log(`Approval check: ${amount} ${currency} = ${amountInUSD} USD, Role: ${role}`);
    
    if (role === 'admin') {
      return true;
    }
    
    if (role === 'operations') {
      return amountInUSD <= 500;
    }
    
    return false;
  };

  // Share functionality
  const handleShare = (queue: Queue) => {
    setQueueToShare(queue);
    setShowShareModal(true);
  };

  // Queue actions
  const handleDecision = async (status: 'approved' | 'rejected' | 'amended') => {
    if (!selectedQueue || !user) return;

    try {
      const { error: queueError } = await supabase
        .from('queues')
        .update({ 
          status: status === 'amended' ? 'pending' : status, // Keep as pending if amended
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

  const openDecisionModal = (queue: Queue, status: 'approved' | 'rejected' | 'amended') => {
    if (status === 'approved' && queue.amount && !canApproveExpense(queue.amount, queue.currency, userRole)) {
      const amountInUSD = convertCurrencySync(queue.amount, queue.currency, 'USD');
      alert(`Only admin can approve expenses above $500 USD equivalent. This amount (${formatCurrency(queue.amount, queue.currency)} = $${amountInUSD.toFixed(2)} USD) exceeds the operations approval limit.`);
      return;
    }
    
    setSelectedQueue({...queue, status});
    setDecisionComment('');
    setShowDecisionModal(true);
  };

  const handleFileUpload = async (file: File, queueId: string, field: 'receipt' | 'invoice') => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${queueId}/${field}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const updateData = {
        [`${field}_url`]: publicUrl,
        [`${field}_name`]: file.name,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('queues')
        .update(updateData)
        .eq('id', queueId);

      if (updateError) throw updateError;

      fetchQueues();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (formData: any) => {
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
          currency: formData.currency,
          receipt_url: null,
          receipt_name: null,
          invoice_url: null,
          invoice_name: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Upload files if they exist
      const uploadPromises = [];
      if (formData.receipt && queueData) {
        uploadPromises.push(handleFileUpload(formData.receipt, queueData.id, 'receipt'));
      }
      if (formData.invoice && queueData) {
        uploadPromises.push(handleFileUpload(formData.invoice, queueData.id, 'invoice'));
      }

      await Promise.all(uploadPromises);

      setShowForm(false);
      fetchQueues();
    } catch (error) {
      console.error('Error creating queue:', error);
      alert('Error creating queue item. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    try {
      const { error } = await supabase
        .from('queues')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          category: formData.category,
          priority: formData.priority,
          branch_name: formData.branchName.trim() || null,
          country: formData.country || null,
          currency: formData.currency,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setEditingQueue(null);
      fetchQueues();
    } catch (error) {
      console.error('Error updating queue:', error);
      alert('Error updating queue item. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const { data: queue } = await supabase
        .from('queues')
        .select('receipt_url, invoice_url')
        .eq('id', id)
        .single();

      if (queue) {
        const filesToRemove = [];
        if (queue.receipt_url) {
          const fileName = queue.receipt_url.split('/').pop();
          if (fileName) filesToRemove.push(`${id}/${fileName}`);
        }
        if (queue.invoice_url) {
          const fileName = queue.invoice_url.split('/').pop();
          if (fileName) filesToRemove.push(`${id}/${fileName}`);
        }

        if (filesToRemove.length > 0) {
          await supabase.storage
            .from('receipts')
            .remove(filesToRemove);
        }
      }

      const { error } = await supabase.from('queues').delete().eq('id', id);
      if (error) throw error;
      fetchQueues();
    } catch (error) {
      console.error('Error deleting queue:', error);
    }
  };

  const handleFileUploadForQueue = async (file: File, queueId: string, field: 'receipt' | 'invoice') => {
    await handleFileUpload(file, queueId, field);
  };

  const handleFileDelete = async (queueId: string, field: 'receipt' | 'invoice') => {
    try {
      const { data: queue } = await supabase
        .from('queues')
        .select('*')
        .eq('id', queueId)
        .single();

      if (queue?.[`${field}_url`]) {
        const fileName = queue[`${field}_url`].split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('receipts')
            .remove([`${queueId}/${fileName}`]);
        }
      }

      const updateData = {
        [`${field}_url`]: null,
        [`${field}_name`]: null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('queues')
        .update(updateData)
        .eq('id', queueId);

      if (error) throw error;
      fetchQueues();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const startEditing = (queue: Queue) => {
    setEditingQueue(queue);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingQueue(null);
  };

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

  const resetCategoryPriorityFilter = useCallback(() => {
    setCategoryFilter('');
    setPriorityFilter('');
    setAmountFilter('');
  }, []);

  const resetAllFilters = useCallback(() => {
    resetDateFilter();
    resetBranchCountryFilter();
    resetCategoryPriorityFilter();
    setActiveTab('all');
  }, [resetDateFilter, resetBranchCountryFilter, resetCategoryPriorityFilter]);

  const hasActiveFilters = useCallback(() => {
    return dateFilter !== 'all' || branchFilter || countryFilter || categoryFilter || priorityFilter || amountFilter;
  }, [dateFilter, branchFilter, countryFilter, categoryFilter, priorityFilter, amountFilter]);

  // Pagination controls
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // UI Components
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  const EmptyState = () => (
    <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-lg p-16 text-center border border-slate-200/60">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
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
      {queues.length > 0 && (hasActiveFilters() || activeTab !== 'all') && (
        <button
          onClick={resetAllFilters}
          className="mt-4 text-blue-500 hover:text-blue-700 text-xs font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  // Tabs Component
  const Tabs = () => (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-6">
      {[
        { id: 'all', label: 'All Items', count: queues.length },
        { id: 'pending', label: 'Pending', count: queues.filter(q => q.status === 'pending').length },
        { id: 'approved', label: 'Approved', count: queues.filter(q => q.status === 'approved').length },
        { id: 'rejected', label: 'Rejected', count: queues.filter(q => q.status === 'rejected').length },
        { id: 'amended', label: 'Amended', count: queues.filter(q => q.status === 'amended').length },
        { id: 'my-items', label: 'My Items', count: queues.filter(q => q.user_id === user?.id).length },
        { id: 'requires-attention', label: 'Requires Attention', count: queues.filter(q => 
          (q.amount && convertCurrencySync(q.amount, q.currency, 'USD') > 500 && q.status === 'pending') || q.priority === 'high'
        ).length },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === tab.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${
            activeTab === tab.id
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Showing {startIndex + 1}-{Math.min(startIndex + QUEUE_CONSTANTS.itemsPerPage, filteredQueues.length)} of {filteredQueues.length} items
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === pageNum
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Category Priority Filter Dropdown
  const CategoryPriorityFilterDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setShowBranchCountryFilter(!showBranchCountryFilter)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-slate-200 text-xs"
      >
        <Filter className="w-4 h-4" />
        Category & Priority
        {(categoryFilter || priorityFilter || amountFilter) && (
          <span className="bg-blue-500 text-white rounded-full w-2 h-2"></span>
        )}
      </button>

      {showBranchCountryFilter && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Filter by Category & Priority</h3>
            <button 
              onClick={() => setShowBranchCountryFilter(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
            >
              <option value="">All Categories</option>
              {QUEUE_CONSTANTS.categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
            >
              <option value="">All Priorities</option>
              {QUEUE_CONSTANTS.priorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Minimum Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
              placeholder="0.00"
            />
          </div>

          {/* Active Filter Info */}
          {(categoryFilter || priorityFilter || amountFilter) && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex flex-wrap gap-2 mb-3">
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                    <button onClick={() => setCategoryFilter('')} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {priorityFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                    Priority: {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                    <button onClick={() => setPriorityFilter('')} className="text-purple-500 hover:text-purple-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {amountFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                    Min: {formatCurrency(parseFloat(amountFilter), 'USD')}
                    <button onClick={() => setAmountFilter('')} className="text-green-500 hover:text-green-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={resetCategoryPriorityFilter}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium"
              >
                Clear category & priority filters
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
        <Calendar className="w-4 h-4" />
        Date Filter
        {dateFilter !== 'all' && (
          <span className="bg-blue-500 text-white rounded-full w-2 h-2"></span>
        )}
      </button>

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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Queue Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {filteredQueues.length} items • {['admin', 'operations'].includes(userRole) ? 'All users' : 'Only your items'}
            </p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getRoleColor(userRole)}`}>
              {getRoleIcon(userRole)}
              {userRole}
              {roleLoading && '...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Category & Priority Filter */}
          <CategoryPriorityFilterDropdown />

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
            New Item
          </button>
        </div>
      </div>

      {/* Add Dashboard Summary */}
      <DashboardSummary 
        filteredQueues={filteredQueues}
        user={user}
        canManageAllQueues={canManageAllQueues()}
      />

      {/* Tabs */}
      <Tabs />

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
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    <Tag className="w-3 h-3" />
                    Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                    <button onClick={() => setCategoryFilter('')} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {priorityFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                    <AlertCircle className="w-3 h-3" />
                    Priority: {priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1)}
                    <button onClick={() => setPriorityFilter('')} className="text-purple-500 hover:text-purple-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {amountFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    <HandCoins className="w-3 h-3" />
                    Min: {formatCurrency(parseFloat(amountFilter), 'USD')}
                    <button onClick={() => setAmountFilter('')} className="text-green-500 hover:text-green-700">
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

      {/* Queue Form Modal */}
      <QueueFormModal 
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
        user={user}
        editingQueue={editingQueue}
      />

      {/* Share Modal */}
      {showShareModal && queueToShare && (
        <ShareOptions 
          queue={queueToShare} 
          onClose={() => {
            setShowShareModal(false);
            setQueueToShare(null);
          }} 
        />
      )}

      {/* Decision Modal */}
      {showDecisionModal && selectedQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <h3 className="text-xl font-semibold text-slate-900">
                {selectedQueue.status === 'approved' ? 'Approve' : 
                 selectedQueue.status === 'rejected' ? 'Reject' : 'Amend'} Item
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
                    Amount: {formatCurrency(selectedQueue.amount, selectedQueue.currency)}
                    {selectedQueue.currency !== 'USD' && (
                      <span className="text-xs text-slate-500 ml-1">
                        (${convertCurrencySync(selectedQueue.amount, selectedQueue.currency, 'USD').toFixed(2)} USD)
                      </span>
                    )}
                    {selectedQueue.amount && !canApproveExpense(selectedQueue.amount, selectedQueue.currency, userRole) && (
                      <span className="text-amber-600 text-xs ml-2">(Requires admin approval)</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-slate-500">Category: {selectedQueue.category}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Comment {selectedQueue.status === 'amended' ? '(Required - explain what needs to be amended)' : '(Optional)'}
                </label>
                <textarea
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-slate-400 text-sm"
                  rows={3}
                  placeholder={selectedQueue.status === 'amended' 
                    ? "Explain what needs to be changed or corrected..." 
                    : "Add a comment for your decision..."
                  }
                  required={selectedQueue.status === 'amended'}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDecision(selectedQueue.status as 'approved' | 'rejected' | 'amended')}
                  disabled={selectedQueue.status === 'amended' && !decisionComment.trim()}
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all text-sm ${
                    selectedQueue.status === 'approved'
                      ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300'
                      : selectedQueue.status === 'rejected'
                      ? 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-300'
                      : 'bg-amber-500 hover:bg-amber-600 text-white disabled:bg-amber-300'
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

      {/* Queue Items Grid */}
      {filteredQueues.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentItems.map((queue) => (
              <QueueItem
                key={queue.id}
                queue={queue}
                user={user}
                userRole={userRole}
                onDecision={openDecisionModal}
                onDelete={handleDelete}
                onEdit={fetchQueues}
                onShare={handleShare}
                onFileUpload={handleFileUploadForQueue}
                onFileDelete={handleFileDelete}
                canManageAllQueues={canManageAllQueues()}
                canApproveReject={canApproveReject}
                canApproveExpense={canApproveExpense}
              />
            ))}
          </div>

          {/* Pagination */}
          <Pagination />
        </>
      )}
    </div>
  );
}
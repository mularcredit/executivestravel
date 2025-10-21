import { useState, useRef, useEffect } from 'react';
import { 
  User, Phone, Mail, MapPin, Camera, Upload, 
  FileText, X, Eye, EyeOff, Download, Share2,
  CheckCircle, AlertCircle, Loader2, Globe,
  Search, Filter, Calendar, Edit, Trash2, Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ClientDetails {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  passport_number: string;
  passport_expiry: string;
  nationality: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  passport_image_url?: string;
  created_at?: string;
  user_id?: string;
}

interface PassportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}

interface ClientViewModalProps {
  client: ClientDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

const PassportUploadModal = ({ isOpen, onClose, onUpload, uploading }: PassportUploadModalProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      alert('Please select an image file');
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      resetModal();
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Upload Passport Photo</h3>
          <button 
            onClick={handleClose}
            disabled={uploading}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 bg-slate-50 hover:border-slate-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {!previewUrl ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 mb-2">
                      Drop your passport photo here
                    </p>
                    <p className="text-sm text-slate-600 mb-4">
                      or click to browse files
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Select File
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Supports JPG, PNG, WEBP • Max 5MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-32 h-32 mx-auto border-4 border-white rounded-lg shadow-lg overflow-hidden">
                    <img 
                      src={previewUrl} 
                      alt="Passport preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    {selectedFile?.name}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                  >
                    Choose different photo
                  </button>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Passport Photo Requirements
              </h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• Clear, color photo of the entire passport page</li>
                <li>• Good lighting with no shadows or glare</li>
                <li>• All text and photo must be clearly readable</li>
                <li>• File size should be less than 5MB</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold transition-all text-sm disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Passport
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientViewModal = ({ client, isOpen, onClose }: ClientViewModalProps) => {
  if (!isOpen || !client) return null;

  const downloadClientDetails = () => {
    const content = `
CLIENT DETAILS - TULI TRAVEL
============================

Personal Information:
--------------------
Full Name: ${client.full_name}
Email: ${client.email}
Phone: ${client.phone}
Address: ${client.address}
Nationality: ${client.nationality}

Passport Details:
----------------
Passport Number: ${client.passport_number}
Expiry Date: ${client.passport_expiry}
${client.passport_image_url ? 'Passport Photo: Uploaded' : 'Passport Photo: Not uploaded'}

Emergency Contact:
-----------------
Name: ${client.emergency_contact_name}
Phone: ${client.emergency_contact_phone}

Date Added: ${client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-${client.full_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareClientDetails = () => {
    const message = `📋 Client Details - Tuli Travel

Personal Information:
• Full Name: ${client.full_name}
• Email: ${client.email}
• Phone: ${client.phone}
• Address: ${client.address}
• Nationality: ${client.nationality}

Passport Details:
• Passport Number: ${client.passport_number}
• Expiry Date: ${new Date(client.passport_expiry).toLocaleDateString()}

Emergency Contact:
• Name: ${client.emergency_contact_name}
• Phone: ${client.emergency_contact_phone}

Generated by Tuli Travel System`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Client Details</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Full Name</label>
                    <p className="text-sm text-slate-900 font-semibold mt-1">{client.full_name}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Email Address
                      </label>
                      <p className="text-sm text-slate-900 mt-1">{client.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Phone Number
                      </label>
                      <p className="text-sm text-slate-900 mt-1">{client.phone}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Address
                    </label>
                    <p className="text-sm text-slate-900 mt-1 whitespace-pre-wrap">{client.address}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Nationality
                    </label>
                    <p className="text-sm text-slate-900 mt-1">{client.nationality}</p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4">Emergency Contact</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Contact Name</label>
                    <p className="text-sm text-slate-900 font-semibold mt-1">{client.emergency_contact_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Contact Phone</label>
                    <p className="text-sm text-slate-900 font-semibold mt-1">{client.emergency_contact_phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Passport Information */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Passport Details
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Passport Number</label>
                    <p className="text-sm text-slate-900 font-semibold mt-1 font-mono">{client.passport_number}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expiry Date
                    </label>
                    <p className="text-sm text-slate-900 mt-1">
                      {new Date(client.passport_expiry).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Passport Photo</label>
                    <div className="mt-2">
                      {client.passport_image_url ? (
                        <div className="space-y-2">
                          <img 
                            src={client.passport_image_url} 
                            alt="Passport" 
                            className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                          />
                          <a 
                            href={client.passport_image_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                          >
                            View Full Image
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No passport photo uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-slate-500 uppercase mb-3">Record Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date Added:</span>
                    <span className="text-slate-900 font-semibold">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Client ID:</span>
                    <span className="text-slate-900 font-mono text-xs">{client.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={downloadClientDetails}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-all text-sm border border-slate-300"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={shareClientDetails}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share via WhatsApp
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientList = ({ onViewClient }: { onViewClient: (client: ClientDetails) => void }) => {
  const [clients, setClients] = useState<ClientDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNationality, setFilterNationality] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      alert('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      
      setClients(prev => prev.filter(client => client.id !== clientId));
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.passport_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesNationality = !filterNationality || 
                              client.nationality.toLowerCase().includes(filterNationality.toLowerCase());
    
    return matchesSearch && matchesNationality;
  });

  const nationalities = [...new Set(clients.map(client => client.nationality))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Client Database</h2>
          <p className="text-sm text-slate-500">
            {clients.length} client{clients.length !== 1 ? 's' : ''} in database
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Nationality Filter */}
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              value={filterNationality}
              onChange={(e) => setFilterNationality(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">All Nationalities</option>
              {nationalities.map(nationality => (
                <option key={nationality} value={nationality}>{nationality}</option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end text-sm text-slate-500">
            Showing {filteredClients.length} of {clients.length} clients
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {clients.length === 0 ? 'No clients yet' : 'No clients found'}
          </h3>
          <p className="text-slate-500">
            {clients.length === 0 
              ? 'Get started by adding your first client using the form above.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              {/* Client Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{client.full_name}</h3>
                    <p className="text-sm text-slate-500">{client.nationality}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              {/* Client Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Globe className="w-4 h-4" />
                  <span>Passport: {client.passport_number}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>Expires: {new Date(client.passport_expiry).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => onViewClient(client)}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => deleteClient(client.id!)}
                  className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function ClientManagement() {
  const [activeTab, setActiveTab] = useState<'capture' | 'view'>('capture');
  const [client, setClient] = useState<ClientDetails>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    passport_number: '',
    passport_expiry: '',
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  });
  
  const [showPassportModal, setShowPassportModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedClient, setSavedClient] = useState<ClientDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!client.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!client.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(client.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!client.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!client.passport_number.trim()) {
      newErrors.passport_number = 'Passport number is required';
    }

    if (!client.passport_expiry) {
      newErrors.passport_expiry = 'Passport expiry date is required';
    } else if (new Date(client.passport_expiry) <= new Date()) {
      newErrors.passport_expiry = 'Passport must be valid (future date)';
    }

    if (!client.nationality.trim()) {
      newErrors.nationality = 'Nationality is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ClientDetails, value: string) => {
    setClient(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePassportUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('passport-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('passport-photos')
        .getPublicUrl(filePath);

      setClient(prev => ({ ...prev, passport_image_url: publicUrl }));
      setShowPassportModal(false);
      
    } catch (error) {
      console.error('Error uploading passport:', error);
      alert('Failed to upload passport photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const clientData = {
        ...client,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      setSavedClient(data);
      
      setClient({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        passport_number: '',
        passport_expiry: '',
        nationality: '',
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });
      
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewClient = () => {
    setSavedClient(null);
  };

  const handleViewClient = (client: ClientDetails) => {
    setSelectedClient(client);
    setViewModalOpen(true);
  };

  const downloadClientDetails = () => {
    if (!savedClient) return;

    const content = `
CLIENT DETAILS - TULI TRAVEL
============================

Personal Information:
--------------------
Full Name: ${savedClient.full_name}
Email: ${savedClient.email}
Phone: ${savedClient.phone}
Address: ${savedClient.address}
Nationality: ${savedClient.nationality}

Passport Details:
----------------
Passport Number: ${savedClient.passport_number}
Expiry Date: ${savedClient.passport_expiry}
${savedClient.passport_image_url ? 'Passport Photo: Uploaded' : 'Passport Photo: Not uploaded'}

Emergency Contact:
-----------------
Name: ${savedClient.emergency_contact_name}
Phone: ${savedClient.emergency_contact_phone}

Generated on: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-${savedClient.full_name.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareClientDetails = () => {
    if (!savedClient) return;

    const message = `📋 Client Details - Tuli Travel

Personal Information:
• Full Name: ${savedClient.full_name}
• Email: ${savedClient.email}
• Phone: ${savedClient.phone}
• Nationality: ${savedClient.nationality}

Passport Details:
• Passport Number: ${savedClient.passport_number}
• Expiry Date: ${savedClient.passport_expiry}

Emergency Contact:
• Name: ${savedClient.emergency_contact_name}
• Phone: ${savedClient.emergency_contact_phone}

Generated by Tuli Travel System`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const ClientDetailsCapture = () => {
    if (savedClient) {
      return (
        <div className="space-y-6">
          {/* Success Card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Client Saved Successfully! ✅
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Client details for <strong>{savedClient.full_name}</strong> have been saved to the database.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={downloadClientDetails}
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-all text-sm border border-slate-200"
                  >
                    <Download className="w-4 h-4" />
                    Download Details
                  </button>
                  <button
                    onClick={shareClientDetails}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    Share via WhatsApp
                  </button>
                  <button
                    onClick={handleNewClient}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Client
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Client Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4">Client Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Personal Information</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Full Name:</span>
                      <span className="text-sm font-semibold text-slate-900">{savedClient.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Email:</span>
                      <span className="text-sm font-semibold text-slate-900">{savedClient.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Phone:</span>
                      <span className="text-sm font-semibold text-slate-900">{savedClient.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Nationality:</span>
                      <span className="text-sm font-semibold text-slate-900">{savedClient.nationality}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Passport Details</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Passport Number:</span>
                      <span className="text-sm font-semibold text-slate-900">{savedClient.passport_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Expiry Date:</span>
                      <span className="text-sm font-semibold text-slate-900">{savedClient.passport_expiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Passport Photo:</span>
                      <span className={`text-sm font-semibold ${savedClient.passport_image_url ? 'text-green-600' : 'text-amber-600'}`}>
                        {savedClient.passport_image_url ? 'Uploaded' : 'Not uploaded'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <PassportUploadModal
          isOpen={showPassportModal}
          onClose={() => setShowPassportModal(false)}
          onUpload={handlePassportUpload}
          uploading={uploading}
        />

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-1">Client Details Capture</h2>
            <p className="text-xs text-slate-500">Capture and manage client information with passport upload</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
            <User className="w-3 h-3" />
            Secure Storage
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Personal Information */}
            <div className="p-6 border-r border-slate-200">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={client.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.full_name ? 'border-red-300' : 'border-slate-200'
                    }`}
                    placeholder="Enter full legal name"
                  />
                  {errors.full_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={client.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.email ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="email@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={client.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.phone ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="+1 (555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Residential Address
                  </label>
                  <textarea
                    value={client.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Enter complete residential address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nationality *
                  </label>
                  <input
                    type="text"
                    value={client.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      errors.nationality ? 'border-red-300' : 'border-slate-200'
                    }`}
                    placeholder="e.g., American, Canadian, British"
                  />
                  {errors.nationality && (
                    <p className="text-red-500 text-xs mt-1">{errors.nationality}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Passport & Emergency Contact */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Passport & Emergency Contact</h3>
              </div>

              <div className="space-y-4">
                {/* Passport Upload Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Passport Photo
                    </label>
                    {client.passport_image_url && (
                      <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowPassportModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-blue-50 text-blue-600 border-2 border-dashed border-blue-300 rounded-xl py-4 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    {client.passport_image_url ? 'Change Passport Photo' : 'Upload Passport Photo'}
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Click to upload clear photo of passport page
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      value={client.passport_number}
                      onChange={(e) => handleInputChange('passport_number', e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.passport_number ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="e.g., A12345678"
                    />
                    {errors.passport_number && (
                      <p className="text-red-500 text-xs mt-1">{errors.passport_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={client.passport_expiry}
                      onChange={(e) => handleInputChange('passport_expiry', e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        errors.passport_expiry ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                    {errors.passport_expiry && (
                      <p className="text-red-500 text-xs mt-1">{errors.passport_expiry}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Emergency Contact
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={client.emergency_contact_name}
                        onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="Full name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={client.emergency_contact_phone}
                        onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-xs text-slate-500">
                * Required fields
              </div>
              <button
                onClick={handleSaveClient}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-400 text-white px-8 py-3 rounded-xl font-semibold transition-all text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Client...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Save Client Details
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('capture')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'capture'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Add New Client
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'view'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            View Clients
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'capture' ? (
        <ClientDetailsCapture />
      ) : (
        <ClientList onViewClient={handleViewClient} />
      )}

      {/* Client View Modal */}
      <ClientViewModal
        client={selectedClient}
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />
    </div>
  );
}
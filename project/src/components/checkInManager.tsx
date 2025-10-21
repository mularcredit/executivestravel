import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Plane, MapPin, Bell, 
  CheckCircle, XCircle, AlertTriangle, Filter,
  Search, MoreVertical, Share2, MessageCircle,
  Download, RefreshCw, ChevronDown, ChevronUp, Trash2, X,
  ChevronLeft, ChevronRight, Receipt, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import html2pdf from 'html2pdf.js';

interface TravelRecord {
  id: string;
  passenger_name: string;
  pnr: string;
  departure_date: string;
  departure_time: string;
  departure_airport: string;
  arrival_airport: string;
  airline_name: string;
  flight_number: string;
  checkin_24h_alert: boolean;
  checkin_3h_alert: boolean;
  checkin_completed: boolean;
  created_at: string;
  user_id: string;
  raw_itinerary: string;
  contact_info?: string;
}

type SortField = 'departure_date' | 'passenger_name' | 'airline_name' | 'checkin_completed';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'upcoming' | 'past' | 'needs_checkin' | 'completed';

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ 
  record, 
  onClose, 
  onDelete 
}: { 
  record: TravelRecord; 
  onClose: () => void; 
  onDelete: () => void;
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting travel record:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Delete Travel Record</h3>
          <button 
            onClick={onClose}
            disabled={deleting}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-1">
                Delete record for "{record.passenger_name}"?
              </h4>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete this travel record? This action cannot be undone.
              </p>
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p><strong>Flight:</strong> {record.airline_name} {record.flight_number}</p>
                <p><strong>Route:</strong> {record.departure_airport} → {record.arrival_airport}</p>
                <p><strong>Departure:</strong> {record.departure_date} at {record.departure_time}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-all text-sm disabled:opacity-50"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Record
            </button>
          </div>
          
          <button
            onClick={onClose}
            disabled={deleting}
            className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all text-sm disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Actions Menu Component
const ActionsMenu = ({ 
  record, 
  onShare, 
  onMarkCheckedIn, 
  onDelete,
  onGenerateInvoice,
  actionLoading 
}: { 
  record: TravelRecord;
  onShare: (record: TravelRecord) => void;
  onMarkCheckedIn: (recordId: string) => void;
  onDelete: (record: TravelRecord) => void;
  onGenerateInvoice: (record: TravelRecord) => void;
  actionLoading: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const status = getRecordStatus(record);

  useEffect(() => {
    const handleClickOutside = () => {
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 min-w-48">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(record);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share Reminder
          </button>

          {!record.checkin_completed && status.status !== 'past' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkCheckedIn(record.id);
                setIsOpen(false);
              }}
              disabled={actionLoading === record.id}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Checked In
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateInvoice(record);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Receipt className="w-4 h-4" />
            Generate Invoice
          </button>

          <div className="border-t border-slate-200 my-1"></div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(record);
              setIsOpen(false);
            }}
            disabled={actionLoading === record.id}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete Record
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to get record status (needs to be outside the main component)
const getRecordStatus = (record: TravelRecord) => {
  const now = new Date();
  const departureDateTime = new Date(`${record.departure_date} ${record.departure_time}`);
  const checkin24hTime = new Date(departureDateTime.getTime() - (24 * 60 * 60 * 1000));
  const checkin3hTime = new Date(departureDateTime.getTime() - (3 * 60 * 60 * 1000));

  if (record.checkin_completed) {
    return { status: 'completed', label: 'Checked In', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
  }

  if (departureDateTime < now) {
    return { status: 'past', label: 'Departed', color: 'text-slate-500', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
  }

  if (now >= checkin3hTime) {
    return { status: 'urgent', label: 'Check-in Now!', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
  }

  if (now >= checkin24hTime) {
    return { status: 'checkin_open', label: 'Check-in Open', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
  }

  return { status: 'upcoming', label: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
};

export function CheckInManager() {
  const [records, setRecords] = useState<TravelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('departure_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRecord, setSelectedRecord] = useState<TravelRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<TravelRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Airline website mappings
  const airlineWebsites: { [key: string]: string } = {
    'American Airlines': 'https://www.aa.com',
    'Delta Air Lines': 'https://www.delta.com',
    'United Airlines': 'https://www.united.com',
    'Southwest Airlines': 'https://www.southwest.com',
    'JetBlue': 'https://www.jetblue.com',
    'Alaska Airlines': 'https://www.alaskaair.com',
    'Spirit Airlines': 'https://www.spirit.com',
    'Frontier Airlines': 'https://www.flyfrontier.com',
  };

  // Fetch travel records
  const fetchTravelRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('travel_records')
        .select('*')
        .order('departure_date', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching travel records:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete record with enhanced confirmation modal
  const deleteRecord = async (recordId: string) => {
    if (!recordToDelete) return;

    setActionLoading(recordId);
    try {
      const { error } = await supabase
        .from('travel_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      
      // Update local state
      setRecords(prev => prev.filter(record => record.id !== recordId));
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting travel record:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Open delete confirmation modal
  const confirmDelete = (record: TravelRecord) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  useEffect(() => {
    fetchTravelRecords();
  }, []);

  // Filter and sort records
  const filteredAndSortedRecords = records
    .filter(record => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        record.passenger_name.toLowerCase().includes(searchLower) ||
        record.pnr.toLowerCase().includes(searchLower) ||
        record.flight_number.toLowerCase().includes(searchLower) ||
        record.airline_name.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      const status = getRecordStatus(record);
      switch (statusFilter) {
        case 'upcoming':
          return status.status === 'upcoming' || status.status === 'checkin_open';
        case 'past':
          return status.status === 'past';
        case 'needs_checkin':
          return status.status === 'urgent' || status.status === 'checkin_open';
        case 'completed':
          return status.status === 'completed';
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const statusA = getRecordStatus(a).status;
      const statusB = getRecordStatus(b).status;
      
      // Prioritize upcoming and check-in open records
      const statusPriority = {
        'urgent': 1,
        'checkin_open': 2,
        'upcoming': 3,
        'completed': 4,
        'past': 5
      };

      // First sort by status priority
      if (statusPriority[statusA] !== statusPriority[statusB]) {
        return statusPriority[statusA] - statusPriority[statusB];
      }

      // Then sort by selected field
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'departure_date') {
        aValue = new Date(`${a.departure_date} ${a.departure_time}`).getTime();
        bValue = new Date(`${b.departure_date} ${b.departure_time}`).getTime();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Mark as checked in
  const markAsCheckedIn = async (recordId: string) => {
    setActionLoading(recordId);
    try {
      const { error } = await supabase
        .from('travel_records')
        .update({ checkin_completed: true })
        .eq('id', recordId);

      if (error) throw error;
      
      setRecords(prev => prev.map(record => 
        record.id === recordId ? { ...record, checkin_completed: true } : record
      ));
    } catch (error) {
      console.error('Error updating check-in status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Share reminder via WhatsApp
  const shareReminder = (record: TravelRecord) => {
    const status = getRecordStatus(record);
    let message = '';

    if (status.status === 'urgent') {
      message = `🛄 URGENT: Check-in closing soon!

Passenger: ${record.passenger_name}
Flight: ${record.airline_name} ${record.flight_number}
Route: ${record.departure_airport} → ${record.arrival_airport}
Departure: ${record.departure_date} at ${record.departure_time}

Check-in now to avoid missing your flight! ✈️`;
    } else {
      message = `✈️ Check-in Reminder

Passenger: ${record.passenger_name}
Flight: ${record.airline_name} ${record.flight_number}
Route: ${record.departure_airport} → ${record.arrival_airport}
Departure: ${record.departure_date} at ${record.departure_time}

Check-in opens 24 hours before departure. Safe travels! 🛫`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Generate invoice for a single record
  const generateInvoice = async (record: TravelRecord) => {
    setGeneratingInvoice(record.id);
    try {
      const invoiceHTML = generateInvoiceHTML(record);
      
      const options = {
        margin: 10,
        filename: `Tuli-Travel-Invoice-${record.passenger_name.replace(/\s+/g, '-')}-${record.flight_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(options).from(invoiceHTML).save();
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  // Generate invoice HTML for a single record
  const generateInvoiceHTML = (record: TravelRecord) => {
    const invoiceNumber = `TT-INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const issueDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const departureDateTime = new Date(`${record.departure_date} ${record.departure_time}`);
    const arrivalDateTime = new Date(departureDateTime.getTime() + (2 * 60 * 60 * 1000)); // Assume 2 hour flight
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Travel Invoice - ${record.passenger_name}</title>
        <style>
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          @page { 
            size: A4; 
            margin: 20mm; 
          }
          body { 
            font-family: 'Helvetica', 'Arial', sans-serif; 
            background: white; 
            color: #333;
            line-height: 1.4;
          }
          .invoice-container {
            max-width: 100%;
            background: white;
            border: 1px solid #e0e0e0;
          }
          
          .invoice-header {
            background: #2c3e50;
            padding: 25px 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            color: white;
            border-bottom: 4px solid #3498db;
          }
          .company-section {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .logo-container {
            width: 100px;
            height: 100px;
            background: white;
            border-radius: 8px;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #3498db;
          }
          .logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
          .company-info h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            color: white;
          }
          .company-info .tagline {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
            margin-bottom: 10px;
          }
          .invoice-meta {
            text-align: right;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 15px;
            color: #ecf0f1;
          }
          .invoice-number {
            font-size: 16px;
            background: rgba(255,255,255,0.1);
            padding: 10px 20px;
            border-radius: 6px;
            display: inline-block;
            margin-bottom: 10px;
            font-weight: 600;
          }
          
          .billing-section {
            padding: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            border-bottom: 2px solid #ecf0f1;
            background: #f8f9fa;
          }
          .bill-to, .trip-summary {
            padding: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
          }
          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #3498db;
          }
          .passenger-name {
            font-size: 22px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 15px;
          }
          .contact-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-top: 20px;
          }
          .contact-item {
            text-align: center;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e9ecef;
          }
          .contact-item strong {
            display: block;
            margin-bottom: 5px;
            color: #2c3e50;
            font-size: 13px;
          }
          .contact-item span {
            font-size: 13px;
            color: #6c757d;
          }
          
          .flight-section {
            padding: 0;
          }
          .flight-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
            font-size: 13px;
          }
          .flight-table th {
            background: #34495e;
            color: white;
            padding: 18px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: none;
          }
          .flight-table td {
            padding: 18px 15px;
            border-bottom: 1px solid #dee2e6;
            vertical-align: top;
            background: white;
          }
          .flight-table tr:nth-child(even) td {
            background: #f8f9fa;
          }
          
          .airline-cell {
            font-weight: 600;
            color: #2c3e50;
          }
          .flight-number {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
          }
          .route-cell {
            font-weight: 600;
          }
          .route-details {
            font-size: 12px;
            color: #6c757d;
            margin-top: 5px;
          }
          .date-time {
            font-weight: 600;
            line-height: 1.5;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 14px;
            background: #28a745;
            color: white;
            border-radius: 15px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .cabin-class {
            background: #007bff;
          }
          
          .pricing-section {
            padding: 30px;
            background: #f8f9fa;
            border-top: 3px solid #bdc3c7;
          }
          .amount-due {
            max-width: 400px;
            margin-left: auto;
          }
          .price-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 10px 0;
            font-size: 15px;
          }
          .subtotal, .taxes {
            border-bottom: 1px dashed #adb5bd;
          }
          .total {
            font-size: 20px;
            font-weight: 700;
            color: #2c3e50;
            border-top: 2px solid #3498db;
            padding-top: 15px;
            margin-top: 10px;
          }
          
          .terms-section {
            padding: 25px 30px;
            background: #2c3e50;
            color: white;
            font-size: 12px;
            line-height: 1.6;
          }
          .payment-terms {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.3);
          }
          .contact-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
          }
          
          .footer-section {
            padding: 25px 30px;
            background: #ecf0f1;
            text-align: center;
            font-size: 12px;
            color: #6c757d;
            border-top: 2px solid #bdc3c7;
          }
          
          .logo-fallback {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #3498db, #2c3e50);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            text-align: center;
          }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="company-section">
              <div class="logo-container">
                <img src="/TULI TRAVEL LOGO.png" alt="Tuli Travel Logo" class="logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="logo-fallback" style="display: none;">TULI TRAVEL</div>
              </div>
              <div class="company-info">
                <h1>TULI TRAVEL</h1>
                <div class="tagline">Executive Adventures and Travel</div>
              </div>
            </div>
            <div class="invoice-meta">
              <div class="invoice-title">TRAVEL INVOICE</div>
              <div class="invoice-number">${invoiceNumber}</div>
              <div class="meta-details">
                Issue Date: ${issueDate}<br>
                PNR: ${record.pnr || 'N/A'}<br>
                Status: <span class="status-badge">Confirmed</span>
              </div>
            </div>
          </div>
          
          <div class="billing-section">
            <div class="bill-to">
              <div class="section-title">BILL TO</div>
              <div class="passenger-details">
                <div class="passenger-name">${record.passenger_name}</div>
                <div class="contact-grid">
                  <div class="contact-item">
                    <strong>Booking Reference</strong>
                    <span>${record.pnr}</span>
                  </div>
                  <div class="contact-item">
                    <strong>Invoice Date</strong>
                    <span>${issueDate}</span>
                  </div>
                  <div class="contact-item">
                    <strong>Travel Date</strong>
                    <span>${record.departure_date}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="trip-summary">
              <div class="section-title">TRIP SUMMARY</div>
              <div style="font-size: 15px; line-height: 1.6;">
                Flight from ${record.departure_airport} to ${record.arrival_airport}<br>
                <span style="color: #6c757d; font-size: 14px; margin-top: 10px; display: block;">
                  ${record.airline_name} Flight ${record.flight_number} • Departing ${record.departure_date} at ${record.departure_time}
                </span>
              </div>
            </div>
          </div>
          
          <div class="flight-section">
            <table class="flight-table">
              <thead>
                <tr>
                  <th style="width: 20%;">Flight Details</th>
                  <th style="width: 25%;">Route</th>
                  <th style="width: 20%;">Date & Time</th>
                  <th style="width: 15%;">Duration</th>
                  <th style="width: 20%;" class="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="airline-cell">
                    ${record.airline_name}
                    <div class="flight-number">Flight ${record.flight_number}</div>
                  </td>
                  <td class="route-cell">
                    ${record.departure_airport} → ${record.arrival_airport}
                    <div class="route-details">
                      ${record.departure_airport} to ${record.arrival_airport}
                    </div>
                  </td>
                  <td class="date-time">
                    ${record.departure_date}<br>
                    <strong>${record.departure_time}</strong>
                  </td>
                  <td>
                    ~2 hours
                  </td>
                  <td class="text-right">
                    <div class="status-badge cabin-class">Economy</div>
                    <div class="status-badge" style="margin-top: 8px;">Confirmed</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="pricing-section">
            <div class="amount-due">
              <div class="price-row subtotal">
                <span>Flight Fare:</span>
                <span>$350.00</span>
              </div>
              <div class="price-row taxes">
                <span>Taxes & Fees:</span>
                <span>$85.00</span>
              </div>
              <div class="price-row total">
                <span>TOTAL AMOUNT PAID:</span>
                <span>$435.00</span>
              </div>
            </div>
          </div>
          
          <div class="terms-section">
            <div class="payment-terms">
              <strong>PAYMENT TERMS:</strong> This invoice has been paid in full. Amount includes all applicable taxes, fees, and surcharges. Payment received via credit card. For accounting purposes only.
            </div>
            <div class="contact-info">
              <div class="contact-item">
                <strong>Accounting Department</strong>
                accounting@tulitravel.com<br>
                (555) 123-4567 ext. 2
              </div>
              <div class="contact-item">
                <strong>Customer Service</strong>
                support@tulitravel.com<br>
                (555) 123-4567 ext. 1
              </div>
              <div class="contact-item">
                <strong>Emergency Contact</strong>
                emergency@tulitravel.com<br>
                (555) 123-4567 ext. 9
              </div>
            </div>
          </div>
          
          <div class="footer-section">
            <div style="margin-bottom: 15px;">
              <strong>TULI TRAVEL - EXECUTIVE ADVENTURES AND TRAVEL</strong><br>
              Professional & Excellent Customer Experience
            </div>
            <div>
              This document is computer-generated and requires no signature. For accounting and record-keeping purposes only.<br>
              Invoice generated on ${new Date().toLocaleString()} via Tuli Travel Smart System
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Stats for header
  const stats = {
    total: records.length,
    upcoming: records.filter(r => getRecordStatus(r).status === 'upcoming' || getRecordStatus(r).status === 'checkin_open').length,
    urgent: records.filter(r => getRecordStatus(r).status === 'urgent').length,
    completed: records.filter(r => getRecordStatus(r).status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Check-in Manager</h2>
          <p className="text-xs text-slate-500">Manage passenger check-ins and send reminders</p>
        </div>
        <button
          onClick={fetchTravelRecords}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl font-semibold transition-all text-sm border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-500">Total Records</div>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
          <div className="text-xs text-blue-600">Upcoming</div>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          <div className="text-xs text-red-600">Urgent</div>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-green-600">Checked In</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input
      type="text"
      placeholder="Search passengers, PNR, or flight number..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
    />
    {searchTerm && (
      <button
        onClick={() => setSearchTerm('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
</div>

          <div className="flex gap-2">
            {([
              { value: 'all', label: 'All' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'needs_checkin', label: 'Needs Check-in' },
              { value: 'completed', label: 'Checked In' },
              { value: 'past', label: 'Departed' },
            ] as const).map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setCurrentPage(1); // Reset to first page when filtering
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === filter.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAndSortedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <Calendar className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No travel records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th 
                    className="text-left p-4 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('passenger_name')}
                  >
                    <div className="flex items-center gap-1">
                      Passenger
                      {getSortIcon('passenger_name')}
                    </div>
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-700">Flight</th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-700">Route</th>
                  <th 
                    className="text-left p-4 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('departure_date')}
                  >
                    <div className="flex items-center gap-1">
                      Departure
                      {getSortIcon('departure_date')}
                    </div>
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-700">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => {
                  const status = getRecordStatus(record);
                  const airlineWebsite = airlineWebsites[record.airline_name] || 'https://www.google.com/search?q=' + encodeURIComponent(record.airline_name + ' official website');
                  
                  return (
                    <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                     <td className="p-4">
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
      <User className="w-4 h-4 text-blue-600" />
    </div>
    <div>
      <div className="text-sm font-semibold text-slate-900">
        {record.passenger_name}
      </div>
      <div className="text-xs text-slate-500">
        PNR: {record.pnr}
      </div>
      {record.contact_info && (
        <div className="text-xs text-blue-600 mt-1">
          {record.contact_info}
        </div>
      )}
    </div>
  </div>
</td>

                      <td className="p-4">
                        <a 
                          href={airlineWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 group transition-all duration-200"
                        >
                          <Plane className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
                          <div className="group-hover:translate-x-0.5 transition-transform">
                            <div className="text-sm font-semibold text-blue-600 group-hover:text-blue-700 transition-colors">
                              {record.airline_name}
                            </div>
                            <div className="text-xs text-blue-500 group-hover:text-blue-600 transition-colors">
                              {record.flight_number}
                            </div>
                          </div>
                        </a>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <div className="text-sm text-slate-900">
                            {record.departure_airport} → {record.arrival_airport}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-slate-900">
                            <Calendar className="w-3 h-3" />
                            {record.departure_date}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {record.departure_time}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.bgColor} ${status.borderColor} ${status.color}`}>
                          {status.status === 'urgent' && <AlertTriangle className="w-3 h-3" />}
                          {status.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {status.status === 'past' && <XCircle className="w-3 h-3" />}
                          {status.label}
                        </span>
                      </td>

                      <td className="p-4">
                        <ActionsMenu
                          record={record}
                          onShare={shareReminder}
                          onMarkCheckedIn={markAsCheckedIn}
                          onDelete={confirmDelete}
                          onGenerateInvoice={generateInvoice}
                          actionLoading={actionLoading}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredAndSortedRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl p-4 border border-slate-200">
          <div className="text-sm text-slate-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedRecords.length)} of {filteredAndSortedRecords.length} records
            {searchTerm && ` • Filtered by "${searchTerm}"`}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && recordToDelete && (
        <DeleteConfirmationModal 
          record={recordToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setRecordToDelete(null);
          }}
          onDelete={() => deleteRecord(recordToDelete.id)}
        />
      )}
    </div>
  );
}
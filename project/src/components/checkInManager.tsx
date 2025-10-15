import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, Plane, MapPin, Bell, 
  CheckCircle, XCircle, AlertTriangle, Filter,
  Search, MoreVertical, Share2, MessageCircle,
  Download, RefreshCw, ChevronDown, ChevronUp, Trash2, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  // Airline website mappings
  const airlineWebsites: { [key: string]: string } = {
    'American Airlines': 'https://www.aa.com',
    'Delta Air Lines': 'https://www.delta.com',
    'United Airlines': 'https://www.united.com',
    // Add more airline mappings as needed
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

  // Calculate record status
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

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              />
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
                onClick={() => setStatusFilter(filter.value)}
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
                {filteredAndSortedRecords.map((record) => {
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
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <a 
                          href={airlineWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                        >
                          <Plane className="w-4 h-4 text-slate-400" />
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {record.airline_name}
                            </div>
                            <div className="text-xs text-slate-500">
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => shareReminder(record)}
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Share reminder via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {!record.checkin_completed && status.status !== 'past' && (
                            <button
                              onClick={() => markAsCheckedIn(record.id)}
                              disabled={actionLoading === record.id}
                              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                              title="Mark as checked in"
                            >
                              {actionLoading === record.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => confirmDelete(record)}
                            disabled={actionLoading === record.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                            title="Delete record"
                          >
                            {actionLoading === record.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>

                          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-slate-500">
        Showing {filteredAndSortedRecords.length} of {records.length} records
        {searchTerm && ` • Filtered by "${searchTerm}"`}
      </div>

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
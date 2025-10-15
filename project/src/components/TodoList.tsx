import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Check, Circle, Trash2, Calendar, AlertCircle, Clock, User, 
  ChevronDown, X, Users, Building, Globe, Shield, RadioTower, Filter,
  Edit3, Star, Repeat, MessageSquare, Tag, FolderOpen,
  Play, Square, Pause, List, Grid, ChevronLeft, ChevronRight,
  StickyNote, Bell, BellOff
} from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';

// Constants
const TODO_CONSTANTS = {
  priorities: ['low', 'medium', 'high'] as const,
  statuses: ['not-started', 'in-progress', 'completed'] as const,
  categories: ['work', 'personal', 'shopping', 'health', 'finance', 'other'] as const,
  repeatOptions: ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const,
  countries: [
    { name: 'Kenya', code: 'KE' },
    { name: 'South Sudan', code: 'SS' },
    { name: 'Other', code: 'XX' }
  ] as const,
  tabs: ['all', 'active', 'completed', 'assigned-to-me', 'created-by-me', 'important'] as const,
  itemsPerPage: 9,
  reminderTypes: ['none', 'at_time', '5_minutes', '15_minutes', '1_hour', '1_day'] as const
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
  status: string;
  important: boolean;
  category: string;
  repeat: string;
  completed_comment: string | null;
  completed_at: string | null;
  time_tracked?: number;
  time_entries?: TimeEntry[];
  chat_messages?: ChatMessage[];
};

type TimeEntry = {
  id: string;
  todo_id: string;
  start_time: string;
  end_time: string | null;
  duration: number;
};

type ChatMessage = {
  id: string;
  todo_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
};

type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  color: string;
  tags: string[];
};

type Reminder = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  reminder_date: string;
  reminder_type: string;
  completed: boolean;
  created_at: string;
  todo_id?: string | null;
};

type FormData = {
  title: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  branchName: string;
  country: string;
  status: string;
  important: boolean;
  category: string;
  repeat: string;
};

type TeamMember = {
  id: string;
  email: string;
  name: string;
};

type ActiveTimer = {
  todoId: string;
  startTime: Date;
  entryId?: string;
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'not-started': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'completed': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'not-started': return <Circle className="w-3 h-3" />;
    case 'in-progress': return <Clock className="w-3 h-3" />;
    case 'completed': return <Check className="w-3 h-3" />;
    default: return <Circle className="w-3 h-3" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'work': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'personal': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'shopping': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'health': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'finance': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'other': return 'bg-slate-50 text-slate-700 border-slate-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getNoteColor = (color: string) => {
  switch (color) {
    case 'yellow': return 'bg-yellow-50 border-yellow-200';
    case 'blue': return 'bg-blue-50 border-blue-200';
    case 'green': return 'bg-green-50 border-green-200';
    case 'pink': return 'bg-pink-50 border-pink-200';
    case 'purple': return 'bg-purple-50 border-purple-200';
    default: return 'bg-slate-50 border-slate-200';
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

const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const calculateTotalTrackedTime = (timeEntries: TimeEntry[] = []) => {
  return timeEntries.reduce((total, entry) => total + entry.duration, 0);
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ 
  todo, 
  onClose, 
  onDelete 
}: { 
  todo: Todo; 
  onClose: () => void; 
  onDelete: (permanent: boolean) => void;
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (permanent: boolean) => {
    setDeleting(true);
    try {
      await onDelete(permanent);
      onClose();
    } catch (error) {
      console.error('Error deleting todo:', error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Delete Task</h3>
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
                Delete "{todo.title}"?
              </h4>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleDelete(true)}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-all text-sm disabled:opacity-50"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Task
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

// Chat Modal Component
const ChatModal = ({ 
  isOpen, 
  onClose, 
  todo,
  user,
  onSendMessage
}: { 
  isOpen: boolean;
  onClose: () => void;
  todo: Todo | null;
  user: any;
  onSendMessage: (todoId: string, message: string) => void;
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [todo?.chat_messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !todo || sending) return;

    setSending(true);
    try {
      await onSendMessage(todo.id, message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Task Discussion</h3>
            <p className="text-sm text-slate-600">{todo.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Messages */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {todo.chat_messages && todo.chat_messages.length > 0 ? (
              todo.chat_messages.map((chatMessage) => (
                <div
                  key={chatMessage.id}
                  className={`flex ${chatMessage.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      chatMessage.user_id === user?.id
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-900 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm">{chatMessage.message}</p>
                    <div className={`text-xs mt-1 ${
                      chatMessage.user_id === user?.id ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      {chatMessage.user_name || 'Unknown User'} • {new Date(chatMessage.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-all text-sm disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Simple Form Components
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

// Notes Pad Modal Component
const NotesPadModal = ({ 
  isOpen, 
  onClose, 
  notes,
  onSaveNote,
  onDeleteNote
}: { 
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSaveNote: (note: { title: string; content: string; color: string; tags: string[] }) => void;
  onDeleteNote: (id: string) => void;
}) => {
  const [newNote, setNewNote] = useState({ title: '', content: '', color: 'yellow', tags: [] as string[] });
  const [tagInput, setTagInput] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const resetForm = () => {
    setNewNote({ title: '', content: '', color: 'yellow', tags: [] });
    setTagInput('');
    setEditingNote(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.title.trim() && newNote.content.trim()) {
      onSaveNote(newNote);
      resetForm();
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      color: note.color,
      tags: note.tags
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNote && newNote.title.trim() && newNote.content.trim()) {
      onSaveNote({ ...newNote, id: editingNote.id });
      resetForm();
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newNote.tags.includes(tagInput.trim())) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const colorOptions = [
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">Notes Pad</h3>
          <button 
            onClick={() => { onClose(); resetForm(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Note Form */}
          <form onSubmit={editingNote ? handleUpdate : handleSubmit} className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormInput
                  label="Note Title"
                  value={newNote.title}
                  onChange={(value) => setNewNote(prev => ({ ...prev, title: value }))}
                  placeholder="Enter note title..."
                  required
                  icon={StickyNote}
                />
                
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewNote(prev => ({ ...prev, color: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newNote.color === color.value ? 'border-slate-800' : 'border-slate-300'
                        } ${color.class}`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
                      placeholder="Add tag..."
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-all"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newNote.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <FormTextarea
                  label="Note Content"
                  value={newNote.content}
                  onChange={(value) => setNewNote(prev => ({ ...prev, content: value }))}
                  placeholder="Write your note here..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all text-xs"
              >
                {editingNote ? 'Update Note' : 'Create Note'}
              </button>
              {editingNote && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all text-xs"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {/* Notes Grid */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Your Notes ({notes.length})</h4>
            {notes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm">No notes yet. Create your first note!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(note => (
                  <div
                    key={note.id}
                    className={`p-4 rounded-xl border ${getNoteColor(note.color)} transition-all hover:shadow-lg`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-slate-900 text-sm">{note.title}</h5>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(note)}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                          title="Edit note"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs mb-3 whitespace-pre-wrap">{note.content}</p>
                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/50 text-slate-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-2">
                      {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Reminders Modal Component
const RemindersModal = ({ 
  isOpen, 
  onClose, 
  reminders,
  onSaveReminder,
  onDeleteReminder,
  onToggleReminder,
  todos
}: { 
  isOpen: boolean;
  onClose: () => void;
  reminders: Reminder[];
  onSaveReminder: (reminder: { title: string; description: string; reminder_date: string; reminder_type: string; todo_id?: string }) => void;
  onDeleteReminder: (id: string) => void;
  onToggleReminder: (id: string, completed: boolean) => void;
  todos: Todo[];
}) => {
  const [newReminder, setNewReminder] = useState({ 
    title: '', 
    description: '', 
    reminder_date: '', 
    reminder_type: 'at_time',
    todo_id: '' 
  });

  const resetForm = () => {
    setNewReminder({ 
      title: '', 
      description: '', 
      reminder_date: '', 
      reminder_type: 'at_time',
      todo_id: '' 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newReminder.title.trim() && newReminder.reminder_date) {
      onSaveReminder(newReminder);
      resetForm();
    }
  };

  const reminderTypeOptions = [
    { value: 'none', label: 'No reminder' },
    { value: 'at_time', label: 'At scheduled time' },
    { value: '5_minutes', label: '5 minutes before' },
    { value: '15_minutes', label: '15 minutes before' },
    { value: '1_hour', label: '1 hour before' },
    { value: '1_day', label: '1 day before' }
  ];

  const todoOptions = [
    { value: '', label: 'No task linked' },
    ...todos.filter(todo => !todo.completed).map(todo => ({
      value: todo.id,
      label: `${todo.title} (${todo.status})`
    }))
  ];

  const upcomingReminders = reminders.filter(r => !r.completed && new Date(r.reminder_date) > new Date());
  const pastReminders = reminders.filter(r => r.completed || new Date(r.reminder_date) <= new Date());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">Reminders</h3>
          <button 
            onClick={() => { onClose(); resetForm(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Reminder Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormInput
                  label="Reminder Title"
                  value={newReminder.title}
                  onChange={(value) => setNewReminder(prev => ({ ...prev, title: value }))}
                  placeholder="What do you want to be reminded about?"
                  required
                  icon={Bell}
                />

                <FormSelect
                  label="Link to Task (Optional)"
                  value={newReminder.todo_id}
                  onChange={(value) => setNewReminder(prev => ({ ...prev, todo_id: value }))}
                  options={todoOptions}
                  icon={FolderOpen}
                />

                <FormSelect
                  label="Reminder Type"
                  value={newReminder.reminder_type}
                  onChange={(value) => setNewReminder(prev => ({ ...prev, reminder_type: value }))}
                  options={reminderTypeOptions}
                  icon={Clock}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Reminder Date & Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={newReminder.reminder_date}
                      onChange={(e) => setNewReminder(prev => ({ ...prev, reminder_date: e.target.value }))}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
                      required
                    />
                  </div>
                </div>

                <FormTextarea
                  label="Description (Optional)"
                  value={newReminder.description}
                  onChange={(value) => setNewReminder(prev => ({ ...prev, description: value }))}
                  placeholder="Add any additional details..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-semibold transition-all text-xs"
              >
                Set Reminder
              </button>
            </div>
          </form>

          {/* Upcoming Reminders */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">
              Upcoming Reminders ({upcomingReminders.length})
            </h4>
            {upcomingReminders.length === 0 ? (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">No upcoming reminders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleReminder(reminder.id, true)}
                        className="text-blue-500 hover:text-green-500 transition-colors"
                        title="Mark as completed"
                      >
                        <Circle className="w-5 h-5" />
                      </button>
                      <div>
                        <h5 className="font-semibold text-slate-900 text-sm">{reminder.title}</h5>
                        <p className="text-slate-600 text-xs">{reminder.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {new Date(reminder.reminder_date).toLocaleString()}
                          </span>
                          {reminder.todo_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              Linked to task
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteReminder(reminder.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past/Completed Reminders */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">
              Completed Reminders ({pastReminders.length})
            </h4>
            {pastReminders.length === 0 ? (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">No completed reminders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastReminders.map(reminder => (
                  <div key={reminder.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onToggleReminder(reminder.id, false)}
                        className="text-green-500 hover:text-blue-500 transition-colors"
                        title="Mark as incomplete"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <div>
                        <h5 className="font-semibold text-slate-900 text-sm line-through">{reminder.title}</h5>
                        <p className="text-slate-600 text-xs">{reminder.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {new Date(reminder.reminder_date).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteReminder(reminder.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// TodoFormModal Component with date restriction
const TodoFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  teamMembers, 
  user,
  editingTodo,
  onUpdate
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  teamMembers: TeamMember[];
  user: any;
  editingTodo?: Todo | null;
  onUpdate?: (id: string, formData: FormData) => void;
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    branchName: '',
    country: '',
    status: 'not-started',
    important: false,
    category: 'other',
    repeat: 'none'
  });

  useEffect(() => {
    if (isOpen) {
      if (editingTodo) {
        setFormData({
          title: editingTodo.title,
          priority: editingTodo.priority,
          due_date: editingTodo.due_date || '',
          assigned_to: editingTodo.assigned_to || '',
          branchName: editingTodo.branch_name || '',
          country: editingTodo.country || '',
          status: editingTodo.status,
          important: editingTodo.important,
          category: editingTodo.category,
          repeat: editingTodo.repeat
        });
      } else {
        setFormData({
          title: '',
          priority: 'medium',
          due_date: '',
          assigned_to: '',
          branchName: '',
          country: '',
          status: 'not-started',
          important: false,
          category: 'other',
          repeat: 'none'
        });
      }
    }
  }, [isOpen, editingTodo]);

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTodo && onUpdate) {
      onUpdate(editingTodo.id, formData);
    } else {
      onSubmit(formData);
    }
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

  const statusOptions = TODO_CONSTANTS.statuses.map(status => ({
    value: status,
    label: status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }));

  const categoryOptions = TODO_CONSTANTS.categories.map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1)
  }));

  const repeatOptions = TODO_CONSTANTS.repeatOptions.map(repeat => ({
    value: repeat,
    label: repeat.charAt(0).toUpperCase() + repeat.slice(1)
  }));

  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">
            {editingTodo ? 'Edit Task' : 'Create New Task'}
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
              {/* Task Title */}
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

              {/* Status and Category */}
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Status"
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  options={statusOptions}
                />

                <FormSelect
                  label="Category"
                  value={formData.category}
                  onChange={(value) => handleInputChange('category', value)}
                  icon={FolderOpen}
                  options={categoryOptions}
                />
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
                      min={today} // This restricts dates to today and future
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Repeat Option */}
              <FormSelect
                label="Repeat"
                value={formData.repeat}
                onChange={(value) => handleInputChange('repeat', value)}
                icon={Repeat}
                options={repeatOptions}
              />

              {/* Important Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${formData.important ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold text-slate-700">Mark as Important</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('important', !formData.important)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.important ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.important ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Preview Section */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-semibold text-slate-700">Preview</label>
                
                {/* Status and Priority Preview */}
                <div className="flex gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(formData.status)}`}>
                    {getStatusIcon(formData.status)}
                    {statusOptions.find(s => s.value === formData.status)?.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(formData.priority)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(formData.priority)}`} />
                    {priorityOptions.find(p => p.value === formData.priority)?.label}
                  </span>
                  {formData.important && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-500" />
                      Important
                    </span>
                  )}
                </div>

                {/* Category Preview */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getCategoryColor(formData.category)}`}>
                  <Tag className="w-3 h-3" />
                  {categoryOptions.find(c => c.value === formData.category)?.label}
                </span>

                {/* Repeat Preview */}
                {formData.repeat !== 'none' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                    <Repeat className="w-3 h-3" />
                    Repeats {formData.repeat}ly
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-xs"
            >
              {editingTodo ? 'Update Task' : 'Create Task'}
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

// Completion Comment Modal
const CompletionCommentModal = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
}) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(comment);
    setComment('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Add Completion Comment</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <FormTextarea
            label="Completion Comment"
            value={comment}
            onChange={setComment}
            placeholder="Add any notes about completing this task..."
          />
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-all text-xs"
            >
              Complete Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-all text-xs"
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
  const importantTodos = filteredTodos.filter(todo => 
    todo.important && !todo.completed
  );

  if (canManageAllTasks) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">My Task Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">
            {importantTodos.filter(t => t.assigned_to === user?.id).length}
          </div>
          <div className="text-xs text-slate-600">Important</div>
        </div>
      </div>
    </div>
  );
};

// Time Tracking Modal
const TimeTrackingModal = ({ 
  isOpen, 
  onClose, 
  todo,
  timeEntries = []
}: { 
  isOpen: boolean;
  onClose: () => void;
  todo: Todo | null;
  timeEntries: TimeEntry[];
}) => {
  const totalTime = calculateTotalTrackedTime(timeEntries);

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-slate-900">Time Tracking - {todo.title}</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Total Time Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Total Time Tracked</h4>
                <p className="text-2xl font-bold text-blue-600">{formatTime(totalTime)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Time Entries List */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Time Entries</h4>
            {timeEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm">No time entries recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {timeEntries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {new Date(entry.start_time).toLocaleDateString()} at {new Date(entry.start_time).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          Duration: {formatTime(entry.duration)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatTime(entry.duration)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showCompletionComment, setShowCompletionComment] = useState(false);
  const [completingTodoId, setCompletingTodoId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [roleLoading, setRoleLoading] = useState(true);
  
  // New state for enhanced features
  const [activeTab, setActiveTab] = useState<(typeof TODO_CONSTANTS.tabs)[number]>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [selectedTodoForTime, setSelectedTodoForTime] = useState<Todo | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // New state for notes and reminders
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showNotesPad, setShowNotesPad] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [selectedTodoForChat, setSelectedTodoForChat] = useState<Todo | null>(null);
  
  // Delete confirmation state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [importantFilter, setImportantFilter] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [showBranchCountryFilter, setShowBranchCountryFilter] = useState(false);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTodos.length / TODO_CONSTANTS.itemsPerPage);
  const startIndex = (currentPage - 1) * TODO_CONSTANTS.itemsPerPage;
  const paginatedTodos = filteredTodos.slice(startIndex, startIndex + TODO_CONSTANTS.itemsPerPage);

  // Apply tab filters
  const applyTabFilter = useCallback((todosToFilter: Todo[]) => {
    switch (activeTab) {
      case 'active':
        return todosToFilter.filter(todo => !todo.completed);
      case 'completed':
        return todosToFilter.filter(todo => todo.completed);
      case 'assigned-to-me':
        return todosToFilter.filter(todo => todo.assigned_to === user?.id);
      case 'created-by-me':
        return todosToFilter.filter(todo => todo.user_id === user?.id);
      case 'important':
        return todosToFilter.filter(todo => todo.important);
      default:
        return todosToFilter;
    }
  }, [activeTab, user]);

  // Apply all filters when todos or filter settings change
  useEffect(() => {
    applyAllFilters();
  }, [todos, dateFilter, customStartDate, customEndDate, branchFilter, countryFilter, statusFilter, categoryFilter, importantFilter, activeTab]);

  const applyAllFilters = useCallback(() => {
    if (!todos.length) {
      setFilteredTodos([]);
      return;
    }

    let filtered = [...todos];

    // Apply tab filter first
    filtered = applyTabFilter(filtered);

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

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(todo => todo.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(todo => todo.category === categoryFilter);
    }

    // Apply important filter
    if (importantFilter) {
      filtered = filtered.filter(todo => todo.important);
    }

    setFilteredTodos(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [todos, dateFilter, customStartDate, customEndDate, branchFilter, countryFilter, statusFilter, categoryFilter, importantFilter, applyTabFilter]);

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

  // Time tracking functions
  const startTimer = useCallback(async (todoId: string) => {
    if (activeTimer) {
      await stopTimer();
    }

    const startTime = new Date();
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          todo_id: todoId,
          start_time: startTime.toISOString(),
          end_time: null,
          duration: 0
        }])
        .select()
        .single();

      if (error) throw error;

      setActiveTimer({
        todoId,
        startTime,
        entryId: data.id
      });
      
      // Auto-start timer after task creation
      fetchTodos(); // Refresh to update UI
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  }, [activeTimer]);

  const stopTimer = useCallback(async () => {
    if (!activeTimer) return;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 1000);

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration
        })
        .eq('id', activeTimer.entryId);

      if (error) throw error;

      setActiveTimer(null);
      fetchTodos(); // Refresh to update total time
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  }, [activeTimer]);

  const fetchTimeEntries = useCallback(async (todoId: string) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('todo_id', todoId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setTimeEntries([]);
    }
  }, []);

  const showTimeTrackingForTodo = useCallback(async (todo: Todo) => {
    setSelectedTodoForTime(todo);
    await fetchTimeEntries(todo.id);
    setShowTimeTracking(true);
  }, [fetchTimeEntries]);

  // Chat functions
  const fetchChatMessages = useCallback(async (todoId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('todo_id', todoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch user names for messages
      const messagesWithUserNames = await Promise.all(
        (messages || []).map(async (message) => {
          try {
            const { data: userData } = await supabase
              .from('profiles')
              .select('full_name, name, email')
              .eq('id', message.user_id)
              .single();

            return {
              ...message,
              user_name: userData?.full_name || userData?.name || userData?.email?.split('@')[0] || 'Unknown User',
              user_email: userData?.email
            };
          } catch (error) {
            return {
              ...message,
              user_name: 'Unknown User'
            };
          }
        })
      );

      return messagesWithUserNames;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
  }, []);

  const sendChatMessage = useCallback(async (todoId: string, message: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          todo_id: todoId,
          user_id: user.id,
          message: message.trim(),
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Refresh the todo with updated chat messages
      fetchTodos();
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }, [user]);

  const openChat = useCallback(async (todo: Todo) => {
    setSelectedTodoForChat(todo);
    setShowChat(true);
  }, []);

  // Memoized handlers
  const handleFormSubmit = useCallback(async (formData: FormData) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.from('todos').insert([{
        user_id: user.id,
        title: formData.title,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        branch_name: formData.branchName || null,
        country: formData.country || null,
        status: formData.status,
        important: formData.important,
        category: formData.category,
        repeat: formData.repeat,
        completed: false,
        completed_comment: null,
        completed_at: null
      }]).select().single();

      if (error) throw error;

      // Auto-start timer after task creation
      if (data) {
        await startTimer(data.id);
      }

      fetchTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  }, [user, startTimer]);

  const handleUpdateTodo = useCallback(async (id: string, formData: FormData) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          title: formData.title,
          priority: formData.priority,
          due_date: formData.due_date || null,
          assigned_to: formData.assigned_to || null,
          branch_name: formData.branchName || null,
          country: formData.country || null,
          status: formData.status,
          important: formData.important,
          category: formData.category,
          repeat: formData.repeat,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      fetchTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingTodo(null);
  }, []);

  const startEditTodo = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setShowForm(true);
  }, []);

  // Fetch notes and reminders
  const fetchNotes = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, [user]);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('reminder_date', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  }, [user]);

  // Data fetching with user roles
  useEffect(() => {
    if (user) {
      fetchUserRoleAndData();
      fetchNotes();
      fetchReminders();
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
      } else {
        // For admin/operations, fetch all tasks
        const { data: fetchedData, error: fetchError } = await supabase
          .from('todos')
          .select('*')
          .order('completed', { ascending: true })
          .order('created_at', { ascending: false });
        
        data = fetchedData;
        error = fetchError;
      }

      if (error) throw error;

      // Fetch user names for todos and time entries and chat messages
      const todosWithUserNamesAndTime = await Promise.all(
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

            // Fetch time entries for this todo
            let timeEntries: TimeEntry[] = [];
            let totalTimeTracked = 0;
            try {
              const { data: timeData } = await supabase
                .from('time_entries')
                .select('*')
                .eq('todo_id', todo.id)
                .order('start_time', { ascending: false });

              timeEntries = timeData || [];
              totalTimeTracked = calculateTotalTrackedTime(timeEntries);
            } catch (timeError) {
              console.error('Error fetching time entries:', timeError);
            }

            // Fetch chat messages for this todo
            let chatMessages: ChatMessage[] = [];
            try {
              chatMessages = await fetchChatMessages(todo.id);
            } catch (chatError) {
              console.error('Error fetching chat messages:', chatError);
            }

            return {
              ...todo,
              user_name: creatorName,
              assigned_user_name: assignedUserName,
              // Ensure default values for new fields
              status: todo.status || 'not-started',
              important: todo.important || false,
              category: todo.category || 'other',
              repeat: todo.repeat || 'none',
              completed_comment: todo.completed_comment || null,
              completed_at: todo.completed_at || null,
              time_tracked: totalTimeTracked,
              time_entries: timeEntries,
              chat_messages: chatMessages
            };
          } catch (error) {
            console.error('Error fetching user data for todo:', error);
            return {
              ...todo,
              user_name: `user_${todo.user_id.substring(0, 8)}`,
              assigned_user_name: todo.assigned_to ? `user_${todo.assigned_to.substring(0, 8)}` : '',
              status: todo.status || 'not-started',
              important: todo.important || false,
              category: todo.category || 'other',
              repeat: todo.repeat || 'none',
              completed_comment: todo.completed_comment || null,
              completed_at: todo.completed_at || null,
              time_tracked: 0,
              time_entries: [],
              chat_messages: []
            };
          }
        })
      );

      setTodos(todosWithUserNamesAndTime);
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

  const canCompleteTask = useCallback((todo: Todo, role = userRole) => {
    if (['admin', 'operations'].includes(role)) return true;
    return todo.user_id === user?.id || todo.assigned_to === user?.id;
  }, [userRole, user]);

  // Notes and Reminders handlers
  const handleSaveNote = useCallback(async (noteData: { title: string; content: string; color: string; tags: string[] }) => {
    if (!user) return;

    try {
      if (noteData.id) {
        // Update existing note
        const { error } = await supabase
          .from('notes')
          .update({
            title: noteData.title,
            content: noteData.content,
            color: noteData.color,
            tags: noteData.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', noteData.id);

        if (error) throw error;
      } else {
        // Create new note
        const { error } = await supabase.from('notes').insert([{
          user_id: user.id,
          title: noteData.title,
          content: noteData.content,
          color: noteData.color,
          tags: noteData.tags
        }]);

        if (error) throw error;
      }

      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  }, [user, fetchNotes]);

  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }, [fetchNotes]);

  const handleSaveReminder = useCallback(async (reminderData: { title: string; description: string; reminder_date: string; reminder_type: string; todo_id?: string }) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('reminders').insert([{
        user_id: user.id,
        title: reminderData.title,
        description: reminderData.description,
        reminder_date: reminderData.reminder_date,
        reminder_type: reminderData.reminder_type,
        todo_id: reminderData.todo_id || null,
        completed: false
      }]);

      if (error) throw error;
      fetchReminders();
    } catch (error) {
      console.error('Error saving reminder:', error);
    }
  }, [user, fetchReminders]);

  const handleDeleteReminder = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      fetchReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  }, [fetchReminders]);

  const handleToggleReminder = useCallback(async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed })
        .eq('id', id);

      if (error) throw error;
      fetchReminders();
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  }, [fetchReminders]);

  // Check for upcoming reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const upcomingReminders = reminders.filter(
        reminder => !reminder.completed && new Date(reminder.reminder_date) <= now
      );

      upcomingReminders.forEach(reminder => {
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Reminder: ${reminder.title}`, {
            body: reminder.description,
            icon: '/favicon.ico'
          });
        }

        // Show alert as fallback
        alert(`Reminder: ${reminder.title}\n${reminder.description}`);
        
        // Mark as completed
        handleToggleReminder(reminder.id, true);
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [reminders, handleToggleReminder]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  const resetStatusCategoryFilter = useCallback(() => {
    setStatusFilter('');
    setCategoryFilter('');
    setImportantFilter(false);
  }, []);

  const resetAllFilters = useCallback(() => {
    resetDateFilter();
    resetBranchCountryFilter();
    resetStatusCategoryFilter();
  }, [resetDateFilter, resetBranchCountryFilter, resetStatusCategoryFilter]);

  const hasActiveFilters = useCallback(() => {
    return dateFilter !== 'all' || branchFilter || countryFilter || statusFilter || categoryFilter || importantFilter;
  }, [dateFilter, branchFilter, countryFilter, statusFilter, categoryFilter, importantFilter]);

  // Todo actions
  const toggleComplete = useCallback(async (id: string, completed: boolean) => {
    if (activeTimer?.todoId === id) {
      await stopTimer();
    }

    if (!completed) {
      // If marking as complete, show comment modal
      setCompletingTodoId(id);
      setShowCompletionComment(true);
    } else {
      // If marking as incomplete, just update status
      try {
        const { error } = await supabase
          .from('todos')
          .update({ 
            completed: false,
            status: 'not-started',
            completed_comment: null,
            completed_at: null,
            updated_at: new Date().toISOString() 
          })
          .eq('id', id);
        if (error) throw error;
        fetchTodos();
      } catch (error) {
        console.error('Error updating todo:', error);
      }
    }
  }, [activeTimer, stopTimer]);

  const handleCompleteWithComment = useCallback(async (comment: string) => {
    if (!completingTodoId) return;

    if (activeTimer?.todoId === completingTodoId) {
      await stopTimer();
    }

    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          completed: true,
          status: 'completed',
          completed_comment: comment,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', completingTodoId);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error completing todo:', error);
    } finally {
      setShowCompletionComment(false);
      setCompletingTodoId(null);
    }
  }, [completingTodoId, activeTimer, stopTimer]);

  const handleDelete = useCallback(async (id: string, permanent: boolean = true) => {
    if (activeTimer?.todoId === id) {
      await stopTimer();
    }

    try {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }, [activeTimer, stopTimer]);

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

  const toggleImportant = useCallback(async (id: string, important: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          important: !important,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error toggling important:', error);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ 
          status,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, []);

  // Delete confirmation handler
  const confirmDelete = useCallback((todo: Todo) => {
    setTodoToDelete(todo);
    setShowDeleteModal(true);
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
      {todos.length > 0 && (hasActiveFilters() || activeTab !== 'all') && (
        <button
          onClick={() => {
            resetAllFilters();
            setActiveTab('all');
          }}
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
        { id: 'all', label: 'All Tasks', count: todos.length },
        { id: 'active', label: 'Active', count: todos.filter(t => !t.completed).length },
        { id: 'completed', label: 'Completed', count: todos.filter(t => t.completed).length },
        { id: 'assigned-to-me', label: 'Assigned to Me', count: todos.filter(t => t.assigned_to === user?.id).length },
        { id: 'created-by-me', label: 'Created by Me', count: todos.filter(t => t.user_id === user?.id).length },
        { id: 'important', label: 'Important', count: todos.filter(t => t.important).length },
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
          Showing {startIndex + 1}-{Math.min(startIndex + TODO_CONSTANTS.itemsPerPage, filteredTodos.length)} of {filteredTodos.length} tasks
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                  onClick={() => setCurrentPage(pageNum)}
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
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

  // StatusCategoryFilterDropdown
  const StatusCategoryFilterDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setShowBranchCountryFilter(!showBranchCountryFilter)}
        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all border border-slate-200 text-xs"
      >
        <Filter className="w-4 h-4" />
        Status & Category
        {(statusFilter || categoryFilter || importantFilter) && (
          <span className="bg-blue-500 text-white rounded-full w-2 h-2"></span>
        )}
      </button>

      {/* Status & Category Filter Dropdown */}
      {showBranchCountryFilter && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 z-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Filter by Status & Category</h3>
            <button 
              onClick={() => setShowBranchCountryFilter(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Filter */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-xs"
            >
              <option value="">All Statuses</option>
              {TODO_CONSTANTS.statuses.map(status => (
                <option key={status} value={status}>
                  {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
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
              {TODO_CONSTANTS.categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Important Filter */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <Star className={`w-4 h-4 ${importantFilter ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
              <span className="text-xs font-semibold text-slate-700">Important Tasks Only</span>
            </div>
            <button
              type="button"
              onClick={() => setImportantFilter(!importantFilter)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                importantFilter ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  importantFilter ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Active Filter Info */}
          {(statusFilter || categoryFilter || importantFilter) && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex flex-wrap gap-2 mb-3">
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                    Status: {statusFilter.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    <button onClick={() => setStatusFilter('')} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                    Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                    <button onClick={() => setCategoryFilter('')} className="text-purple-500 hover:text-purple-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {importantFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                    Important
                    <button onClick={() => setImportantFilter(false)} className="text-amber-500 hover:text-amber-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={resetStatusCategoryFilter}
                className="text-blue-500 hover:text-blue-700 text-xs font-medium"
              >
                Clear status & category filters
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
    const isTimerRunning = activeTimer?.todoId === todo.id;
    const canComplete = canCompleteTask(todo, userRole);
    
    return (
      <div
        className={`group bg-white/70 backdrop-blur-xl rounded-2xl shadow-md hover:shadow-xl p-5 border border-slate-200/60 transition-all duration-300 hover:scale-[1.02] flex flex-col h-full ${
          todo.completed ? 'opacity-60 hover:opacity-100' : ''
        } ${isAssignedToMe ? 'border-l-4 border-l-blue-500' : ''} ${
          todo.important ? 'bg-orange-100/30' : ''
        } ${isTimerRunning ? 'border-t-4 border-t-green-500' : ''}`}
      >
        {/* Header with title and actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-1 pr-2">
            <button
              onClick={() => canComplete && toggleComplete(todo.id, todo.completed)}
              className={`flex-shrink-0 transition-all transform hover:scale-110 ${
                !canComplete ? 'cursor-not-allowed opacity-50' :
                todo.completed 
                  ? 'text-green-500 hover:text-slate-400' 
                  : 'text-slate-300 hover:text-blue-600'
              }`}
              title={!canComplete ? "Only task creator or admin can complete this task" : todo.completed ? "Mark as incomplete" : "Mark as complete"}
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
          <div className="flex items-center gap-1">
            {/* Chat Button */}
            <button
              onClick={() => openChat(todo)}
              className="text-slate-400 hover:text-blue-500 transition-all p-1.5 rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="Open chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            {/* Time Tracking Button */}
            <button
              onClick={() => showTimeTrackingForTodo(todo)}
              className="text-slate-400 hover:text-indigo-500 transition-all p-1.5 rounded-lg hover:bg-indigo-50 opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="View time tracking"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>

            {/* Timer Control */}
            {!todo.completed && (
              <button
                onClick={async () => {
                  if (isTimerRunning) {
                    await stopTimer();
                  } else {
                    await startTimer(todo.id);
                  }
                }}
                className={`transition-all p-1.5 rounded-lg opacity-0 group-hover:opacity-100 flex-shrink-0 ${
                  isTimerRunning
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                    : 'text-slate-400 hover:text-green-500 hover:bg-green-50'
                }`}
                title={isTimerRunning ? 'Stop timer' : 'Start timer'}
              >
                {isTimerRunning ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            <button
              onClick={() => startEditTodo(todo)}
              className="text-slate-400 hover:text-blue-500 transition-all p-1.5 rounded-lg hover:bg-blue-50 opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="Edit task"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toggleImportant(todo.id, todo.important)}
              className={`transition-all p-1.5 rounded-lg hover:bg-amber-50 opacity-0 group-hover:opacity-100 flex-shrink-0 ${
                todo.important 
                  ? 'text-amber-500 hover:text-amber-600' 
                  : 'text-slate-400 hover:text-amber-500'
              }`}
              title={todo.important ? 'Remove from important' : 'Mark as important'}
            >
              <Star className={`w-3.5 h-3.5 ${todo.important ? 'fill-amber-500' : ''}`} />
            </button>
            {canDeleteTask(todo) && (
              <button
                onClick={() => confirmDelete(todo)}
                className="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 flex-shrink-0"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {/* Status Badge */}
          <div className="relative">
            <select
              value={todo.status}
              onChange={(e) => updateStatus(todo.id, e.target.value)}
              disabled={todo.completed}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border cursor-pointer appearance-none pr-6 ${
                todo.completed ? 'cursor-not-allowed opacity-50' : ''
              } ${getStatusColor(todo.status)}`}
            >
              {TODO_CONSTANTS.statuses.map(status => (
                <option key={status} value={status}>
                  {status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
            {!todo.completed && (
              <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
            )}
          </div>

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

          {/* Category Tag */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getCategoryColor(todo.category)}`}>
            <Tag className="w-3 h-3" />
            {todo.category.charAt(0).toUpperCase() + todo.category.slice(1)}
          </span>

          {/* Repeat Tag */}
          {todo.repeat !== 'none' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              <Repeat className="w-3 h-3" />
              {todo.repeat}ly
            </span>
          )}

          {/* Time Tracked Tag */}
          {todo.time_tracked && todo.time_tracked > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              <Clock className="w-3 h-3" />
              {formatTime(todo.time_tracked)}
            </span>
          )}

          {/* Active Timer Badge */}
          {isTimerRunning && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold border border-green-200 animate-pulse">
              <Play className="w-3 h-3" />
              Timing...
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

        {/* Completion Comment */}
        {todo.completed && todo.completed_comment && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3 h-3 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Completion Notes</span>
            </div>
            <p className="text-xs text-green-600">{todo.completed_comment}</p>
            {todo.completed_at && (
              <p className="text-xs text-green-500 mt-1">
                Completed on {new Date(todo.completed_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Chat Preview */}
        {todo.chat_messages && todo.chat_messages.length > 0 && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">
                Discussion ({todo.chat_messages.length} messages)
              </span>
            </div>
            <p className="text-xs text-blue-600 line-clamp-2">
              {todo.chat_messages[todo.chat_messages.length - 1].message}
            </p>
            <button
              onClick={() => openChat(todo)}
              className="text-xs text-blue-500 hover:text-blue-700 font-medium mt-1"
            >
              View conversation
            </button>
          </div>
        )}

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-1">Task Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">
              {filteredTodos.length} tasks • {teamMembers.length} team members
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
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Notes Pad Button */}
          <button
            onClick={() => setShowNotesPad(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all text-xs"
          >
            <StickyNote className="w-4 h-4" />
            Notes
            {notes.length > 0 && (
              <span className="bg-amber-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {notes.length}
              </span>
            )}
          </button>

          {/* Reminders Button */}
          <button
            onClick={() => setShowReminders(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all text-xs"
          >
            <Bell className="w-4 h-4" />
            Reminders
            {reminders.filter(r => !r.completed).length > 0 && (
              <span className="bg-green-700 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {reminders.filter(r => !r.completed).length}
              </span>
            )}
          </button>

          {/* Status & Category Filter */}
          <StatusCategoryFilterDropdown />

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
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                    {getStatusIcon(statusFilter)}
                    Status: {statusFilter.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    <button onClick={() => setStatusFilter('')} className="text-blue-500 hover:text-blue-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                    <Tag className="w-3 h-3" />
                    Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}
                    <button onClick={() => setCategoryFilter('')} className="text-purple-500 hover:text-purple-700">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {importantFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                    <Star className="w-3 h-3 fill-amber-500" />
                    Important Only
                    <button onClick={() => setImportantFilter(false)} className="text-amber-500 hover:text-amber-700">
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

      {/* Modals */}
      <TodoFormModal 
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        onUpdate={handleUpdateTodo}
        teamMembers={teamMembers}
        user={user}
        editingTodo={editingTodo}
      />

      <CompletionCommentModal
        isOpen={showCompletionComment}
        onClose={() => {
          setShowCompletionComment(false);
          setCompletingTodoId(null);
        }}
        onSubmit={handleCompleteWithComment}
      />

      <TimeTrackingModal
        isOpen={showTimeTracking}
        onClose={() => {
          setShowTimeTracking(false);
          setSelectedTodoForTime(null);
          setTimeEntries([]);
        }}
        todo={selectedTodoForTime}
        timeEntries={timeEntries}
      />

      <ChatModal
        isOpen={showChat}
        onClose={() => {
          setShowChat(false);
          setSelectedTodoForChat(null);
        }}
        todo={selectedTodoForChat}
        user={user}
        onSendMessage={sendChatMessage}
      />

      {showDeleteModal && todoToDelete && (
        <DeleteConfirmationModal 
          todo={todoToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setTodoToDelete(null);
          }}
          onDelete={(permanent) => {
            handleDelete(todoToDelete.id, permanent);
            setShowDeleteModal(false);
            setTodoToDelete(null);
          }}
        />
      )}

      <NotesPadModal
        isOpen={showNotesPad}
        onClose={() => setShowNotesPad(false)}
        notes={notes}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote}
      />

      <RemindersModal
        isOpen={showReminders}
        onClose={() => setShowReminders(false)}
        reminders={reminders}
        onSaveReminder={handleSaveReminder}
        onDeleteReminder={handleDeleteReminder}
        onToggleReminder={handleToggleReminder}
        todos={todos}
      />

      {filteredTodos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-4'}`}>
            {paginatedTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </div>
          
          <Pagination />
        </>
      )}
    </div>
  );
}
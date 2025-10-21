import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { QueueList } from './QueueList';
import { TodoList } from './TodoList';
import { TravelAgent } from './GenerateTicket'; // Import the TravelAgent component
import { LogOut, ListTodo, User, ChevronDown, Settings, Shield, FileStack, AlarmClockCheck, Plane, Bell, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CheckInManager } from './checkInManager';
import { ClientManagement } from './clientData';

type View = 'queues' | 'todos' | 'travel' | 'checkins' | 'passenger'; // Add travel to the view types

export function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState<View>('queues');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleRoleSettings = () => {
    navigate('/admin/users');
    setShowUserMenu(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      <nav className="bg-blue-700 backdrop-blur-xl border-b border-blue-500/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8  rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                <svg 
                  className="w-3 h-3 text-white" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M0 0h11.377v11.372H0zm0 12.628h11.377V24H0zm12.623 0H24V24H12.623zm0-11.372V0H24v11.628H12.623z"/>
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-white">
                Microsoft Task Manager
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Settings Icon - Only show for admins */}
              {isAdmin && (
                <button
                  onClick={handleRoleSettings}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-blue-500/80 transition-all group"
                  title="Role Settings"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <Settings className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white hidden sm:inline">
                    Settings
                  </span>
                </button>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-blue-500/80 transition-all group"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-white hidden sm:inline max-w-[150px] truncate">
                    {user?.email}
                  </span>
                  <ChevronDown className="w-3 h-3 text-white/80 group-hover:text-white transition-colors" />
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Signed in as</p>
                        <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                        {user?.user_metadata?.role && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Shield className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500 capitalize">
                              {user.user_metadata.role.toLowerCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Role Settings Option - Only for admins */}
                      {isAdmin && (
                        <button
                          onClick={handleRoleSettings}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                        >
                          <Settings className="w-4 h-4" />
                          <div>
                            <div className="font-medium">Role Settings</div>
                            <div className="text-xs text-slate-500">Manage user permissions</div>
                          </div>
                        </button>
                      )}

                      {/* Sign Out Option */}
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-8 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/60 shadow-sm inline-flex">
          <button
            onClick={() => setActiveView('queues')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeView === 'queues'
                ? 'bg-white text-blue-600 shadow-md scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileStack className="w-4 h-4" />
            Queue Items
          </button>
          <button
            onClick={() => setActiveView('todos')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeView === 'todos'
                ? 'bg-white text-blue-600 shadow-md scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <AlarmClockCheck className="w-4 h-4" />
            Todo List
          </button>
          <button
            onClick={() => setActiveView('travel')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeView === 'travel'
                ? 'bg-white text-blue-600 shadow-md scale-105'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Plane className="w-4 h-4" />
            Travel Parser
          </button>
          <button
  onClick={() => setActiveView('checkins')}
  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
    activeView === 'checkins'
      ? 'bg-white text-blue-600 shadow-md scale-105'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
  }`}
>
  <Bell className="w-4 h-4" />
  Check-ins
</button>
 <button
  onClick={() => setActiveView('passenger')}
  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
    activeView === 'passenger'
      ? 'bg-white text-blue-600 shadow-md scale-105'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
  }`}
>
  <UserPlus className="w-4 h-4" />
  Passangers
</button>
        </div>

        <div className="transition-all duration-300">
          {activeView === 'queues' && <QueueList />}
          {activeView === 'todos' && <TodoList />}
          {activeView === 'travel' && <TravelAgent />}
          {activeView === 'checkins' && <CheckInManager />}
          {activeView === 'passenger' && <ClientManagement />}
        </div>
      </div>
    </div>
  );
}
// components/NotificationPreferences.tsx
import { useState } from 'react';
import { Bell, BellOff, X, Settings, Volume2, VolumeX } from 'lucide-react';

type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: any;
  onUpdatePreferences: (prefs: any) => void;
  onRequestNotificationPermission: () => Promise<boolean>;
  onEnableAudio: () => void;
  permission: NotificationPermission;
  audioPermission: boolean;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  onRequestNotificationPermission,
  onEnableAudio,
  permission,
  audioPermission,
}) => {
  const [requesting, setRequesting] = useState(false);

  if (!isOpen) return null;

  const handleToggleTier = (tier: string) => {
    onUpdatePreferences({
      tiers: {
        ...preferences.tiers,
        [tier]: !preferences.tiers[tier]
      }
    });
  };

  const handleRequestPermission = async () => {
    setRequesting(true);
    await onRequestNotificationPermission();
    setRequesting(false);
  };

  const handleTestSound = () => {
    // Create a temporary audio element for testing
    const audio = new Audio('/notification-alert.mp3');
    audio.volume = 0.7;
    audio.play().catch(e => console.log('Test sound failed:', e));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Notification Settings
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Global Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Enable Notifications</h4>
              <p className="text-xs text-slate-600">Master switch for all notification types</p>
            </div>
            <button
              onClick={() => onUpdatePreferences({ enabled: !preferences.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.enabled ? 'bg-blue-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Tier Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-sm">Notification Types</h4>
            
            {/* Visual Badges */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 text-sm">Visual Badges & Banners</h5>
                <p className="text-xs text-slate-600">In-app alerts and counters</p>
              </div>
              <button
                onClick={() => handleToggleTier('visual')}
                disabled={!preferences.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.tiers.visual && preferences.enabled ? 'bg-green-500' : 'bg-slate-300'
                } ${!preferences.enabled ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.tiers.visual && preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Browser Tab Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 text-sm">Browser Tab Alerts</h5>
                <p className="text-xs text-slate-600">Blinking title when tab is backgrounded</p>
              </div>
              <button
                onClick={() => handleToggleTier('tab')}
                disabled={!preferences.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.tiers.tab && preferences.enabled ? 'bg-green-500' : 'bg-slate-300'
                } ${!preferences.enabled ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.tiers.tab && preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 text-sm">Push Notifications</h5>
                <p className="text-xs text-slate-600">System notifications</p>
                {permission === 'denied' && (
                  <p className="text-xs text-red-600">Permission blocked in browser</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {permission !== 'granted' ? (
                  <button
                    onClick={handleRequestPermission}
                    disabled={requesting || !preferences.enabled || permission === 'denied'}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {requesting ? 'Requesting...' : 'Enable'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleTier('push')}
                    disabled={!preferences.enabled}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.tiers.push && preferences.enabled ? 'bg-green-500' : 'bg-slate-300'
                    } ${!preferences.enabled ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.tiers.push && preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Sound Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 text-sm">Sound Alerts</h5>
                <p className="text-xs text-slate-600">Audible notifications</p>
              </div>
              <div className="flex items-center gap-2">
                {!audioPermission ? (
                  <button
                    onClick={onEnableAudio}
                    disabled={!preferences.enabled}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    <Volume2 className="w-3 h-3" />
                    Enable
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTestSound}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium hover:bg-slate-200"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggleTier('sound')}
                      disabled={!preferences.enabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        preferences.tiers.sound && preferences.enabled ? 'bg-green-500' : 'bg-slate-300'
                      } ${!preferences.enabled ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          preferences.tiers.sound && preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
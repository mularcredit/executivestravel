// components/UrgentItemsBanner.tsx
import { X, AlertTriangle, Bell, BellOff } from 'lucide-react';

interface Queue {
  id: string;
  title: string;
  priority: string;
  amount: number | null;
  currency: string;
}

interface UrgentItemsBannerProps {
  urgentItems: Queue[];
  isVisible: boolean;
  onAcknowledgeAll: () => void;
  onDismiss: () => void;
  onViewUrgent: () => void;
  preferences: any;
  onTogglePreferences: () => void;
}

const convertCurrencySync = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  const FALLBACK_RATES = { USD: 1, KES: 150, SSP: 1000 };
  const amountInUSD = amount / FALLBACK_RATES[fromCurrency as keyof typeof FALLBACK_RATES];
  return amountInUSD * FALLBACK_RATES[toCurrency as keyof typeof FALLBACK_RATES];
};

export const UrgentItemsBanner: React.FC<UrgentItemsBannerProps> = ({
  urgentItems,
  isVisible,
  onAcknowledgeAll,
  onDismiss,
  onViewUrgent,
  preferences,
  onTogglePreferences,
}) => {
  if (!isVisible || urgentItems.length === 0) return null;

  const highPriorityCount = urgentItems.filter(q => q.priority === 'high').length;
  const largeAmountCount = urgentItems.filter(q => 
    q.amount && convertCurrencySync(q.amount, q.currency, 'USD') > 500
  ).length;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-pulse">
      <div className="bg-gradient-to-r from-green-900 to-green-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                
                <span className="font-bold text-sm"></span>
              </div>
              
              {/* <div className="flex items-center gap-4 text-sm">
                <span>
                  {urgentItems.length} urgent item{urgentItems.length !== 1 ? 's' : ''} need{urgentItems.length === 1 ? 's' : ''} action
                </span>
                
                {highPriorityCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    {highPriorityCount} high priority
                  </span>
                )}
                
                {largeAmountCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                    {largeAmountCount} large amounts
                  </span>
                )}
              </div> */}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onViewUrgent}
                className="px-4 py-1.5 bg-white text-green-700 rounded-lg font-semibold text-sm hover:bg-red-50 transition-all hover:scale-105 shadow-lg"
              >
                View Now
              </button>
              
              <button
                onClick={onAcknowledgeAll}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-all shadow-lg"
              >
                Acknowledge All
              </button>
              
              <button
                onClick={onTogglePreferences}
                className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-all"
                title={preferences.enabled ? "Disable notifications" : "Enable notifications"}
              >
                {preferences.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              
              <button
                onClick={onDismiss}
                className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
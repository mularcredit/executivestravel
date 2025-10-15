// components/DashboardSummary.tsx
import { AlertTriangle } from 'lucide-react';

interface Queue {
  user_id: string;
  status: string;
  priority: string;
  amount: number | null;
  currency: string;
}

interface DashboardSummaryProps {
  filteredQueues: Queue[];
  user: any;
  canManageAllQueues: boolean;
  urgentItemsCount: number;
  requiresAttention: boolean;
}

const convertCurrencySync = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  const FALLBACK_RATES = { USD: 1, KES: 150, SSP: 1000 };
  const amountInUSD = amount / FALLBACK_RATES[fromCurrency as keyof typeof FALLBACK_RATES];
  return amountInUSD * FALLBACK_RATES[toCurrency as keyof typeof FALLBACK_RATES];
};

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({ 
  filteredQueues, 
  user, 
  canManageAllQueues,
  urgentItemsCount,
  requiresAttention
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
    <div className={`border rounded-xl p-4 mb-6 transition-all duration-300 ${
      requiresAttention 
        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg' 
        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
    }`}>
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        My Queue Summary
        {requiresAttention && (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded-full text-xs">
            <AlertTriangle className="w-3 h-3" />
            Attention Required
          </span>
        )}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            urgentItemsCount > 0 ? 'text-red-600' : 'text-blue-600'
          }`}>
            {myPendingQueues.length}
          </div>
          <div className="text-xs text-slate-600">My Pending</div>
          {urgentItemsCount > 0 && (
            <div className="text-xs text-red-600 font-semibold">
              {urgentItemsCount} urgent
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">
            {highPriorityQueues.filter(q => q.user_id === user?.id).length}
          </div>
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
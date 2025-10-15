// components/UrgentItemsBadge.tsx
import { BellDot } from 'lucide-react';

interface UrgentItemsBadgeProps {
  count: number;
  isUrgent: boolean;
}

export const UrgentItemsBadge: React.FC<UrgentItemsBadgeProps> = ({ 
  count, 
  isUrgent 
}) => {
  if (count === 0) return null;

  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all
      ${isUrgent 
        ? 'bg-green-500 text-white animate-pulse shadow-lg' 
        : 'bg-amber-500 text-white'
      }
    `}>
      {isUrgent && <BellDot className="w-3 h-3" />}
      {count}
     
    </span>
  );
};
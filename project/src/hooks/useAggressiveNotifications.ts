// hooks/useAggressiveNotifications.ts
import { useState, useEffect, useCallback, useRef } from 'react';

type NotificationPermission = 'default' | 'granted' | 'denied';

export type NotificationPreferences = {
  enabled: boolean;
  tiers: {
    visual: boolean;
    tab: boolean;
    push: boolean;
    sound: boolean;
  };
};

export type Queue = {
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
  deleted: boolean;
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

const convertCurrencySync = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  
  const FALLBACK_RATES = {
    USD: 1,
    KES: 150,
    SSP: 1000
  };
  
  const rates = FALLBACK_RATES;
  
  if (!rates[toCurrency as keyof typeof rates] || !rates[fromCurrency as keyof typeof rates]) {
    const amountInUSD = amount / FALLBACK_RATES[fromCurrency as keyof typeof FALLBACK_RATES];
    return amountInUSD * FALLBACK_RATES[toCurrency as keyof typeof FALLBACK_RATES];
  }
  
  const amountInUSD = amount / rates[fromCurrency as keyof typeof rates];
  return amountInUSD * rates[toCurrency as keyof typeof rates];
};

export const useAggressiveNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  const [acknowledgedItems, setAcknowledgedItems] = useState<Set<string>>(new Set());
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    tiers: {
      visual: true,
      tab: true,
      push: false,
      sound: false,
    },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tabAlertInterval = useRef<NodeJS.Timeout | null>(null);
  const originalTitle = useRef<string>('');

  // Initialize audio element and get original title
  useEffect(() => {
    originalTitle.current = document.title;
    
    // Create audio element for notification sounds
    audioRef.current = new Audio('/notification-alert.mp3');
    audioRef.current.volume = 0.7;
    
    // Check existing notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopTabAlert();
    };
  }, []);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        setPreferences(prev => ({
          ...prev,
          tiers: { ...prev.tiers, push: true }
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Enable audio notifications
  const enableAudioNotifications = useCallback(() => {
    setAudioPermission(true);
    setPreferences(prev => ({
      ...prev,
      tiers: { ...prev.tiers, sound: true }
    }));
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (audioRef.current && preferences.enabled && preferences.tiers.sound && audioPermission) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [preferences.enabled, preferences.tiers.sound, audioPermission]);

  // Browser tab alert (blinking title)
  const startTabAlert = useCallback((message: string) => {
    if (!preferences.enabled || !preferences.tiers.tab) return;
    
    stopTabAlert(); // Clear any existing alert
    
    let isOriginal = true;
    tabAlertInterval.current = setInterval(() => {
      document.title = isOriginal ? `🚨 ${message} 🚨` : originalTitle.current;
      isOriginal = !isOriginal;
    }, 1000);
  }, [preferences.enabled, preferences.tiers.tab]);

  const stopTabAlert = useCallback(() => {
    if (tabAlertInterval.current) {
      clearInterval(tabAlertInterval.current);
      tabAlertInterval.current = null;
      document.title = originalTitle.current;
    }
  }, []);

  // Send browser push notification
  const sendPushNotification = useCallback((title: string, options: NotificationOptions = {}) => {
    if (!preferences.enabled || !preferences.tiers.push || permission !== 'granted') {
      return null;
    }

    const notification = new Notification(title, {
      icon: '/TULI-TRAVEL-LOGO.png',
      badge: '/TULI-TRAVEL-LOGO.png',
      tag: 'urgent-queue-item',
      requireInteraction: true,
      silent: false,
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => {
      notification.close();
    }, 30000);

    return notification;
  }, [preferences.enabled, preferences.tiers.push, permission]);

  // Core function to check for urgent items
  const checkForUrgentItems = useCallback((queues: Queue[]): {
    urgentItems: Queue[];
    requiresAttention: boolean;
    highPriorityCount: number;
    largeAmountCount: number;
  } => {
    const urgentItems = queues.filter(queue => 
      queue.status === 'pending' && 
      !queue.deleted &&
      ((queue.amount && convertCurrencySync(queue.amount, queue.currency, 'USD') > 500) || 
       queue.priority === 'high') &&
      !acknowledgedItems.has(queue.id)
    );

    const highPriorityCount = urgentItems.filter(q => q.priority === 'high').length;
    const largeAmountCount = urgentItems.filter(q => 
      q.amount && convertCurrencySync(q.amount, q.currency, 'USD') > 500
    ).length;

    return {
      urgentItems,
      requiresAttention: urgentItems.length > 0,
      highPriorityCount,
      largeAmountCount,
    };
  }, [acknowledgedItems]);

  // Trigger all notification tiers for urgent items
  const triggerUrgentNotifications = useCallback((urgentItems: Queue[]) => {
    if (!preferences.enabled || urgentItems.length === 0) return;

    const message = `${urgentItems.length} urgent item${urgentItems.length !== 1 ? 's' : ''} require${urgentItems.length === 1 ? 's' : ''} attention`;

    // Tier 2: Browser Tab Alert
    startTabAlert(`${urgentItems.length} Urgent Items`);

    // Tier 3: Push Notification
    sendPushNotification('Tuli Travel - Attention Required', {
      body: message,
      actions: [
        { action: 'view', title: 'View Now' },
        { action: 'acknowledge', title: 'Acknowledge' }
      ]
    });

    // Tier 3: Sound Notification
    playNotificationSound();
  }, [preferences.enabled, startTabAlert, sendPushNotification, playNotificationSound]);

  // Acknowledge an item
  const acknowledgeItem = useCallback((itemId: string) => {
    setAcknowledgedItems(prev => new Set(prev).add(itemId));
  }, []);

  // Acknowledge all urgent items
  const acknowledgeAll = useCallback((urgentItems: Queue[]) => {
    setAcknowledgedItems(prev => {
      const newSet = new Set(prev);
      urgentItems.forEach(item => newSet.add(item.id));
      return newSet;
    });
    stopTabAlert();
  }, [stopTabAlert]);

  // Reset acknowledgments
  const resetAcknowledgedItems = useCallback(() => {
    setAcknowledgedItems(new Set());
  }, []);

  // Update preferences
  const updatePreferences = useCallback((newPreferences: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
    
    // Stop tab alerts if visual/tab notifications are disabled
    if (newPreferences.enabled === false || 
        (newPreferences.tiers && newPreferences.tiers.tab === false)) {
      stopTabAlert();
    }
  }, [stopTabAlert]);

  return {
    // State
    permission,
    audioPermission,
    acknowledgedItems,
    preferences,
    
    // Actions
    requestNotificationPermission,
    enableAudioNotifications,
    checkForUrgentItems,
    triggerUrgentNotifications,
    acknowledgeItem,
    acknowledgeAll,
    resetAcknowledgedItems,
    updatePreferences,
    playNotificationSound,
    startTabAlert,
    stopTabAlert,
    sendPushNotification,
  };
};
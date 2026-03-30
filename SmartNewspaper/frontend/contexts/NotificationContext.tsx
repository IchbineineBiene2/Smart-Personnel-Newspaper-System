import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationData } from '../components/NewsNotificationToast';

interface NotificationContextType {
  currentNotification: NotificationData | null;
  showNotification: (notification: Omit<NotificationData, 'id'>) => void;
  dismissNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);

  const showNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = `notification-${Date.now()}`;
    setCurrentNotification({
      ...notification,
      id,
      duration: notification.duration || 10000,
    });
  }, []);

  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        currentNotification,
        showNotification,
        dismissNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

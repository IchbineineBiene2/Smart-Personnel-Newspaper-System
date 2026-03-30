import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';

export interface NotificationData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  duration?: number; // milliseconds
  onPress?: () => void;
}

interface NewsNotificationToastProps {
  notification: NotificationData | null;
  onDismiss?: () => void;
}

const { width } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(width - 20, 380);

export const NewsNotificationToast: React.FC<NewsNotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-TOAST_WIDTH - 10)).current;

  useEffect(() => {
    if (notification) {
      // Animasyonu aç
      Animated.timing(slideAnim, {
        toValue: 10,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Süreyi ayarla (default 10 saniye)
      const duration = notification.duration || 10000;
      const timer = setTimeout(() => {
        dismissNotification();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismissNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -TOAST_WIDTH - 10,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss?.();
    });
  };

  const handlePress = () => {
    notification?.onPress?.();
    dismissNotification();
  };

  if (!notification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toast,
          {
            backgroundColor: colors.surfaceHigh,
            borderLeftColor: colors.accent,
            shadowColor: colors.black,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {notification.imageUrl && (
          <Image
            source={{ uri: notification.imageUrl }}
            style={styles.image}
          />
        )}

        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {notification.title}
          </Text>
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.description}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissNotification}
        >
          <Text style={[styles.closeText, { color: colors.textMuted }]}>
            ✕
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    zIndex: 1000,
    width: TOAST_WIDTH,
  },
  toast: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

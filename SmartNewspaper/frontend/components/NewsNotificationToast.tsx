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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface NotificationData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  duration?: number; // milliseconds
  onPress?: () => void;
  type?: 'market' | 'breaking' | 'default';
}

interface NewsNotificationToastProps {
  notification: NotificationData | null;
  onDismiss?: () => void;
}

const { width } = Dimensions.get('window');
const TOAST_WIDTH = Math.min(width - 24, 400);

export const NewsNotificationToast: React.FC<NewsNotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(-TOAST_WIDTH - 20)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (notification) {
      // Smooth slide and fade-in entrance
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 12,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss timer
      const duration = notification.duration || 10000;
      const timer = setTimeout(() => {
        dismissNotification();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -TOAST_WIDTH - 20,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
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

  const isMarket = notification.type === 'market' || notification.title.toLowerCase().includes('piyasa') || notification.title.toLowerCase().includes('döviz');
  const isBreaking = notification.type === 'breaking' || notification.title.toLowerCase().includes('flaş') || notification.title.toLowerCase().includes('son dakika');
  
  const accentColor = isMarket ? '#10b981' : isBreaking ? '#ef4444' : colors.accent;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toast,
          {
            backgroundColor: colors.surfaceHigh,
            borderLeftColor: accentColor,
            shadowColor: accentColor,
            borderColor: colors.borderSubtle,
            ...(Platform.OS === 'web' ? {
              boxShadow: `0 12px 32px ${accentColor}20`,
            } as any : {}),
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {notification.imageUrl ? (
          <Image
            source={{ uri: notification.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.iconPlaceholder, { backgroundColor: accentColor + '15' }]}>
            <Ionicons
              name={isMarket ? 'trending-up' : isBreaking ? 'flash' : 'notifications'}
              size={20}
              color={accentColor}
            />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            {isMarket && (
              <View style={[styles.alertBadge, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}>
                <Ionicons name="trending-up" size={10} color="#10b981" />
                <Text style={[styles.alertBadgeText, { color: '#10b981' }]}>PİYASA ALARMI</Text>
              </View>
            )}
            {isBreaking && (
              <View style={[styles.alertBadge, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}>
                <Ionicons name="flash" size={10} color="#ef4444" />
                <Text style={[styles.alertBadgeText, { color: '#ef4444' }]}>FLAŞ HABER</Text>
              </View>
            )}
            {!isMarket && !isBreaking && (
              <Text style={[styles.sourceText, { color: colors.textMuted }]}>
                {notification.title}
              </Text>
            )}
          </View>
          
          {isMarket || isBreaking ? (
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
          ) : null}

          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.description}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.surfaceInput }]}
          onPress={(e) => {
            e.stopPropagation();
            dismissNotification();
          }}
        >
          <Ionicons name="close" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    zIndex: 10000,
    width: TOAST_WIDTH,
  },
  toast: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    borderLeftWidth: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
    alignItems: 'center',
    gap: 12,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  alertBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 1,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

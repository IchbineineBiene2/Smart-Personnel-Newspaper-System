import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export type WidgetSize = 'sm' | 'md' | 'lg';

export interface WidgetConfig {
  id: string;
  type: 'news' | 'currency' | 'sports' | 'weather' | 'calendar' | 'stock';
  title: string;
  size: WidgetSize;
}

interface WidgetCardProps {
  config: WidgetConfig;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onResize: (id: string) => void;
  children: React.ReactNode;
}

const WIDGET_ICONS: Record<WidgetConfig['type'], string> = {
  news:     'newspaper-outline',
  currency: 'cash-outline',
  sports:   'trophy-outline',
  weather:  'partly-sunny-outline',
  calendar: 'calendar-outline',
  stock:    'trending-up-outline',
};

export function WidgetCard({ config, isEditing, onRemove, onResize, children }: WidgetCardProps) {
  const { colors } = useTheme();

  const mountAnim  = useRef(new Animated.Value(0)).current;
  const editPulseAnim = useRef(new Animated.Value(0)).current;
  const editAnim   = useRef(new Animated.Value(0)).current;
  const editPulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  // Edit mode indicator + action buttons
  useEffect(() => {
    if (isEditing) {
      Animated.timing(editAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      editPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(editPulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(editPulseAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
        ])
      );
      editPulseLoop.current.start();
    } else {
      editPulseLoop.current?.stop();
      editPulseAnim.setValue(0);
      Animated.timing(editAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
    }
  }, [isEditing]);

  const icon = WIDGET_ICONS[config.type] ?? 'apps-outline';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isEditing ? colors.accent + '60' : colors.borderSubtle,
          opacity: mountAnim,
          transform: [
            {
              translateY: mountAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
            {
              scale: editPulseAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.006],
              }),
            },
          ],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accent + '18' }]}>
            <Ionicons name={icon as any} size={18} color={colors.accent} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{config.title}</Text>
            {!isEditing && (
              <Text style={[styles.updateLabel, { color: colors.textMuted }]}>UPDATE: NOW</Text>
            )}
          </View>
        </View>

        {/* Edit actions */}
        <Animated.View
          style={[
            styles.headerActions,
            {
              opacity: editAnim,
              transform: [
                {
                  translateX: editAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={isEditing ? 'auto' : 'none'}
        >
          <Pressable
            onPress={() => onResize(config.id)}
            style={[styles.actionBtn, { backgroundColor: colors.accent + '20' }]}
          >
            <Ionicons name="resize-outline" size={13} color={colors.accent} />
          </Pressable>
          <Pressable
            onPress={() => onRemove(config.id)}
            style={[styles.actionBtn, { backgroundColor: '#ef444418' }]}
          >
            <Ionicons name="close" size={13} color="#ef4444" />
          </Pressable>
        </Animated.View>

        {/* Live dot (non-editing) */}
        {!isEditing && (
          <Animated.View
            style={[
              styles.liveIndicator,
              {
                opacity: editAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} />
          </Animated.View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  updateLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveIndicator: {
    paddingLeft: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
});

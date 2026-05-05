import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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

const WIDGET_ACCENT: Record<WidgetConfig['type'], string> = {
  news:     '#6254FF',
  currency: '#10b981',
  sports:   '#f59e0b',
  weather:  '#38bdf8',
  calendar: '#a855f7',
  stock:    '#22d3ee',
};

const SIZE_CFG = {
  sm: { padding: 16, titleSize: 13, subtitleSize: 9,  iconSize: 16, iconWrap: 34, stripeH: 2, headerMb: 14 },
  md: { padding: 20, titleSize: 15, subtitleSize: 9,  iconSize: 18, iconWrap: 40, stripeH: 3, headerMb: 16 },
  lg: { padding: 26, titleSize: 18, subtitleSize: 10, iconSize: 22, iconWrap: 48, stripeH: 4, headerMb: 20 },
};

export function WidgetCard({ config, isEditing, onRemove, onResize, children }: WidgetCardProps) {
  const { colors } = useTheme();
  const sz = SIZE_CFG[config.size] ?? SIZE_CFG.md;
  const accentColor = WIDGET_ACCENT[config.type] ?? colors.accent;

  const mountAnim      = useRef(new Animated.Value(0)).current;
  const editAnim       = useRef(new Animated.Value(0)).current;
  const editPulseAnim  = useRef(new Animated.Value(0)).current;
  const editPulseLoop  = useRef<Animated.CompositeAnimation | null>(null);
  const hoverAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (isEditing) {
      Animated.timing(editAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      editPulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(editPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(editPulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
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

  const sizeLabel = config.size === 'sm' ? 'Küçük' : config.size === 'md' ? 'Orta' : 'Büyük';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isEditing ? accentColor + '70' : colors.borderSubtle,
          padding: sz.padding,
          opacity: mountAnim,
          transform: [
            { translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: editPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.005] }) },
          ],
          ...(Platform.OS === 'web' ? {
            boxShadow: `0 2px 20px ${accentColor}0D, 0 1px 4px rgba(0,0,0,0.25)`,
          } as any : {
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
          }),
        },
      ]}
    >
      {/* Accent top stripe */}
      <View
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: sz.stripeH,
          backgroundColor: accentColor,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          opacity: isEditing ? 1 : 0.7,
        }}
      />

      {/* Header */}
      <View style={[styles.header, { marginBottom: sz.headerMb }]}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: accentColor + '1A',
                width: sz.iconWrap,
                height: sz.iconWrap,
                borderRadius: sz.iconWrap * 0.32,
              },
            ]}
          >
            <Ionicons name={icon as any} size={sz.iconSize} color={accentColor} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: sz.titleSize }]}>
              {config.title}
            </Text>
            {!isEditing ? (
              <View style={styles.liveRow}>
                <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.updateLabel, { color: colors.textMuted, fontSize: sz.subtitleSize }]}>
                  CANLI · ŞİMDİ
                </Text>
              </View>
            ) : (
              <Text style={[styles.updateLabel, { color: accentColor, fontSize: sz.subtitleSize }]}>
                {sizeLabel} boyut
              </Text>
            )}
          </View>
        </View>

        {/* Edit actions */}
        <Animated.View
          style={[
            styles.headerActions,
            {
              opacity: editAnim,
              transform: [{ translateX: editAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            },
          ]}
          pointerEvents={isEditing ? 'auto' : 'none'}
        >
          <Pressable
            onPress={() => onResize(config.id)}
            style={[styles.actionBtn, { backgroundColor: accentColor + '20' }]}
          >
            <Ionicons name="resize-outline" size={13} color={accentColor} />
          </Pressable>
          <Pressable
            onPress={() => onRemove(config.id)}
            style={[styles.actionBtn, { backgroundColor: '#ef444420' }]}
          >
            <Ionicons name="close" size={13} color="#ef4444" />
          </Pressable>
        </Animated.View>
      </View>

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* Bottom accent bar in lg mode */}
      {config.size === 'lg' && !isEditing && (
        <View
          style={{
            marginTop: 16,
            height: 1,
            backgroundColor: accentColor + '22',
            marginHorizontal: -sz.padding,
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    gap: 3,
  },
  title: {
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  updateLabel: {
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});

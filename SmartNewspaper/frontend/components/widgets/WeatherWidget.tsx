import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import type { WidgetSize } from './WidgetCard';

interface Props { size?: WidgetSize }

const FORECAST = [
  { day: 'Sal', icon: 'cloudy-outline', temp: '21°' },
  { day: 'Çar', icon: 'rainy-outline',  temp: '18°' },
  { day: 'Per', icon: 'sunny-outline',  temp: '26°' },
  { day: 'Cum', icon: 'sunny-outline',  temp: '28°' },
];

const HOURLY_FORECAST = [
  { hour: '09:00', icon: 'sunny-outline', temp: '21°', desc: 'Açık' },
  { hour: '12:00', icon: 'sunny', temp: '24°', desc: 'Güneşli' },
  { hour: '15:00', icon: 'sunny', temp: '25°', desc: 'Sıcak' },
  { hour: '18:00', icon: 'cloudy-outline', temp: '22°', desc: 'Bulutlu' },
  { hour: '21:00', icon: 'partly-sunny-outline', temp: '19°', desc: 'Serin' },
];

export function WeatherWidget({ size = 'sm' }: Props) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Animations
  const spinValue = useRef(new Animated.Value(0)).current;
  const drop1 = useRef(new Animated.Value(-10)).current;
  const drop2 = useRef(new Animated.Value(-10)).current;
  const drop3 = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (modalVisible) {
      // Infinite Spin for Sun
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        })
      ).start();

      // Falling raindrops loop
      const animateDrop = (anim: Animated.Value, delay: number) => {
        anim.setValue(-10);
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 50,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };
      animateDrop(drop1, 0);
      animateDrop(drop2, 350);
      animateDrop(drop3, 700);
    }
  }, [modalVisible]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isLarge = size === 'lg';
  const isMd = size === 'md';

  const iconSize = isLarge ? 58 : isMd ? 48 : 40;
  const tempSize = isLarge ? 44 : isMd ? 36 : 30;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.clickableContainer,
        pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }
      ]}
      onPress={() => setModalVisible(true)}
    >
      <View style={[styles.container, { gap: isLarge ? 18 : 14 }]}>
        <View style={styles.main}>
          <Ionicons name="sunny" size={iconSize} color="#fbbf24" />
          <View style={{ gap: 3 }}>
            <Text style={[styles.temp, { color: colors.textPrimary, fontSize: tempSize }]}>24°C</Text>
            <View style={styles.locRow}>
              <Ionicons name="location" size={12} color={colors.accent} />
              <Text style={[styles.loc, { color: colors.textMuted }]}>İSTANBUL, TR</Text>
            </View>
            {(isLarge || isMd) && (
              <Text style={[styles.desc, { color: colors.textSecondary }]}>Güneşli, Açık</Text>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.extras}>
          <View style={styles.extraItem}>
            <Ionicons name="water-outline" size={isLarge ? 16 : 14} color="#38bdf8" />
            <Text style={[styles.extraLabel, { color: colors.textMuted }]}>Nem</Text>
            <Text style={[styles.extraVal, { color: colors.textPrimary, fontSize: isLarge ? 15 : 13 }]}>62%</Text>
          </View>
          <View style={styles.extraItem}>
            <Ionicons name="thermometer-outline" size={isLarge ? 16 : 14} color="#f87171" />
            <Text style={[styles.extraLabel, { color: colors.textMuted }]}>Hissedilen</Text>
            <Text style={[styles.extraVal, { color: colors.textPrimary, fontSize: isLarge ? 15 : 13 }]}>22°C</Text>
          </View>
          {(isLarge || isMd) && (
            <View style={styles.extraItem}>
              <Ionicons name="speedometer-outline" size={isLarge ? 16 : 14} color="#a78bfa" />
              <Text style={[styles.extraLabel, { color: colors.textMuted }]}>Rüzgar</Text>
              <Text style={[styles.extraVal, { color: colors.textPrimary, fontSize: isLarge ? 15 : 13 }]}>12 km/s</Text>
            </View>
          )}
        </View>

        {isLarge && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.forecast}>
              {FORECAST.map((f) => (
                <View key={f.day} style={[styles.forecastItem, { backgroundColor: colors.surfaceInput, borderRadius: 12 }]}>
                  <Text style={[styles.forecastDay, { color: colors.textMuted }]}>{f.day}</Text>
                  <Ionicons name={f.icon as any} size={18} color="#fbbf24" />
                  <Text style={[styles.forecastTemp, { color: colors.textPrimary }]}>{f.temp}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* DETAILED GLASSMORPHIC WEATHER MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalCentering}>
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.surface + 'D0',
                  borderColor: colors.borderSubtle,
                  ...(Platform.OS === 'web' ? {
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                  } as any : {})
                }
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Floating Animated Sunny Core Background */}
              <View style={styles.animationLayer}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="sunny" size={240} color="#fbbf2415" />
                </Animated.View>
              </View>

              {/* Header */}
              <View style={styles.modalHeader}>
                <View>
                  <View style={styles.locRow}>
                    <Ionicons name="location" size={16} color={colors.accent} />
                    <Text style={[styles.modalLoc, { color: colors.textPrimary }]}>İstanbul, TR</Text>
                  </View>
                  <Text style={[styles.modalSub, { color: colors.textMuted }]}>CANLI HAVA DURUMU DETAYI</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.closeBtn,
                    { backgroundColor: colors.surfaceInput },
                    pressed && { opacity: 0.85 }
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              {/* Main Weather Metric Info */}
              <View style={styles.modalHero}>
                <View style={styles.heroLeft}>
                  <Text style={[styles.modalTemp, { color: colors.textPrimary }]}>24°C</Text>
                  <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Güneşli, Açık Hava</Text>
                </View>
                <Animated.View style={[styles.heroIconWrap, { transform: [{ rotate: spin }] }]}>
                  <Ionicons name="sunny" size={82} color="#fbbf24" style={styles.sunShadow} />
                </Animated.View>
              </View>

              {/* Divider */}
              <View style={[styles.modalDivider, { backgroundColor: colors.borderSubtle }]} />

              {/* Hourly Forecast */}
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SAATLİK TAHMİN</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyScroll}
              >
                {HOURLY_FORECAST.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.hourlyCard,
                      {
                        backgroundColor: colors.surfaceInput + '40',
                        borderColor: colors.borderSubtle
                      }
                    ]}
                  >
                    <Text style={[styles.hourlyTime, { color: colors.textMuted }]}>{item.hour}</Text>
                    <Ionicons name={item.icon as any} size={22} color="#fbbf24" />
                    <Text style={[styles.hourlyTemp, { color: colors.textPrimary }]}>{item.temp}</Text>
                    <Text style={[styles.hourlyDesc, { color: colors.textSecondary }]}>{item.desc}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Expanded Advanced Parameter Grid */}
              <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 16 }]}>DETAYLI GÖSTERGELER</Text>
              <View style={styles.grid}>
                <View style={[styles.gridItem, { backgroundColor: colors.surfaceInput + '40', borderColor: colors.borderSubtle }]}>
                  <View style={styles.gridItemHeader}>
                    <Ionicons name="water-outline" size={16} color="#38bdf8" />
                    <Text style={[styles.gridLabel, { color: colors.textMuted }]}>NEM ORANI</Text>
                  </View>
                  <Text style={[styles.gridValue, { color: colors.textPrimary }]}>62%</Text>
                  <Text style={[styles.gridHint, { color: colors.textMuted }]}>Nem dengesi optimal düzeyde.</Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.surfaceInput + '40', borderColor: colors.borderSubtle }]}>
                  <View style={styles.gridItemHeader}>
                    <Ionicons name="speedometer-outline" size={16} color="#a78bfa" />
                    <Text style={[styles.gridLabel, { color: colors.textMuted }]}>RÜZGAR</Text>
                  </View>
                  <Text style={[styles.gridValue, { color: colors.textPrimary }]}>12 km/s</Text>
                  <Text style={[styles.gridHint, { color: colors.textMuted }]}>Kuzeydoğudan hafif meltem.</Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.surfaceInput + '40', borderColor: colors.borderSubtle }]}>
                  <View style={styles.gridItemHeader}>
                    <Ionicons name="sunny-outline" size={16} color="#f59e0b" />
                    <Text style={[styles.gridLabel, { color: colors.textMuted }]}>UV İNDEKSİ</Text>
                  </View>
                  <Text style={[styles.gridValue, { color: colors.textPrimary }]}>4 (Orta)</Text>
                  <Text style={[styles.gridHint, { color: colors.textMuted }]}>Güneş kremi önerilir.</Text>
                </View>

                <View style={[styles.gridItem, { backgroundColor: colors.surfaceInput + '40', borderColor: colors.borderSubtle }]}>
                  <View style={styles.gridItemHeader}>
                    <Ionicons name="pulse-outline" size={16} color="#f87171" />
                    <Text style={[styles.gridLabel, { color: colors.textMuted }]}>BASINÇ</Text>
                  </View>
                  <Text style={[styles.gridValue, { color: colors.textPrimary }]}>1013 hPa</Text>
                  <Text style={[styles.gridHint, { color: colors.textMuted }]}>Kararlı yüksek basınç alanı.</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clickableContainer: {
    width: '100%',
  },
  container: {},
  main: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  temp: { fontWeight: '900', letterSpacing: -1 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  loc: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  desc: { fontSize: 12, fontWeight: '500' },
  divider: { height: 1 },
  extras: { flexDirection: 'row', justifyContent: 'space-around' },
  extraItem: { alignItems: 'center', gap: 4 },
  extraLabel: { fontSize: 10, fontWeight: '500' },
  extraVal: { fontWeight: '700' },
  forecast: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  forecastItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 6 },
  forecastDay: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  forecastTemp: { fontSize: 13, fontWeight: '800' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCentering: {
    width: '100%',
    maxWidth: 500,
    padding: 16,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  animationLayer: {
    position: 'absolute',
    right: -40,
    top: -40,
    zIndex: 0,
    opacity: 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  modalLoc: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 24,
    zIndex: 1,
  },
  heroLeft: {
    gap: 4,
  },
  modalTemp: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -2,
  },
  modalDesc: {
    fontSize: 16,
    fontWeight: '600',
  },
  heroIconWrap: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunShadow: {
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0 0 16px rgba(251, 191, 36, 0.45))',
      } as any,
    }),
  },
  modalDivider: {
    height: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    zIndex: 1,
  },
  hourlyScroll: {
    gap: 8,
    zIndex: 1,
  },
  hourlyCard: {
    width: 80,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  hourlyTime: {
    fontSize: 10,
    fontWeight: '700',
  },
  hourlyTemp: {
    fontSize: 15,
    fontWeight: '800',
  },
  hourlyDesc: {
    fontSize: 10,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 1,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%' as any,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  gridItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  gridHint: {
    fontSize: 9,
    fontWeight: '500',
  },
});

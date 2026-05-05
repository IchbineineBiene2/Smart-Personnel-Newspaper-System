import { StyleSheet, Text, View } from 'react-native';
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

export function WeatherWidget({ size = 'sm' }: Props) {
  const { colors } = useTheme();
  const isLarge = size === 'lg';
  const isMd = size === 'md';

  const iconSize = isLarge ? 58 : isMd ? 48 : 40;
  const tempSize = isLarge ? 44 : isMd ? 36 : 30;

  return (
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
  );
}

const styles = StyleSheet.create({
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
});

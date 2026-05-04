import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

export function WeatherWidget() {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <Ionicons name="sunny" size={42} color="#fbbf24" />
        <View>
          <Text style={[styles.temp, { color: colors.textPrimary }]}>24°C</Text>
          <View style={styles.locRow}>
            <Ionicons name="location" size={12} color={colors.accent} />
            <Text style={[styles.loc, { color: colors.textMuted }]}>İSTANBUL, TR</Text>
          </View>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
      <View style={styles.extras}>
        <View style={styles.extraItem}>
          <Ionicons name="water-outline" size={14} color={colors.accent} />
          <Text style={[styles.extraLabel, { color: colors.textMuted }]}>Nem</Text>
          <Text style={[styles.extraVal, { color: colors.textPrimary }]}>62%</Text>
        </View>
        <View style={styles.extraItem}>
          <Ionicons name="partly-sunny-outline" size={14} color={colors.accent} />
          <Text style={[styles.extraLabel, { color: colors.textMuted }]}>Hissedilen</Text>
          <Text style={[styles.extraVal, { color: colors.textPrimary }]}>22°C</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  temp: { fontSize: 32, fontWeight: '800' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  loc: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  divider: { height: 1 },
  extras: { flexDirection: 'row', justifyContent: 'space-around' },
  extraItem: { alignItems: 'center', gap: 4 },
  extraLabel: { fontSize: 10, fontWeight: '500' },
  extraVal: { fontSize: 13, fontWeight: '700' },
});

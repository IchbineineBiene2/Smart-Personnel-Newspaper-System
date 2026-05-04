import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

const RATES = [
  { name: 'Gram Altın', value: '3.472 ₺', change: '+0.91%', up: true },
  { name: 'USD/TRY',    value: '38,45',    change: '+0.12%', up: true },
  { name: 'EUR/TRY',    value: '42,10',    change: '-0.28%', up: false },
  { name: 'BIST 100',   value: '10.412',   change: '+1.42%', up: true },
];

export function CurrencyWidget() {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {RATES.map((r) => (
        <View key={r.name} style={[styles.row, { borderColor: colors.borderSubtle }]}>
          <Text style={[styles.name, { color: colors.textSecondary }]}>{r.name}</Text>
          <View style={styles.right}>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{r.value}</Text>
            <View style={[styles.badge, { backgroundColor: r.up ? '#10b98120' : '#ef444420' }]}>
              <Ionicons name={r.up ? 'arrow-up' : 'arrow-down'} size={9} color={r.up ? '#10b981' : '#ef4444'} />
              <Text style={[styles.change, { color: r.up ? '#10b981' : '#ef4444' }]}>{r.change}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  name: { fontSize: 12, fontWeight: '500' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontSize: 14, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  change: { fontSize: 10, fontWeight: '700' },
});

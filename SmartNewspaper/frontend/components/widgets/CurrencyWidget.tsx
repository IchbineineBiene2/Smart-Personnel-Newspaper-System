import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';
import type { WidgetSize } from './WidgetCard';

interface Rate {
  name: string;
  value: string;
  change: string;
  up: boolean;
  icon: string;
}

const DEFAULT_RATES: Rate[] = [
  { name: 'Gram Altın', value: '3.472 ₺', change: '+0.91%', up: true,  icon: 'bar-chart-outline' },
  { name: 'USD/TRY',    value: '38,45',    change: '+0.12%', up: true,  icon: 'logo-usd' },
  { name: 'EUR/TRY',    value: '42,10',    change: '-0.28%', up: false, icon: 'cash-outline' },
  { name: 'BIST 100',   value: '10.412',   change: '+1.42%', up: true,  icon: 'trending-up-outline' },
];

interface Props { size?: WidgetSize }

export function CurrencyWidget({ size = 'sm' }: Props) {
  const { colors } = useTheme();
  const [rates, setRates] = useState<Rate[]>(DEFAULT_RATES);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('http://localhost:3000/api/rates', {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        
        if (response.ok) {
          const data = await response.json();
          setRates(data);
        }
      } catch (error) {
        console.warn('Could not fetch rates, using default values');
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30000);

    return () => clearInterval(interval);
  }, []);

  const isLarge = size === 'lg';
  const isMd    = size === 'md';

  const nameSize   = isLarge ? 13 : 12;
  const valueSize  = isLarge ? 18 : isMd ? 16 : 14;
  const changeSize = isLarge ? 11 : 10;
  const rowPadding = isLarge ? 14 : isMd ? 12 : 10;

  return (
    <View style={[styles.list, { gap: isLarge ? 2 : 0 }]}>
      {rates.map((r) => (
        <View
          key={r.name}
          style={[
            styles.row,
            {
              borderColor: colors.borderSubtle,
              paddingVertical: rowPadding,
              backgroundColor: isLarge ? colors.surfaceInput + '60' : 'transparent',
              borderRadius: isLarge ? 12 : 0,
              paddingHorizontal: isLarge ? 12 : 0,
              borderBottomWidth: isLarge ? 0 : 1,
            },
          ]}
        >
          {isLarge && (
            <View style={[styles.iconWrap, { backgroundColor: r.up ? '#10b98118' : '#ef444418' }]}>
              <Ionicons name={r.icon as any} size={14} color={r.up ? '#10b981' : '#ef4444'} />
            </View>
          )}
          <Text style={[styles.name, { color: colors.textSecondary, fontSize: nameSize }]}>{r.name}</Text>
          <View style={styles.right}>
            <Text style={[styles.value, { color: colors.textPrimary, fontSize: valueSize }]}>{r.value}</Text>
            <View style={[styles.badge, { backgroundColor: r.up ? '#10b98120' : '#ef444420' }]}>
              <Ionicons name={r.up ? 'arrow-up' : 'arrow-down'} size={9} color={r.up ? '#10b981' : '#ef4444'} />
              <Text style={[styles.change, { color: r.up ? '#10b981' : '#ef4444', fontSize: changeSize }]}>{r.change}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  name: { fontSize: 12, fontWeight: '600', flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { fontWeight: '800' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  change: { fontWeight: '800' },
});

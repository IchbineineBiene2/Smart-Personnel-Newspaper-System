import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ColorSelectorProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  swatches?: string[];
}

const DEFAULT_SWATCHES = [
  '#fffdf8', // Klasik BG
  '#111111', // Klasik Title
  '#8a1f11', // Klasik Accent
  '#fcd0b4', // FT BG
  '#0f5499', // FT Accent
  '#1a1a1a', // Dark BG
  '#e5e5e5', // Dark Text
  '#06b6d4', // Dark Accent
  '#ffffff', // Modern BG
  '#1e293b', // Modern Title
  '#4f46e5', // Modern Accent
  '#71717a', // Minimal Accent
];

export function ColorSelector({
  label,
  value,
  onChange,
  swatches = DEFAULT_SWATCHES,
}: ColorSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}

      <View style={styles.swatchGrid}>
        {swatches.map((swatch) => (
          <Pressable
            key={swatch}
            accessibilityRole="button"
            accessibilityLabel={`${label ?? 'Renk'} secenegi`}
            onPress={() => onChange(swatch)}
            style={({ pressed }) => [
              styles.swatch,
              {
                backgroundColor: swatch,
                borderColor: value.toLowerCase() === swatch.toLowerCase() ? colors.textPrimary : colors.borderSubtle,
                opacity: pressed ? 0.78 : 1,
              },
              value.toLowerCase() === swatch.toLowerCase() && styles.swatchSelected,
            ]}
          >
            {value.toLowerCase() === swatch.toLowerCase() && (
              <Ionicons 
                name="checkmark" 
                size={14} 
                color={parseInt(swatch.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff'} 
              />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.08 }],
  },
});

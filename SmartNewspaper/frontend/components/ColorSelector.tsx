import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
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
  const [inputValue, setInputValue] = useState(value);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
      onChange(text);
    }
  };

  const handleSwatchClick = (swatch: string) => {
    setInputValue(swatch);
    onChange(swatch);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      
      <View style={[styles.inputRow, { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceInput }]}>
        <View style={[styles.previewColor, { backgroundColor: value }]} />
        <TextInput
          value={inputValue}
          onChangeText={handleInputChange}
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="#000000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
        />
      </View>

      <View style={styles.swatchGrid}>
        {swatches.map((swatch) => (
          <Pressable
            key={swatch}
            onPress={() => handleSwatchClick(swatch)}
            style={[
              styles.swatch,
              { backgroundColor: swatch, borderColor: colors.borderSubtle },
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
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  previewColor: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  passwordToggle?: boolean;
  hint?: string;
  valid?: boolean | null; // true=✓ green, false=✗ red, null=neutral
}

export function AuthInput({ label, icon, passwordToggle, hint, valid, secureTextEntry, ...rest }: Props) {
  const { colors, themeName } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const surface = themeName === 'vincent' ? colors.background : colors.surfaceInput;
  const borderColor = focused ? colors.accent : valid === false ? colors.error : colors.border;

  const useReveal = !!passwordToggle && !!secureTextEntry;
  const effectiveSecure = useReveal ? !revealed : secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          {
            backgroundColor: surface,
            borderColor,
            borderWidth: focused ? 2 : 1,
            paddingHorizontal: focused ? Spacing.md - 1 : Spacing.md,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={focused ? colors.accent : colors.textMuted} style={{ marginRight: Spacing.sm }} />
        <TextInput
          {...rest}
          secureTextEntry={effectiveSecure}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: colors.textPrimary }]}
        />
        {useReveal && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={6}
            style={{ paddingHorizontal: 4 }}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </Pressable>
        )}
        {valid === true && !useReveal && (
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        )}
        {valid === false && !useReveal && (
          <Ionicons name="alert-circle" size={18} color={colors.error} />
        )}
      </View>
      {hint ? <Text style={[styles.hint, { color: valid === false ? colors.error : colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingVertical: 0,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    paddingVertical: Spacing.sm,
    outlineWidth: 0 as any,
    borderWidth: 0,
  },
  hint: {
    fontSize: Typography.fontSize.xs,
    marginLeft: 2,
  },
});

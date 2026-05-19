import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
}

export function AuthButton({ label, loadingLabel, loading, disabled, onPress, trailingIcon = 'arrow-forward' }: Props) {
  const { colors } = useTheme();
  const isDisabled = !!disabled || !!loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: colors.accent,
          opacity: isDisabled ? 0.65 : pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={[styles.text, { color: colors.white }]}>{label}</Text>
        )}
        {loading && loadingLabel && <Text style={[styles.text, { color: colors.white }]}>{loadingLabel}</Text>}
        {!loading && trailingIcon && <Ionicons name={trailingIcon} size={18} color={colors.white} />}
      </View>
    </Pressable>
  );
}

interface InlineErrorProps {
  message: string | null;
}
export function AuthError({ message }: InlineErrorProps) {
  const { colors } = useTheme();
  if (!message) return null;
  return (
    <View
      style={[
        errStyles.box,
        {
          backgroundColor: `${colors.error}1A`,
          borderColor: `${colors.error}55`,
        },
      ]}
    >
      <Ionicons name="alert-circle" size={16} color={colors.error} />
      <Text style={[errStyles.text, { color: colors.error }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.2,
  },
});

const errStyles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
});

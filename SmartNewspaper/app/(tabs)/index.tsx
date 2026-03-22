import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/theme';

export default function TabOneScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles(colors).container]}>
      <Text style={styles(colors).title}>Ana Sayfa</Text>
      <View style={[styles(colors).separator]} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  separator: {
    marginVertical: Spacing.lg,
    height: 1,
    width: '80%',
    backgroundColor: colors.border,
  },
});

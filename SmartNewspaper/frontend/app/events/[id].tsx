import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { EVENTS } from '@/services/content';
import { Radius, Spacing, Typography } from '@/constants/theme';

export default function EventDetailPage() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = EVENTS.find((item) => item.id === id);

  if (!event) {
    return (
      <View style={[styles(colors).notFoundContainer]}>
        <Text style={styles(colors).notFoundTitle}>Etkinlik bulunamadi</Text>
        <Text style={styles(colors).notFoundBody}>Lutfen etkinlik listesinden tekrar deneyin.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles(colors).container]} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).title}>{event.title}</Text>
      <View style={styles(colors).metaCard}>
        <Text style={styles(colors).metaText}>Tarih: {event.date}</Text>
        <Text style={styles(colors).metaText}>Konum: {event.location}</Text>
        <Text style={styles(colors).metaText}>Kategori: {event.category}</Text>
      </View>
      <View style={styles(colors).descriptionCard}>
        <Text style={styles(colors).sectionTitle}>Etkinlik Detayi</Text>
        <Text style={styles(colors).description}>{event.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  metaCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  notFoundTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  notFoundBody: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
  },
});

import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useBookmarks } from '@/hooks/useBookmarks';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import {
  ANNOUNCEMENTS,
  EVENTS,
  NEWS,
} from '@/services/content';
import { Radius, Spacing, Typography } from '@/constants/theme';

export default function Discover() {
  const router = useRouter();
  const { colors } = useTheme();
  const { savedIds, toggleSaved } = useBookmarks();
  const { preferredCategories } = usePreferences();

  const filteredNews = useMemo(() => {
    if (!preferredCategories.length) {
      return NEWS;
    }

    return NEWS.filter((item) => preferredCategories.includes(item.category));
  }, [preferredCategories]);

  return (
    <ScrollView style={[styles(colors).container]} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).pageTitle}>Etkinlikler ve Duyurular</Text>

      <Text style={styles(colors).sectionTitle}>Yaklasan Etkinlikler</Text>
      {EVENTS.map((event) => (
        <Pressable
          key={event.id}
          style={styles(colors).card}
          onPress={() =>
            router.push({
              pathname: '/events/[id]',
              params: { id: event.id },
            })
          }
        >
          <Text style={styles(colors).cardTitle}>{event.title}</Text>
          <Text style={styles(colors).cardMeta}>{event.date}</Text>
          <Text style={styles(colors).cardMeta}>{event.location}</Text>
          <Text style={styles(colors).cardBody}>{event.summary}</Text>
        </Pressable>
      ))}

      <Text style={styles(colors).sectionTitle}>Duyurular</Text>
      {ANNOUNCEMENTS.map((announcement) => (
        <View key={announcement.id} style={styles(colors).card}>
          <Text style={styles(colors).cardTitle}>{announcement.title}</Text>
          <Text style={styles(colors).cardMeta}>{announcement.publishedAt}</Text>
          <Text style={styles(colors).cardBody}>{announcement.content}</Text>
        </View>
      ))}

      <Text style={styles(colors).sectionTitle}>Haberler</Text>
      {filteredNews.map((news) => {
        const isSaved = savedIds.includes(news.id);

        return (
          <View key={news.id} style={styles(colors).card}>
            <Text style={styles(colors).cardTitle}>{news.title}</Text>
            <Text style={styles(colors).cardMeta}>{news.category}</Text>
            <Text style={styles(colors).cardBody}>{news.excerpt}</Text>
            <Pressable
              style={[styles(colors).actionButton, isSaved ? styles(colors).actionButtonActive : null]}
              onPress={() => toggleSaved(news.id)}
            >
              <Text style={styles(colors).actionButtonText}>
                {isSaved ? 'Kaydedildi' : 'Kaydet'}
              </Text>
            </Pressable>
          </View>
        );
      })}
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
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  pageTitle: {
    fontSize: Typography.fontSize.xl,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionTitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.lg,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
  },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  actionButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionButtonText: {
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
});
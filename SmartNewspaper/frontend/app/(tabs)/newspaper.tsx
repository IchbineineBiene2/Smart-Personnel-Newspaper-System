import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBookmarks } from '@/hooks/useBookmarks';
import { NEWS } from '@/services/content';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export default function Newspaper() {
  const { loading, savedIds, toggleSaved } = useBookmarks();
  const savedNews = NEWS.filter((item) => savedIds.includes(item.id));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Kaydedilen Haberler</Text>

      {loading ? <Text style={styles.info}>Yukleniyor...</Text> : null}

      {!loading && !savedNews.length ? (
        <Text style={styles.info}>Henuz kaydedilmis haber bulunmuyor.</Text>
      ) : null}

      {savedNews.map((news) => (
        <View key={news.id} style={styles.card}>
          <Text style={styles.cardTitle}>{news.title}</Text>
          <Text style={styles.cardMeta}>{news.category}</Text>
          <Text style={styles.cardBody}>{news.excerpt}</Text>
          <Pressable style={styles.removeButton} onPress={() => toggleSaved(news.id)}>
            <Text style={styles.removeButtonText}>Kayitlardan Cikar</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  pageTitle: {
    fontSize: Typography.fontSize.xl,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  info: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  cardMeta: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.sm,
  },
  cardBody: {
    color: Colors.textSecondary,
    lineHeight: 20,
    fontSize: Typography.fontSize.base,
  },
  removeButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceHigh,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  removeButtonText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
});
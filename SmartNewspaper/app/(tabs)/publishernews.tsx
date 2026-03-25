import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { ReactionKind, useHiddenPublisherState } from '@/hooks/useHiddenPublisherState';
import { useTheme } from '@/hooks/useTheme';
import { PUBLISHERS, PUBLISHER_ARTICLES } from '@/services/publisherData';

const REACTIONS: Array<{ key: ReactionKind; label: string }> = [
  { key: 'like', label: 'Like' },
  { key: 'insightful', label: 'Insightful' },
  { key: 'important', label: 'Important' },
];

export default function PublisherNewsPage() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const { reactions, setReaction } = useHiddenPublisherState();

  const selectedId = id ?? 'global-dispatch';
  const publisher = PUBLISHERS.find((item) => item.id === selectedId);
  const articles = PUBLISHER_ARTICLES.filter((item) => item.publisherId === selectedId);

  if (!publisher) {
    return (
      <View style={styles(colors).emptyWrap}>
        <Text style={styles(colors).emptyTitle}>Publisher not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).title}>{publisher.name}</Text>
      <Text style={styles(colors).subtitle}>Publisher news feed with article-level reactions.</Text>

      {articles.map((article) => {
        const selected = reactions[article.id];

        return (
          <View key={article.id} style={styles(colors).card}>
            <Text style={styles(colors).tag}>{article.tag.toUpperCase()}</Text>
            <Text style={styles(colors).articleTitle}>{article.title}</Text>
            <Text style={styles(colors).articleSummary}>{article.summary}</Text>

            <View style={styles(colors).metaRow}>
              <Text style={styles(colors).metaText}>{article.likes} likes</Text>
              <Text style={styles(colors).metaText}>{article.comments} comments</Text>
              <Text style={styles(colors).metaText}>{article.publishedAt}</Text>
            </View>

            <View style={styles(colors).reactionsRow}>
              {REACTIONS.map((reaction) => {
                const active = selected === reaction.key;
                return (
                  <Pressable
                    key={reaction.key}
                    onPress={() => setReaction(article.id, reaction.key)}
                    style={[styles(colors).reactionButton, active ? styles(colors).reactionButtonActive : null]}
                  >
                    <Text style={[styles(colors).reactionText, active ? styles(colors).reactionTextActive : null]}>
                      {reaction.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.md,
    },
    title: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: 40,
      lineHeight: 44,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 22,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    tag: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      letterSpacing: 1,
      fontWeight: Typography.fontWeight.bold,
    },
    articleTitle: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: Typography.fontSize.xl,
      lineHeight: 30,
    },
    articleSummary: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 22,
    },
    metaRow: {
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: Spacing.sm,
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    reactionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    reactionButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
    },
    reactionButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    reactionText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    reactionTextActive: {
      color: colors.white,
    },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
  });

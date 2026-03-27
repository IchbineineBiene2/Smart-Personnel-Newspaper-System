import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useHiddenPublisherState } from '@/hooks/useHiddenPublisherState';
import { useTheme } from '@/hooks/useTheme';
import { PUBLISHERS, PUBLISHER_ARTICLES } from '@/services/publisherData';

export default function PublisherProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const { followedIds, toggleFollow } = useHiddenPublisherState();

  const selectedId = id ?? 'global-dispatch';
  const publisher = PUBLISHERS.find((item) => item.id === selectedId);
  const latest = PUBLISHER_ARTICLES.filter((item) => item.publisherId === selectedId).slice(0, 4);

  if (!publisher) {
    return (
      <View style={styles(colors).emptyWrap}>
        <Text style={styles(colors).emptyTitle}>Publisher not found</Text>
      </View>
    );
  }

  const followed = followedIds.includes(publisher.id);

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <View style={styles(colors).headerCard}>
        <View style={styles(colors).logoBox}>
          <Text style={styles(colors).logoText}>{publisher.logoText}</Text>
        </View>

        <Text style={styles(colors).title}>{publisher.name}</Text>
        {publisher.verified ? <Text style={styles(colors).badge}>VERIFIED SOURCE</Text> : null}

        <View style={styles(colors).statsRow}>
          <View style={styles(colors).statItem}>
            <Text style={styles(colors).statValue}>{publisher.followers}</Text>
            <Text style={styles(colors).statLabel}>Followers</Text>
          </View>
          <View style={styles(colors).statItem}>
            <Text style={styles(colors).statValue}>{publisher.articlesCount}</Text>
            <Text style={styles(colors).statLabel}>Articles</Text>
          </View>
          <View style={styles(colors).statItem}>
            <Text style={styles(colors).statValue}>{publisher.reporters}</Text>
            <Text style={styles(colors).statLabel}>Reporters</Text>
          </View>
        </View>

        <Text style={styles(colors).description}>{publisher.description}</Text>

        <View style={styles(colors).actionsRow}>
          <Pressable
            style={[styles(colors).primaryButton, followed ? styles(colors).primaryButtonActive : null]}
            onPress={() => toggleFollow(publisher.id)}
          >
            <Text style={styles(colors).primaryButtonText}>{followed ? 'Following' : 'Follow Publisher'}</Text>
          </Pressable>
          <Pressable
            style={styles(colors).secondaryButton}
            onPress={() => router.push(`/publishernews?id=${publisher.id}` as any)}
          >
            <Text style={styles(colors).secondaryButtonText}>Open News Feed</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles(colors).sectionTitle}>Latest Dispatches</Text>
      {latest.map((article) => (
        <Pressable
          key={article.id}
          style={styles(colors).articleCard}
          onPress={() => router.push(`/publishernews?id=${publisher.id}` as any)}
        >
          <Text style={styles(colors).articleTag}>{article.tag.toUpperCase()}</Text>
          <Text style={styles(colors).articleTitle}>{article.title}</Text>
          <Text style={styles(colors).articleSummary}>{article.summary}</Text>
          <View style={styles(colors).metaRow}>
            <Text style={styles(colors).metaText}>{article.likes} likes</Text>
            <Text style={styles(colors).metaText}>{article.comments} comments</Text>
          </View>
        </Pressable>
      ))}
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
      gap: Spacing.md,
      paddingBottom: Spacing.xxl,
    },
    headerCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    logoBox: {
      width: 72,
      height: 72,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
      fontSize: Typography.fontSize.base,
    },
    title: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: 44,
      lineHeight: 48,
    },
    badge: {
      alignSelf: 'flex-start',
      color: colors.accent,
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.sm,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      letterSpacing: 1,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    statItem: {
      flex: 1,
    },
    statValue: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    description: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 24,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
    },
    primaryButtonActive: {
      backgroundColor: colors.surfaceHigh,
      borderColor: colors.border,
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: Typography.fontWeight.bold,
      fontSize: Typography.fontSize.sm,
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
      fontSize: Typography.fontSize.sm,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: 34,
      lineHeight: 38,
    },
    articleCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    articleTag: {
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
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metaText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
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

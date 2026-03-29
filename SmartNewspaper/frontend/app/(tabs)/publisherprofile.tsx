// @ts-nocheck
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import NewsQuickPreviewModal from '@/components/NewsQuickPreviewModal';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useHiddenPublisherState } from '@/hooks/useHiddenPublisherState';
import { useApiNews } from '@/hooks/useNews';
import { useTheme } from '@/hooks/useTheme';
import { buildPublisherDataset, getPublisherIdFromSourceName } from '@/services/publisherProfiles';

const BASE_TOPICS = ['Siyaset', 'Spor', 'Ekonomi', 'Teknoloji', 'Saglik', 'Kultur'];
const POLITICS_KEYWORDS = [
  'siyaset',
  'politika',
  'meclis',
  'secim',
  'hukumet',
  'cumhurbaskani',
  'bakan',
  'parlamento',
  'parti',
  'milletvekili',
  'diplomasi',
  'government',
  'election',
  'parliament',
  'minister',
  'president',
  'politics',
];

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function PublisherProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const { followedIds, toggleFollow } = useHiddenPublisherState();
  const { articles: apiArticles, loading } = useApiNews();
  const { publishers, articles } = useMemo(() => buildPublisherDataset(apiArticles), [apiArticles]);

  const selectedId = id ?? 'global-dispatch';
  const publisher = publishers.find((item) => item.id === selectedId);
  const channelArticles = useMemo(
    () => articles.filter((item) => item.publisherId === selectedId),
    [articles, selectedId]
  );
  const topicFilters = useMemo(
    () => {
      const dynamicTopics = Array.from(new Set(channelArticles.map((item) => item.tag)));
      const merged = Array.from(new Set([...BASE_TOPICS, ...dynamicTopics]));
      return ['Tum Konular', ...merged];
    },
    [channelArticles]
  );

  const [activeTopic, setActiveTopic] = useState('Tum Konular');
  const [visibleCount, setVisibleCount] = useState(10);
  const [previewItem, setPreviewItem] = useState<{
    title: string;
    summary: string;
    sourceName: string;
    sourceLogoUrl?: string;
    imageUrl?: string;
    publishedAt?: string;
    url?: string;
  } | null>(null);

  const filteredArticles = useMemo(() => {
    if (activeTopic === 'Tum Konular') return channelArticles;

    if (activeTopic === 'Siyaset') {
      return channelArticles.filter((item) => {
        if (normalizeText(item.tag) === 'siyaset') return true;
        const blob = normalizeText(`${item.title} ${item.summary}`);
        return POLITICS_KEYWORDS.some((keyword) => blob.includes(keyword));
      });
    }

    return channelArticles.filter((item) => item.tag === activeTopic);
  }, [activeTopic, channelArticles]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  useEffect(() => {
    setVisibleCount(10);
    setActiveTopic('Tum Konular');
  }, [selectedId]);

  useEffect(() => {
    setVisibleCount(10);
  }, [activeTopic]);

  const otherPublishers = publishers.filter((item) => item.id !== selectedId).slice(0, 8);

  if (loading) {
    return (
      <View style={styles(colors).emptyWrap}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles(colors).emptyText}>Yayinci verileri yukleniyor...</Text>
      </View>
    );
  }

  if (!publisher) {
    return (
      <View style={styles(colors).emptyWrap}>
        <Text style={styles(colors).emptyTitle}>Publisher not found</Text>
      </View>
    );
  }

  const followed = followedIds.includes(publisher.id);

  const openArticlePreview = (article: (typeof visibleArticles)[number]) => {
    setPreviewItem({
      title: article.title,
      summary: article.summary,
      sourceName: publisher.name,
      sourceLogoUrl: publisher.logoUrl,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      url: article.originalUrl,
    });
  };

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <View style={styles(colors).headerCard}>
        <View style={styles(colors).logoBox}>
          {publisher.logoUrl ? (
            <Image source={{ uri: publisher.logoUrl }} style={styles(colors).logoImage} resizeMode="cover" />
          ) : (
            <Text style={styles(colors).logoText}>{publisher.logoText}</Text>
          )}
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
            style={[styles(colors).primaryButtonFull, followed ? styles(colors).primaryButtonActive : null]}
            onPress={() => toggleFollow(publisher.id)}
          >
            <Text style={styles(colors).primaryButtonText}>{followed ? 'Following' : 'Follow Publisher'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles(colors).directoryWrap}>
        <Text style={styles(colors).directoryTitle}>Tum Kanallar</Text>
        <Text style={styles(colors).directorySub}>Sistemdeki diger haber kaynaklarini kesfet.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).directoryRow}>
          {otherPublishers.map((item) => (
            <Pressable
              key={item.id}
              style={styles(colors).directoryCard}
              onPress={() => router.push(`/publisherprofile?id=${item.id}` as any)}
            >
              <View style={styles(colors).directoryLogoBox}>
                {item.logoUrl ? (
                  <Image source={{ uri: item.logoUrl }} style={styles(colors).directoryLogoImage} resizeMode="cover" />
                ) : (
                  <Text style={styles(colors).directoryLogoText}>{item.logoText}</Text>
                )}
              </View>
              <View style={styles(colors).directoryBody}>
                <Text style={styles(colors).directoryName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles(colors).directoryMeta}>{item.category}</Text>
                <Text style={styles(colors).directoryFollow}>{item.followers} takipci</Text>
              </View>
              <View style={styles(colors).directoryActionPill}>
                <Text style={styles(colors).directoryActionText}>Profili Gor</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles(colors).sectionHeadRow}>
        <Text style={styles(colors).sectionTitle}>Kanal Haberleri</Text>
        <Text style={styles(colors).sectionCount}>{filteredArticles.length} haber</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).topicRow}>
        {topicFilters.map((topic) => {
          const active = activeTopic === topic;
          return (
            <Pressable
              key={topic}
              style={[styles(colors).topicChip, active ? styles(colors).topicChipActive : null]}
              onPress={() => setActiveTopic(topic)}
            >
              <Text style={[styles(colors).topicChipText, active ? styles(colors).topicChipTextActive : null]}>
                {topic}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visibleArticles.map((article) => (
        <Pressable key={article.id} style={styles(colors).articleCard} onPress={() => openArticlePreview(article)}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles(colors).articleImage} resizeMode="cover" />
          ) : (
            <View style={styles(colors).articleImagePlaceholder}>
              <Text style={styles(colors).articleImagePlaceholderText}>{article.tag.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles(colors).articleTag}>{article.tag.toUpperCase()}</Text>
          <Text style={styles(colors).articleTitleLink}>{article.title}</Text>
          <Text style={styles(colors).articleSummary}>{article.summary}</Text>
          <View style={styles(colors).metaRow}>
            <Text style={styles(colors).metaText}>{article.likes} likes</Text>
            <Text style={styles(colors).metaText}>{article.comments} comments</Text>
          </View>
        </Pressable>
      ))}

      {hasMore ? (
        <Pressable style={styles(colors).moreButton} onPress={() => setVisibleCount((count) => count + 10)}>
          <Text style={styles(colors).moreButtonText}>Diger Haberler</Text>
        </Pressable>
      ) : null}

      <NewsQuickPreviewModal
        visible={!!previewItem}
        item={previewItem}
        colors={colors}
        onClose={() => setPreviewItem(null)}
        onPublisherPress={(sourceName) => {
          setPreviewItem(null);
          const publisherId = getPublisherIdFromSourceName(sourceName);
          router.push(`/publisherprofile?id=${encodeURIComponent(publisherId)}` as any);
        }}
      />
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
    logoImage: {
      width: '100%',
      height: '100%',
      borderRadius: Radius.md,
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
    primaryButtonFull: {
      width: '100%',
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
    sectionHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionCount: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    topicRow: {
      gap: Spacing.sm,
      paddingRight: Spacing.lg,
    },
    topicChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: colors.surface,
    },
    topicChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    topicChipText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    topicChipTextActive: {
      color: colors.white,
    },
    directoryWrap: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    directoryTitle: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: Typography.fontSize.xl,
      lineHeight: 30,
    },
    directorySub: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
    },
    directoryRow: {
      gap: Spacing.sm,
      paddingRight: Spacing.lg,
    },
    directoryCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.md,
      padding: Spacing.md,
      width: 190,
      gap: Spacing.sm,
      alignItems: 'center',
    },
    directoryLogoBox: {
      width: 56,
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    directoryLogoImage: {
      width: '100%',
      height: '100%',
      borderRadius: Radius.full,
    },
    directoryBody: {
      alignItems: 'center',
      gap: 2,
      width: '100%',
    },
    directoryLogoText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    directoryName: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      textAlign: 'center',
    },
    directoryMeta: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
    },
    directoryFollow: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
    },
    directoryActionPill: {
      marginTop: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
    },
    directoryActionText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    articleCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    articleImage: {
      width: '100%',
      height: 180,
      borderRadius: Radius.md,
    },
    articleImagePlaceholder: {
      width: '100%',
      height: 120,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    articleImagePlaceholderText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      letterSpacing: 1,
      fontWeight: Typography.fontWeight.bold,
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
    articleTitleLink: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: Typography.fontSize.xl,
      lineHeight: 30,
      textDecorationLine: 'underline',
      textDecorationColor: colors.accent,
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
    moreButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreButtonText: {
      color: colors.accent,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
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
    emptyText: {
      marginTop: Spacing.sm,
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
    },
  });

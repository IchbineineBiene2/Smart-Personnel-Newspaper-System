// @ts-nocheck
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

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

function formatArticleDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PublisherProfilePage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors, themeName } = useTheme();
  const pageColors =
    themeName === 'vincent'
      ? {
          ...colors,
          background: colors.surface,
          surface: colors.surface,
          surfaceHigh: colors.surface,
          surfaceInput: colors.surface,
          white: colors.surface,
        }
      : colors;
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
  const [isDirectoryHovered, setIsDirectoryHovered] = useState(false);
  const [previewItem, setPreviewItem] = useState<{
    id: string;
    title: string;
    summary: string;
    sourceName: string;
    sourceLogoUrl?: string;
    imageUrl?: string;
    publishedAt?: string;
    url?: string;
    category?: string;
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
  const loopedOtherPublishers = useMemo(
    () => (otherPublishers.length > 1 ? [...otherPublishers, ...otherPublishers] : otherPublishers),
    [otherPublishers]
  );
  const canAutoScrollDirectory = otherPublishers.length > 1;
  const directoryScrollRef = useRef<ScrollView | null>(null);
  const directoryOffsetRef = useRef(0);
  const directoryContentWidthRef = useRef(0);
  const resumeAutoScrollAtRef = useRef(0);

  const normalizeDirectoryOffset = (rawOffset: number) => {
    const loopWidth = directoryContentWidthRef.current / 2;
    if (loopWidth <= 0) return Math.max(0, rawOffset);
    let normalized = rawOffset;
    while (normalized >= loopWidth) normalized -= loopWidth;
    while (normalized < 0) normalized += loopWidth;
    return normalized;
  };

  const scrollDirectoryBy = (delta: number) => {
    const nextOffset = normalizeDirectoryOffset(directoryOffsetRef.current + delta);
    directoryOffsetRef.current = nextOffset;
    directoryScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
    resumeAutoScrollAtRef.current = Date.now() + 2200;
  };

  useEffect(() => {
    directoryOffsetRef.current = 0;
    directoryScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [selectedId]);

  useEffect(() => {
    if (!canAutoScrollDirectory) return;

    const timerId = setInterval(() => {
      if (isDirectoryHovered) return;
      if (Date.now() < resumeAutoScrollAtRef.current) return;

      const loopWidth = directoryContentWidthRef.current / 2;
      if (loopWidth <= 0) return;

      let nextOffset = directoryOffsetRef.current + 0.8;
      if (nextOffset >= loopWidth) {
        nextOffset -= loopWidth;
      }

      directoryOffsetRef.current = nextOffset;
      directoryScrollRef.current?.scrollTo({ x: nextOffset, animated: false });
    }, 24);

    return () => clearInterval(timerId);
  }, [canAutoScrollDirectory, isDirectoryHovered]);

  if (loading) {
    return (
      <View style={styles(pageColors).emptyWrap}>
        <ActivityIndicator color={pageColors.accent} />
        <Text style={styles(pageColors).emptyText}>Yayinci verileri yukleniyor...</Text>
      </View>
    );
  }

  if (!publisher) {
    return (
      <View style={styles(pageColors).emptyWrap}>
        <Text style={styles(pageColors).emptyTitle}>Publisher not found</Text>
      </View>
    );
  }

  const followed = followedIds.includes(publisher.id);

  const openArticlePreview = (article: (typeof visibleArticles)[number]) => {
    setPreviewItem({
      id: article.id,
      title: article.title,
      summary: article.summary,
      sourceName: publisher.name,
      sourceLogoUrl: publisher.logoUrl,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      url: article.originalUrl,
      category: article.tag,
    });
  };

  return (
    <ScrollView style={styles(pageColors).container} contentContainerStyle={styles(pageColors).content}>
      <View style={styles(pageColors).headerCard}>
        <View style={styles(pageColors).logoBox}>
          {publisher.logoUrl ? (
            <Image source={{ uri: publisher.logoUrl }} style={styles(pageColors).logoImage} resizeMode="cover" />
          ) : (
            <Text style={styles(pageColors).logoText}>{publisher.logoText}</Text>
          )}
        </View>

        <Text style={styles(pageColors).title}>{publisher.name}</Text>
        {publisher.verified ? <Text style={styles(pageColors).badge}>VERIFIED SOURCE</Text> : null}

        <View style={styles(pageColors).statsRow}>
          <View style={styles(pageColors).statItem}>
            <Text style={styles(pageColors).statValue}>{publisher.followers}</Text>
            <Text style={styles(pageColors).statLabel}>Followers</Text>
          </View>
          <View style={styles(pageColors).statItem}>
            <Text style={styles(pageColors).statValue}>{publisher.articlesCount}</Text>
            <Text style={styles(pageColors).statLabel}>Articles</Text>
          </View>
          <View style={styles(pageColors).statItem}>
            <Text style={styles(pageColors).statValue}>{publisher.reporters}</Text>
            <Text style={styles(pageColors).statLabel}>Reporters</Text>
          </View>
        </View>

        <Text style={styles(pageColors).description}>{publisher.description}</Text>

        <View style={styles(pageColors).actionsRow}>
          <Pressable
            style={[styles(pageColors).primaryButtonFull, followed ? styles(pageColors).primaryButtonActive : null]}
            onPress={() => toggleFollow(publisher.id)}
          >
            <Text style={styles(pageColors).primaryButtonText}>{followed ? 'Following' : 'Follow Publisher'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles(pageColors).directoryWrap}>
        <Text style={styles(pageColors).directoryTitle}>Tum Kanallar</Text>
        <Text style={styles(pageColors).directorySub}>Sistemdeki diger haber kaynaklarini kesfet.</Text>

        <View
          style={styles(pageColors).directoryScrollerWrap}
          onMouseEnter={Platform.OS === 'web' ? () => setIsDirectoryHovered(true) : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setIsDirectoryHovered(false) : undefined}
        >
          <ScrollView
            ref={directoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              directoryOffsetRef.current = normalizeDirectoryOffset(event.nativeEvent.contentOffset.x);
            }}
            onScrollBeginDrag={() => {
              resumeAutoScrollAtRef.current = Date.now() + 3000;
            }}
            onMomentumScrollBegin={() => {
              resumeAutoScrollAtRef.current = Date.now() + 3000;
            }}
            onMomentumScrollEnd={() => {
              directoryOffsetRef.current = normalizeDirectoryOffset(directoryOffsetRef.current);
              resumeAutoScrollAtRef.current = Date.now() + 1200;
            }}
            onTouchStart={() => {
              resumeAutoScrollAtRef.current = Date.now() + 3000;
            }}
            onTouchEnd={() => {
              resumeAutoScrollAtRef.current = Date.now() + 1200;
            }}
            onContentSizeChange={(width) => {
              directoryContentWidthRef.current = width;
            }}
            contentContainerStyle={styles(pageColors).directoryRow}
          >
            {loopedOtherPublishers.map((item, index) => (
              <Pressable
                key={`${item.id}-${index}`}
                style={styles(pageColors).directoryCard}
                onPress={() => router.push(`/publisherprofile?id=${item.id}` as any)}
              >
                <View style={styles(pageColors).directoryLogoBox}>
                  {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles(pageColors).directoryLogoImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles(pageColors).directoryLogoText}>{item.logoText}</Text>
                  )}
                </View>
                <View style={styles(pageColors).directoryBody}>
                  <Text style={styles(pageColors).directoryName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles(pageColors).directoryMeta}>{item.category}</Text>
                  <Text style={styles(pageColors).directoryFollow}>{item.followers} takipci</Text>
                </View>
                <View style={styles(pageColors).directoryActionPill}>
                  <Text style={styles(pageColors).directoryActionText}>Profili Gor</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          {canAutoScrollDirectory ? (
            <View pointerEvents="box-none" style={styles(pageColors).directoryControlsWrap}>
              <Pressable
                style={[styles(pageColors).directoryControlBtn, styles(pageColors).directoryControlLeft]}
                onPress={() => scrollDirectoryBy(-220)}
              >
                <Text style={styles(pageColors).directoryControlText}>{'<'}</Text>
              </Pressable>
              <Pressable
                style={[styles(pageColors).directoryControlBtn, styles(pageColors).directoryControlRight]}
                onPress={() => scrollDirectoryBy(220)}
              >
                <Text style={styles(pageColors).directoryControlText}>{'>'}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles(pageColors).sectionHeadRow}>
        <Text style={styles(pageColors).sectionTitle}>Kanal Haberleri</Text>
        <Text style={styles(pageColors).sectionCount}>{filteredArticles.length} haber</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(pageColors).topicRow}>
        {topicFilters.map((topic) => {
          const active = activeTopic === topic;
          return (
            <Pressable
              key={topic}
              style={[styles(pageColors).topicChip, active ? styles(pageColors).topicChipActive : null]}
              onPress={() => setActiveTopic(topic)}
            >
              <Text style={[styles(pageColors).topicChipText, active ? styles(pageColors).topicChipTextActive : null]}>
                {topic}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {visibleArticles.map((article) => (
        <Pressable key={article.id} style={styles(pageColors).articleCard} onPress={() => openArticlePreview(article)}>
          {article.imageUrl ? (
            <Image source={{ uri: article.imageUrl }} style={styles(pageColors).articleImage} resizeMode="cover" />
          ) : (
            <View style={styles(pageColors).articleImagePlaceholder}>
              <Text style={styles(pageColors).articleImagePlaceholderText}>{article.tag.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles(pageColors).articleTag}>{article.tag.toUpperCase()}</Text>
          <Text style={styles(pageColors).articleTitleLink}>{article.title}</Text>
          <Text style={styles(pageColors).articleSummary}>{article.summary}</Text>
          <View style={styles(pageColors).metaRow}>
            <View style={styles(pageColors).metaLeft}>
              <Text style={styles(pageColors).metaText}>{article.likes} likes</Text>
              <Text style={styles(pageColors).metaText}>{article.comments} comments</Text>
            </View>
            {article.publishedAt ? <Text style={styles(pageColors).metaDate}>{formatArticleDateTime(article.publishedAt)}</Text> : null}
          </View>
        </Pressable>
      ))}

      {hasMore ? (
        <Pressable style={styles(pageColors).moreButton} onPress={() => setVisibleCount((count) => count + 10)}>
          <Text style={styles(pageColors).moreButtonText}>Diger Haberler</Text>
        </Pressable>
      ) : null}

      <NewsQuickPreviewModal
        visible={!!previewItem}
        item={previewItem}
        colors={pageColors}
        onClose={() => setPreviewItem(null)}
        onReadMorePress={(item) => {
          setPreviewItem(null);
          router.push({
            pathname: '/news/[id]',
            params: {
              id: item.id,
              title: item.title,
              summary: item.summary,
              imageUrl: item.imageUrl,
              source: item.sourceName,
              publishedAt: item.publishedAt,
              category: item.category,
            },
          });
        }}
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
    directoryScrollerWrap: {
      position: 'relative',
    },
    directoryControlsWrap: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: 'center',
    },
    directoryControlBtn: {
      position: 'absolute',
      width: 34,
      height: 34,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.black,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    directoryControlLeft: {
      left: 4,
    },
    directoryControlRight: {
      right: 4,
    },
    directoryControlText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: Typography.fontWeight.bold,
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
      alignItems: 'center',
    },
    metaLeft: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    metaDate: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: Typography.fontWeight.medium,
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

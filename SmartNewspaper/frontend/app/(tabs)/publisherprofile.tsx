// @ts-nocheck
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import NewsQuickPreviewModal from '@/components/NewsQuickPreviewModal';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePublisherState } from '@/hooks/usePublisherState';
import { useApiNews } from '@/hooks/useNews';
import { useTheme } from '@/hooks/useTheme';
import { useSourceStats } from '@/hooks/useSourceStats';
import { buildPublisherDataset, getPublisherIdFromSourceName } from '@/services/publisherProfiles';
import { fetchArticles, ApiArticle } from '@/services/newsApi';

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
  const { followedIds, toggleFollow } = usePublisherState();
  const { articles: apiArticles, loading } = useApiNews();
  const { publishers, articles } = useMemo(() => buildPublisherDataset(apiArticles), [apiArticles]);

  const selectedId = id ?? 'global-dispatch';
  const publisher = publishers.find((item) => item.id === selectedId);
  const { stats: sourceStats } = useSourceStats(publisher?.name);

  // Kaynağa özel makaleler — global 500'den sadece birkaç makale gelebileceği için
  // publisher adı belli olunca o kaynağa özel 100 makale ayrıca çekiyoruz.
  const [sourceApiArticles, setSourceApiArticles] = useState<ApiArticle[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  useEffect(() => {
    if (!publisher?.name) return;
    setSourceLoading(true);
    fetchArticles({ source: publisher.name, limit: 500 })
      .then((data) => setSourceApiArticles(data))
      .catch(() => {})
      .finally(() => setSourceLoading(false));
  }, [publisher?.name]);

  const { articles: sourceArticles } = useMemo(
    () => buildPublisherDataset(sourceApiArticles.length > 0 ? sourceApiArticles : apiArticles),
    [sourceApiArticles, apiArticles]
  );

  const channelArticles = useMemo(
    () => sourceArticles.filter((item) => item.publisherId === selectedId),
    [sourceArticles, selectedId]
  );
  const topicFilters = useMemo(
    () => {
      const dynamicTopics = Array.from(new Set(channelArticles.map((item) => item.tag)));
      const merged = Array.from(new Set([...BASE_TOPICS, ...dynamicTopics]));
      return ['Tum Konular', ...merged];
    },
    [channelArticles]
  );

  const PAGE_SIZE = 24;
  const [activeTopic, setActiveTopic] = useState('Tum Konular');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isDirectoryHovered, setIsDirectoryHovered] = useState(false);

  // Breathing animation
  const breathAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
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
    let base = channelArticles;

    if (activeTopic === 'Siyaset') {
      base = channelArticles.filter((item) => {
        if (normalizeText(item.tag) === 'siyaset') return true;
        const blob = normalizeText(`${item.title} ${item.summary}`);
        return POLITICS_KEYWORDS.some((keyword) => blob.includes(keyword));
      });
    } else if (activeTopic !== 'Tum Konular') {
      base = channelArticles.filter((item) => item.tag === activeTopic);
    }

    if (!searchQuery.trim()) return base;
    const q = normalizeText(searchQuery.trim());
    return base.filter((item) =>
      normalizeText(item.title).includes(q) || normalizeText(item.summary).includes(q)
    );
  }, [activeTopic, searchQuery, channelArticles]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const pageArticles = filteredArticles.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(0);
    setActiveTopic('Tum Konular');
    setSearchQuery('');
  }, [selectedId]);

  useEffect(() => {
    setCurrentPage(0);
  }, [activeTopic, searchQuery]);

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

  const openArticlePreview = (article: (typeof pageArticles)[number]) => {
    router.push({
      pathname: '/news/[id]',
      params: {
        id: article.id,
        title: article.title,
        summary: article.summary,
        imageUrl: article.imageUrl,
        source: publisher?.name,
        url: article.originalUrl,
        publishedAt: article.publishedAt,
        category: article.tag,
      },
    });
  };

  return (
    <ScrollView style={styles(pageColors).container} contentContainerStyle={styles(pageColors).content}>
      <View style={styles(pageColors).headerCard}>
        {/* Banner katmanları: sabit zemin + nefes alan accent + gezgin glow */}
        <View style={styles(pageColors).headerBanner}>
          {/* Sabit koyu accent taban */}
          <View style={styles(pageColors).bannerBase} />
          {/* Nefes alan overlay */}
          <Animated.View
            style={[
              styles(pageColors).bannerAccent,
              { opacity: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.38] }) },
            ]}
          />
          {/* Sol glow — nefes ile büyüyüp küçülür */}
          <Animated.View
            style={[
              styles(pageColors).bannerGlowLeft,
              {
                opacity: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.45] }),
                transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
              },
            ]}
          />
          {/* Sağ glow — ters fazda */}
          <Animated.View
            style={[
              styles(pageColors).bannerGlowRight,
              {
                opacity: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.15] }),
                transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.9] }) }],
              },
            ]}
          />
          {/* Alt soluk geçiş */}
          <View style={styles(pageColors).bannerFade} />
        </View>

        {/* Logo (sol) + Actions (sağ) */}
        <View style={styles(pageColors).headerLogoRow}>
          {/* Logo glow halkası */}
          <View style={styles(pageColors).logoGlowRing}>
            <View style={styles(pageColors).logoBox}>
              {publisher.logoUrl ? (
                <Image source={{ uri: publisher.logoUrl }} style={styles(pageColors).logoImage} resizeMode="cover" />
              ) : (
                <Text style={styles(pageColors).logoText}>{publisher.logoText}</Text>
              )}
            </View>
          </View>

          <View style={styles(pageColors).headerActions}>
            {publisher.verified ? (
              <View style={styles(pageColors).badge}>
                <Text style={styles(pageColors).badgeText}>✓ Dogrulanmis</Text>
              </View>
            ) : null}
            <Pressable
              style={[styles(pageColors).followBtn, followed ? styles(pageColors).followBtnActive : null]}
              onPress={() => toggleFollow(publisher.id)}
            >
              <Text style={[styles(pageColors).followBtnText, followed ? styles(pageColors).followBtnTextActive : null]}>
                {followed ? '✓ Takip Ediliyor' : '+ Takip Et'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* İsim + açıklama */}
        <View style={styles(pageColors).headerInfo}>
          <Text style={styles(pageColors).title}>{publisher.name}</Text>
          <Text style={styles(pageColors).description}>{publisher.description}</Text>
        </View>

        {/* Stats tam genişlik bar */}
        <View style={styles(pageColors).statsBar}>
          <View style={styles(pageColors).statItem}>
            <Text style={styles(pageColors).statValue}>
              {sourceStats ? sourceStats.readerCount : '—'}
            </Text>
            <Text style={styles(pageColors).statLabel}>Okuyucu</Text>
          </View>
          <View style={styles(pageColors).statSep} />
          <View style={styles(pageColors).statItem}>
            <Text style={styles(pageColors).statValue}>
              {sourceStats ? sourceStats.articleCount : publisher.articlesCount}
            </Text>
            <Text style={styles(pageColors).statLabel}>Makale</Text>
          </View>
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
        <Text style={styles(pageColors).sectionCount}>{sourceLoading ? '...' : `${filteredArticles.length} haber`}</Text>
      </View>

      {/* Filtreler + Arama */}
      <View style={styles(pageColors).filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(pageColors).topicRow} style={{ flex: 1 }}>
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
          {/* Arama — chip sırasına entegre */}
          <View style={styles(pageColors).searchWrap}>
            <Text style={styles(pageColors).searchIcon}>⌕</Text>
            <TextInput
              style={styles(pageColors).searchInput}
              placeholder="Ara..."
              placeholderTextColor={pageColors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles(pageColors).searchClear}>✕</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>

      <View style={styles(pageColors).articleGrid}>
        {sourceLoading && pageArticles.length === 0 ? (
          <ActivityIndicator color={pageColors.accent} style={{ margin: 32 }} />
        ) : pageArticles.map((article) => (
          <Pressable key={article.id} style={styles(pageColors).articleCard} onPress={() => openArticlePreview(article)}>
            {article.imageUrl ? (
              <Image source={{ uri: article.imageUrl }} style={styles(pageColors).articleImage} resizeMode="cover" />
            ) : (
              <View style={styles(pageColors).articleImagePlaceholder}>
                <View style={styles(pageColors).articleImagePlaceholderInner}>
                  <Text style={styles(pageColors).articleImagePlaceholderText}>{article.tag.toUpperCase()}</Text>
                </View>
              </View>
            )}
            <View style={styles(pageColors).articleBody}>
              <View style={styles(pageColors).articleTagPill}>
                <Text style={styles(pageColors).articleTag}>{article.tag.toUpperCase()}</Text>
              </View>
              <Text style={styles(pageColors).articleTitleLink} numberOfLines={3}>{article.title}</Text>
              <View style={styles(pageColors).metaRow}>
                <Text style={styles(pageColors).metaText}>👁 {article.viewCount ?? 0}</Text>
                <Text style={styles(pageColors).metaText}>♥ {article.likeCount ?? 0}</Text>
                {article.publishedAt ? <Text style={styles(pageColors).metaDate}>{formatArticleDateTime(article.publishedAt)}</Text> : null}
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles(pageColors).paginationRow}>
          <Pressable
            style={[styles(pageColors).pageBtn, currentPage === 0 && styles(pageColors).pageBtnDisabled]}
            onPress={() => currentPage > 0 && setCurrentPage((p) => p - 1)}
          >
            <Text style={styles(pageColors).pageBtnText}>‹</Text>
          </Pressable>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let page: number;
            if (totalPages <= 7) {
              page = i;
            } else if (currentPage < 4) {
              page = i < 5 ? i : i === 5 ? -1 : totalPages - 1;
            } else if (currentPage > totalPages - 5) {
              page = i === 0 ? 0 : i === 1 ? -1 : totalPages - (6 - i);
            } else {
              page = i === 0 ? 0 : i === 1 ? -1 : i === 5 ? -1 : i === 6 ? totalPages - 1 : currentPage + (i - 3);
            }
            if (page === -1) {
              return <Text key={`ellipsis-${i}`} style={styles(pageColors).pageEllipsis}>…</Text>;
            }
            const active = page === currentPage;
            return (
              <Pressable key={page} style={[styles(pageColors).pageBtn, active && styles(pageColors).pageBtnActive]} onPress={() => setCurrentPage(page)}>
                <Text style={[styles(pageColors).pageBtnText, active && styles(pageColors).pageBtnTextActive]}>{page + 1}</Text>
              </Pressable>
            );
          })}

          <Pressable
            style={[styles(pageColors).pageBtn, currentPage === totalPages - 1 && styles(pageColors).pageBtnDisabled]}
            onPress={() => currentPage < totalPages - 1 && setCurrentPage((p) => p + 1)}
          >
            <Text style={styles(pageColors).pageBtnText}>›</Text>
          </Pressable>
        </View>
      )}

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
              url: item.url,
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
      gap: Spacing.lg,
      paddingBottom: Spacing.xxl,
    },
    headerCard: {
      borderWidth: 1,
      borderColor: colors.accent + '33',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      shadowColor: colors.accent,
      shadowOpacity: 0.15,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    /* --- Banner katmanları --- */
    headerBanner: {
      height: 140,
      marginBottom: -82,
      position: 'relative',
      overflow: 'hidden',
    },
    bannerBase: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.accent,
      opacity: 0.12,
    },
    bannerAccent: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.accent,
    },
    bannerGlowLeft: {
      position: 'absolute',
      top: -60,
      left: -60,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: colors.accent,
    },
    bannerGlowRight: {
      position: 'absolute',
      top: -40,
      right: -80,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: colors.accent,
    },
    bannerFade: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 72,
      backgroundColor: colors.surface,
      opacity: 0.55,
    },
    /* --- Logo satırı --- */
    headerLogoRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
      zIndex: 2,
    },
    logoGlowRing: {
      padding: 4,
      borderRadius: Radius.lg + 4,
      shadowColor: colors.accent,
      shadowOpacity: 0.55,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
      elevation: 12,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingBottom: 4,
    },
    followBtn: {
      backgroundColor: colors.accent,
      borderRadius: Radius.full,
      paddingVertical: 9,
      paddingHorizontal: 20,
      shadowColor: colors.accent,
      shadowOpacity: 0.45,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    followBtnActive: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent + '88',
      shadowOpacity: 0,
      elevation: 0,
    },
    followBtnText: {
      color: colors.white,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.5,
    },
    followBtnTextActive: {
      color: colors.accent,
    },
    /* --- İsim + açıklama --- */
    headerInfo: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: Spacing.xs,
      zIndex: 1,
    },
    /* --- Stats tam genişlik bar --- */
    statsBar: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.accent + '22',
      backgroundColor: colors.accent + '08',
    },
    statsRow: {
      flexDirection: 'row',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.md,
      gap: 2,
    },
    statSep: {
      width: 1,
      backgroundColor: colors.accent + '22',
    },
    /* --- Logo --- */
    logoBox: {
      width: 100,
      height: 100,
      borderWidth: 3,
      borderColor: colors.surface,
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
      fontSize: Typography.fontSize.xl,
    },
    logoImage: {
      width: '100%',
      height: '100%',
      borderRadius: Radius.md,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 36,
      fontWeight: '900',
      lineHeight: 42,
      letterSpacing: -0.5,
    },
    badge: {
      backgroundColor: colors.accent + '18',
      borderWidth: 1,
      borderColor: colors.accent + '44',
      borderRadius: Radius.full,
      paddingVertical: 5,
      paddingHorizontal: Spacing.md,
    },
    badgeText: {
      color: colors.accent,
      letterSpacing: 0.5,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    statValue: {
      color: colors.accent,
      fontSize: 20,
      fontWeight: Typography.fontWeight.bold,
      lineHeight: 24,
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    description: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
      lineHeight: 20,
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
      fontSize: 26,
      fontWeight: '800',
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    sectionHeadRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    sectionCount: {
      color: colors.accent,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    topicRow: {
      gap: Spacing.sm,
      paddingRight: Spacing.lg,
    },
    topicChip: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: 7,
      backgroundColor: colors.surface,
    },
    topicChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    topicChipText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    topicChipTextActive: {
      color: colors.white,
      fontWeight: Typography.fontWeight.bold,
    },
    directoryWrap: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
      shadowColor: colors.black,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    directoryTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.xl,
      fontWeight: '800',
      lineHeight: 28,
    },
    directorySub: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      letterSpacing: 0.3,
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
      borderRadius: Radius.lg,
      padding: Spacing.md,
      width: 180,
      gap: Spacing.xs,
      alignItems: 'center',
      shadowColor: colors.black,
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    directoryLogoBox: {
      width: 60,
      height: 60,
      borderWidth: 2,
      borderColor: colors.accent + '44',
      borderRadius: Radius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.accent,
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
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
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    directoryName: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      textAlign: 'center',
    },
    directoryMeta: {
      color: colors.accent,
      fontSize: Typography.fontSize.xs,
    },
    directoryFollow: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
    },
    directoryActionPill: {
      marginTop: Spacing.xs,
      backgroundColor: colors.accent,
      borderRadius: Radius.full,
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
    },
    directoryActionText: {
      color: colors.white,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      letterSpacing: 0.3,
    },
    articleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    articleCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      flexBasis: '23%',
      flexGrow: 1,
      minWidth: 200,
      shadowColor: colors.black,
      shadowOpacity: 0.07,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    articleImage: {
      width: '100%',
      height: 150,
    },
    articleImageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
      backgroundColor: colors.surface,
      opacity: 0,
    },
    articleImagePlaceholder: {
      width: '100%',
      height: 120,
      backgroundColor: colors.accent + '10',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.accent + '22',
    },
    articleImagePlaceholderInner: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.accent + '44',
    },
    articleImagePlaceholderText: {
      color: colors.accent,
      fontSize: 10,
      letterSpacing: 2,
      fontWeight: Typography.fontWeight.bold,
    },
    articleBody: {
      padding: Spacing.md,
      gap: Spacing.xs,
      flex: 1,
    },
    articleTagPill: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent + '18',
      borderRadius: Radius.full,
      paddingVertical: 2,
      paddingHorizontal: Spacing.sm,
    },
    articleTag: {
      color: colors.accent,
      fontSize: 9,
      letterSpacing: 1.2,
      fontWeight: Typography.fontWeight.bold,
    },
    articleTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
      fontWeight: '700',
      lineHeight: 22,
    },
    articleTitleLink: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
      fontWeight: '700',
      lineHeight: 22,
    },
    articleSummary: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
      lineHeight: 18,
    },
    metaRow: {
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      paddingTop: Spacing.xs,
      marginTop: 'auto' as any,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    metaText: {
      color: colors.textMuted,
      fontSize: 11,
    },
    metaDate: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: Typography.fontWeight.medium,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.accent + '55',
      borderRadius: Radius.full,
      paddingHorizontal: 16,
      paddingVertical: 7,
      gap: 7,
      minWidth: 240,
      height: 38,
    },
    searchIcon: {
      fontSize: 18,
      color: colors.accent,
      lineHeight: 22,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      minWidth: 160,
      height: 24,
      // @ts-ignore
      outlineStyle: 'none',
    },
    searchClear: {
      color: colors.textMuted,
      fontSize: 11,
      paddingHorizontal: 2,
    },
    paginationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.md,
    },
    pageBtn: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.accent + '44',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    pageBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pageBtnDisabled: {
      opacity: 0.3,
    },
    pageBtnText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: '600',
    },
    pageBtnTextActive: {
      color: '#fff',
    },
    pageEllipsis: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
      width: 24,
      textAlign: 'center',
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

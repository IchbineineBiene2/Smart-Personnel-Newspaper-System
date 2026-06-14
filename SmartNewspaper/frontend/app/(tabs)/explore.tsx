import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useApiNews } from '@/hooks/useNews';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import {
  ApiArticle,
  fetchBreakingArticles,
  fetchNewsSources,
  fetchTrendingArticles,
  mapToContentCategory,
  proxyImageUrl,
  NewsSourceSummary,
} from '@/services/newsApi';
import { ContentCategory } from '@/services/content';
import { SocialSidebar } from '@/components/SocialSidebar';

const CATEGORY_META: { key: ContentCategory; label: string; icon: string; color: string }[] = [
  { key: 'Siyaset',   label: 'Gündem',    icon: 'megaphone-outline',   color: '#ef4444' },
  { key: 'Ekonomi',   label: 'Ekonomi',   icon: 'trending-up-outline', color: '#f59e0b' },
  { key: 'Spor',      label: 'Spor',      icon: 'football-outline',    color: '#10b981' },
  { key: 'Teknoloji', label: 'Teknoloji', icon: 'hardware-chip-outline', color: '#3b82f6' },
  { key: 'Magazin',   label: 'Magazin',   icon: 'sparkles-outline',    color: '#ec4899' },
  { key: 'Saglik',    label: 'Sağlık',    icon: 'medkit-outline',      color: '#06b6d4' },
  { key: 'Kultur',    label: 'Kültür',    icon: 'color-palette-outline', color: '#8b5cf6' },
  { key: 'Deprem',    label: 'Deprem',    icon: 'warning-outline',     color: '#f97316' },
  { key: 'Kaza',      label: 'Asayiş',    icon: 'shield-outline',      color: '#64748b' },
];

const TRENDING_TOPICS = [
  'yapay-zeka', 'seçim', 'enflasyon', 'transfer', 'iklim',
  'uzay', 'kripto', 'sağlık-reformu', 'dolar', 'avrupa',
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} gün`;
}

export default function ExploreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { preferredNewsLanguages } = usePreferences();
  const { articles, loading } = useApiNews(preferredNewsLanguages);
  const isWeb = Platform.OS === 'web';

  const [breaking, setBreaking] = useState<ApiArticle[]>([]);
  const [trending, setTrending] = useState<ApiArticle[]>([]);
  const [sources, setSources] = useState<NewsSourceSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState<ContentCategory | 'tumu'>('tumu');
  const [draggedArticle, setDraggedArticle] = useState<ApiArticle | null>(null);
  const [token, setToken] = useState('');
  const [currentUserId, setCurrentUserId] = useState(0);
  const [socialOpen, setSocialOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [realTrendingTopics, setRealTrendingTopics] = useState<{tag: string; count: number}[]>([]);

  const headerFade = useRef(new Animated.Value(0)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const bodyFade = useRef(new Animated.Value(0)).current;
  const tickerX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerFade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(heroFade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(bodyFade, { toValue: 1, duration: 560, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    fetchBreakingArticles(8).then(setBreaking).catch(() => {});
    fetchTrendingArticles(10).then(setTrending).catch(() => {});
    fetchNewsSources().then(setSources).catch(() => {});
    
    fetch('http://localhost:3000/api/news/trending-topics')
      .then((r) => r.json())
      .then((data) => {
        if (data.topics && data.topics.length > 0) {
          setRealTrendingTopics(data.topics);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const authModule = require('@/services/auth');
        const t = await authModule.getToken?.();
        const u = await authModule.getCurrentUser?.();
        if (t) setToken(t);
        if (u?.userId) setCurrentUserId(u.userId);
      } catch {}
    };
    load();
  }, []);

  const matchesPreferredLanguage = (article: ApiArticle) =>
    preferredNewsLanguages.length === 0 || preferredNewsLanguages.includes(article.language);

  const visibleBreaking = useMemo(
    () => breaking.filter(matchesPreferredLanguage),
    [breaking, preferredNewsLanguages]
  );

  const visibleTrending = useMemo(
    () => trending.filter(matchesPreferredLanguage),
    [trending, preferredNewsLanguages]
  );

  // Breaking ticker scroll loop
  useEffect(() => {
    if (visibleBreaking.length === 0) return;
    const animate = () => {
      tickerX.setValue(0);
      Animated.timing(tickerX, {
        toValue: 1,
        duration: 28000,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) animate();
      });
    };
    animate();
  }, [visibleBreaking.length]);

  // Articles enriched with normalized category
  const enriched = useMemo(
    () =>
      articles.map((a) => ({
        article: a,
        cat: mapToContentCategory(a.category, a.title, a.description),
      })),
    [articles]
  );

  // Filter for main feed
  const filtered = useMemo(() => {
    if (activeCategory === 'tumu') return enriched;
    return enriched.filter((e) => e.cat === activeCategory);
  }, [enriched, activeCategory]);

  // Hero = top article with image (prefer trending if available, else filtered)
  const heroPool = activeCategory === 'tumu' && visibleTrending.length > 0
    ? visibleTrending.map((a) => ({ article: a, cat: mapToContentCategory(a.category, a.title, a.description) }))
    : filtered;

  const heroMain = heroPool.find((e) => !!e.article.imageUrl) ?? heroPool[0];
  const heroSide = heroPool.filter((e) => e !== heroMain).slice(0, 2);

  const editorPicks = filtered.filter((e) => !!e.article.imageUrl).slice(3, 9);

  // Most read = trending (fallback to filtered top 10)
  const mostRead = visibleTrending.length > 0
    ? visibleTrending.slice(0, 10)
    : filtered.slice(0, 10).map((e) => e.article);

  // Per-category bands (only show categories with content)
  const bands = useMemo(() => {
    return CATEGORY_META.map((meta) => {
      const items = enriched.filter((e) => e.cat === meta.key).slice(0, 5);
      return { meta, items };
    }).filter((b) => b.items.length >= 2);
  }, [enriched]);

  const openArticle = (a: ApiArticle) => {
    const cat = mapToContentCategory(a.category, a.title, a.description);
    router.push({
      pathname: '/news/[id]',
      params: {
        id: a.id,
        title: a.title,
        summary: a.description,
        imageUrl: a.imageUrl ?? '',
        source: a.source.name,
        url: a.url,
        publishedAt: a.publishedAt,
        category: cat,
      },
    });
  };

  // ── Layout decisions ──
  const isWide = isWeb && width >= 1100;
  const isMedium = isWeb && width >= 760 && width < 1100;
  const heroSideStack = !isWide;
  const editorCols = isWide ? 3 : isMedium ? 2 : 1;

  const showSocialSidebar = isWide && (socialOpen || !!draggedArticle);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: isWide ? 'row' : 'column',
        backgroundColor: colors.background,
        position: 'relative',
      }}
    >
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background, flex: 1 }]}
      contentContainerStyle={[
        styles.content,
        isWeb && { paddingTop: 28 },
        isWide && !showSocialSidebar && { paddingRight: 78 },
        !isWide && isWeb && { maxWidth: 1280, alignSelf: 'center' as any, width: '100%' as any },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ─────────────────────────── BREAKING TICKER ─────────────────────────── */}
      {visibleBreaking.length > 0 && (
        <View style={[styles.tickerBar, { backgroundColor: '#ef4444' }]}>
          <View style={styles.tickerBadge}>
            <View style={styles.tickerDot} />
            <Text style={styles.tickerBadgeText}>SON DAKİKA</Text>
          </View>
          <View style={styles.tickerTrack}>
            <Animated.View
              style={{
                flexDirection: 'row',
                gap: 32,
                transform: [
                  {
                    translateX: tickerX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -1400],
                    }),
                  },
                ],
              }}
            >
              {[...visibleBreaking, ...visibleBreaking].map((a, i) => (
                <Pressable key={`${a.id}-${i}`} onPress={() => openArticle(a)} style={styles.tickerItem}>
                  <Text style={styles.tickerText} numberOfLines={1}>
                    • {a.title}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        </View>
      )}

      {/* ─────────────────────────── HEADER ─────────────────────────── */}
      <Animated.View style={[styles.header, { opacity: headerFade }]}>
        <View style={styles.headerTopRow}>
          <View style={[styles.kicker, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '32' }]}>
            <Ionicons name="compass" size={11} color={colors.accent} />
            <Text style={[styles.kickerText, { color: colors.accent }]}>KEŞFET</Text>
          </View>
          <Text style={[styles.headerDate, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Bugünün <Text style={{ color: colors.accent, fontStyle: 'italic' }}>Ana Haberleri</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Tüm kaynaklardan derlenmiş, editöryel bakışla seçilmiş öne çıkanlar.
        </Text>

        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Haber, etiket veya konu ara..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (searchQuery.trim().length > 0) {
                router.push({ pathname: '/(tabs)/search', params: { q: searchQuery.trim() } });
              }
            }}
          />
        </View>
      </Animated.View>

      {/* ─────────────────────────── CATEGORY CHIPS ─────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <CategoryChip
          label="Tümü"
          icon="apps-outline"
          active={activeCategory === 'tumu'}
          color={colors.accent}
          colors={colors}
          onPress={() => setActiveCategory('tumu')}
        />
        {CATEGORY_META.map((m) => (
          <CategoryChip
            key={m.key}
            label={m.label}
            icon={m.icon}
            active={activeCategory === m.key}
            color={m.color}
            colors={colors}
            onPress={() => setActiveCategory(m.key)}
          />
        ))}
      </ScrollView>

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      {loading && filtered.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Haberler yükleniyor...</Text>
        </View>
      ) : !heroMain ? (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu kategoride şu an haber yok.</Text>
        </View>
      ) : (
        <Animated.View style={[styles.heroWrap, { opacity: heroFade, flexDirection: heroSideStack ? 'column' : 'row' }]}>
          {/* Main hero */}
          <DragWrap
            article={heroMain.article}
            style={{ flex: heroSideStack ? undefined : 1.7 }}
            onArticleDrag={setDraggedArticle}
            onDragEnd={() => setDraggedArticle(null)}
          >
          <Pressable
            onPress={() => openArticle(heroMain.article)}
            style={({ pressed }) => [
              styles.heroMain,
              { flex: 1, backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            {heroMain.article.imageUrl && (
              <Image
                source={{ uri: proxyImageUrl(heroMain.article.imageUrl) }}
                style={styles.heroMainImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.heroOverlay} pointerEvents="none" />
            <View style={styles.heroMainContent}>
              <View style={[styles.heroCatPill, { backgroundColor: getCategoryColor(heroMain.cat) }]}>
                <Text style={styles.heroCatText}>{getCategoryLabel(heroMain.cat).toUpperCase()}</Text>
              </View>
              <Text style={styles.heroMainTitle} numberOfLines={3}>{heroMain.article.title}</Text>
              {!!heroMain.article.description && (
                <Text style={styles.heroMainDesc} numberOfLines={2}>{heroMain.article.description}</Text>
              )}
              <View style={styles.heroMeta}>
                <Text style={styles.heroMetaText}>{heroMain.article.source.name}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaText}>{timeAgo(heroMain.article.publishedAt)}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaText}>👁 {heroMain.article.viewCount ?? 0}</Text>
                <Text style={styles.heroMetaDot}>•</Text>
                <Text style={styles.heroMetaText}>♥ {heroMain.article.likeCount ?? 0}</Text>
              </View>
            </View>
          </Pressable>
          </DragWrap>

          {/* Side hero stack */}
          <View style={[styles.heroSideStack, { flex: heroSideStack ? undefined : 1, flexDirection: heroSideStack ? 'row' : 'column' }]}>
            {heroSide.map((e) => (
              <DragWrap
                key={e.article.id}
                article={e.article}
                style={{ flex: 1 }}
                onArticleDrag={setDraggedArticle}
                onDragEnd={() => setDraggedArticle(null)}
              >
              <Pressable
                onPress={() => openArticle(e.article)}
                style={({ pressed }) => [
                  styles.heroSideCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: pressed ? 0.92 : 1, flex: 1 },
                ]}
              >
                {e.article.imageUrl && (
                  <Image source={{ uri: proxyImageUrl(e.article.imageUrl) }} style={styles.heroSideImage} resizeMode="cover" />
                )}
                <View style={styles.heroSideBody}>
                  <View style={[styles.miniCatPill, { backgroundColor: getCategoryColor(e.cat) + '20' }]}>
                    <Text style={[styles.miniCatText, { color: getCategoryColor(e.cat) }]}>{getCategoryLabel(e.cat)}</Text>
                  </View>
                  <Text style={[styles.heroSideTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                    {e.article.title}
                  </Text>
                  <View style={styles.heroSideMetaRow}>
                    <Text style={[styles.heroSideMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {e.article.source.name} • {timeAgo(e.article.publishedAt)}
                    </Text>
                    <Text style={[styles.heroSideMeta, { color: colors.textMuted }]}>
                      👁 {e.article.viewCount ?? 0}{'  '}♥ {e.article.likeCount ?? 0}
                    </Text>
                  </View>
                </View>
              </Pressable>
              </DragWrap>
            ))}
          </View>
        </Animated.View>
      )}

      <Animated.View style={{ opacity: bodyFade, gap: 32 }}>
        {/* ─────────────────── EDITOR'S PICKS ─────────────────── */}
        {editorPicks.length > 0 && (
          <Section
            kicker="EDİTÖRÜN SEÇİMİ"
            title="Bugün Öne Çıkanlar"
            colors={colors}
          >
            <View style={[styles.grid, { gap: 16 }]}>
              {editorPicks.slice(0, editorCols * 2).map((e) => (
                <DragWrap
                  key={e.article.id}
                  article={e.article}
                  style={{ width: `${100 / editorCols - 1}%` as any }}
                  onArticleDrag={setDraggedArticle}
                  onDragEnd={() => setDraggedArticle(null)}
                >
                <Pressable
                  onPress={() => openArticle(e.article)}
                  style={({ pressed }) => [
                    styles.gridCard,
                    {
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  {e.article.imageUrl && (
                    <Image source={{ uri: proxyImageUrl(e.article.imageUrl) }} style={styles.gridImage} resizeMode="cover" />
                  )}
                  <View style={styles.gridBody}>
                    <View style={[styles.miniCatPill, { backgroundColor: getCategoryColor(e.cat) + '20' }]}>
                      <Text style={[styles.miniCatText, { color: getCategoryColor(e.cat) }]}>{getCategoryLabel(e.cat)}</Text>
                    </View>
                    <Text style={[styles.gridTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                      {e.article.title}
                    </Text>
                    {!!e.article.description && (
                      <Text style={[styles.gridDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {e.article.description}
                      </Text>
                    )}
                    <View style={styles.gridMetaRow}>
                      <Text style={[styles.gridMeta, { color: colors.textMuted }]}>
                        {e.article.source.name} • {timeAgo(e.article.publishedAt)}
                      </Text>
                      <Text style={[styles.gridMeta, { color: colors.textMuted }]}>
                        👁 {e.article.viewCount ?? 0}{'  '}♥ {e.article.likeCount ?? 0}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                </DragWrap>
              ))}
            </View>
          </Section>
        )}

        {/* ─────────────────── MOST READ + TRENDING TOPICS (split) ─────────────────── */}
        <View style={[styles.splitRow, { flexDirection: isWide ? 'row' : 'column' }]}>
          <View style={{ flex: isWide ? 2 : undefined }}>
            <Section
              kicker="EN ÇOK OKUNANLAR"
              title="Saatin Popüleri"
              colors={colors}
            >
              <View style={{ gap: 0 }}>
                {mostRead.slice(0, 10).map((a, i) => {
                  const cat = mapToContentCategory(a.category, a.title, a.description);
                  return (
                    <Pressable
                      key={a.id}
                      onPress={() => openArticle(a)}
                      style={({ pressed }) => [
                        styles.rankRow,
                        { borderBottomColor: colors.borderSubtle, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankNumber,
                          {
                            color: i < 3 ? colors.accent : colors.textMuted,
                            fontStyle: i < 3 ? 'italic' : 'normal',
                          },
                        ]}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rankTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                          {a.title}
                        </Text>
                        <View style={styles.rankMetaRow}>
                          <View style={[styles.miniCatPill, { backgroundColor: getCategoryColor(cat) + '20' }]}>
                            <Text style={[styles.miniCatText, { color: getCategoryColor(cat) }]}>{getCategoryLabel(cat)}</Text>
                          </View>
                          <Text style={[styles.rankMeta, { color: colors.textMuted }]}>
                            {a.source.name} • {timeAgo(a.publishedAt)} • 👁 {a.viewCount ?? 0}  ♥ {a.likeCount ?? 0}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Section>
          </View>

          <View style={{ flex: isWide ? 1 : undefined, gap: 24 }}>
            {/* Trending Topics */}
            <Section
              kicker="TREND KONULAR"
              title="Şu An Konuşulanlar"
              colors={colors}
            >
              <View style={styles.tagCloud}>
                {(realTrendingTopics.length > 0 ? realTrendingTopics : TRENDING_TOPICS.map((t, i) => ({ tag: t, count: 120 - i * 11 }))).map((topic) => (
                  <Pressable
                    key={topic.tag}
                    onPress={() => router.push({ pathname: '/(tabs)/search', params: { q: topic.tag } })}
                    style={({ pressed }) => [
                      styles.tag,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.tagHash, { color: colors.accent }]}>#</Text>
                    <Text style={[styles.tagText, { color: colors.textPrimary }]}>{topic.tag}</Text>
                    <Text style={[styles.tagCount, { color: colors.textMuted }]}>
                      {topic.count}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            {/* Sources spotlight */}
            {sources.length > 0 && (
              <Section
                kicker="YAYINCILAR"
                title="Aktif Kaynaklar"
                colors={colors}
              >
                <View style={{ gap: 8 }}>
                  {sources.slice(0, 8).map((s) => (
                    <View
                      key={s.source_name}
                      style={[styles.sourceRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                    >
                      <View style={[styles.sourceAvatar, { backgroundColor: colors.accent + '18' }]}>
                        <Text style={[styles.sourceInitials, { color: colors.accent }]}>
                          {s.source_name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sourceName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {s.source_name}
                        </Text>
                        <Text style={[styles.sourceMeta, { color: colors.textMuted }]}>
                          {s.article_count} haber
                        </Text>
                      </View>
                      <View style={[styles.livePulse, { backgroundColor: '#10b981' }]} />
                    </View>
                  ))}
                </View>
              </Section>
            )}
          </View>
        </View>

        {/* ─────────────────── PER-CATEGORY BANDS ─────────────────── */}
        {activeCategory === 'tumu' &&
          bands.map(({ meta, items }) => {
            const lead = items[0];
            const rest = items.slice(1, 5);
            return (
              <View key={meta.key} style={{ gap: 14 }}>
                <SectionHeader
                  kicker={meta.label.toUpperCase()}
                  title={getCategorySectionTitle(meta.key)}
                  accent={meta.color}
                  icon={meta.icon}
                  colors={colors}
                  onMore={() => setActiveCategory(meta.key)}
                />
                <View style={[styles.bandRow, { flexDirection: isWide || isMedium ? 'row' : 'column' }]}>
                  {/* Lead */}
                  <DragWrap
                    article={lead.article}
                    style={{ flex: isWide || isMedium ? 1.4 : undefined }}
                    onArticleDrag={setDraggedArticle}
                    onDragEnd={() => setDraggedArticle(null)}
                  >
                  <Pressable
                    onPress={() => openArticle(lead.article)}
                    style={({ pressed }) => [
                      styles.bandLead,
                      {
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                        opacity: pressed ? 0.92 : 1,
                      },
                    ]}
                  >
                    {lead.article.imageUrl && (
                      <Image
                        source={{ uri: proxyImageUrl(lead.article.imageUrl) }}
                        style={styles.bandLeadImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.bandLeadBody}>
                      <Text style={[styles.bandLeadTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                        {lead.article.title}
                      </Text>
                      {!!lead.article.description && (
                        <Text style={[styles.bandLeadDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                          {lead.article.description}
                        </Text>
                      )}
                      <Text style={[styles.bandLeadMeta, { color: colors.textMuted }]}>
                        {lead.article.source.name} • {timeAgo(lead.article.publishedAt)}
                      </Text>
                    </View>
                  </Pressable>
                  </DragWrap>

                  {/* Rest list */}
                  <View style={{ flex: isWide || isMedium ? 1 : undefined, gap: 0 }}>
                    {rest.map((e, i) => (
                      <Pressable
                        key={e.article.id}
                        onPress={() => openArticle(e.article)}
                        style={({ pressed }) => [
                          styles.bandListItem,
                          {
                            borderBottomColor: colors.borderSubtle,
                            borderBottomWidth: i === rest.length - 1 ? 0 : 1,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.bandListAccent, { backgroundColor: meta.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.bandListTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                            {e.article.title}
                          </Text>
                          <Text style={[styles.bandListMeta, { color: colors.textMuted }]} numberOfLines={1}>
                            {e.article.source.name} • {timeAgo(e.article.publishedAt)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}

        {/* ─────────────────── FOOTER CTA ─────────────────── */}
        <View style={[styles.footerCta, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' }]}>
          <Ionicons name="library-outline" size={28} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.footerTitle, { color: colors.textPrimary }]}>
              Daha fazlasını mı arıyorsun?
            </Text>
            <Text style={[styles.footerDesc, { color: colors.textMuted }]}>
              Geçmiş haberleri arşivde kategoriye göre filtrele.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/archive' as any)}
            style={({ pressed }) => [styles.footerBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.footerBtnText}>ARŞİVE GİT</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>
    </ScrollView>
    {isWide && (
      <>
        {!showSocialSidebar && (
          <Pressable
            onPress={() => setSocialOpen(true)}
            style={[
              styles.socialToggle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                right: 18,
              },
            ]}
          >
            <Ionicons name="people-outline" size={18} color={colors.accent} />
          </Pressable>
        )}

        {showSocialSidebar && (
          <View style={styles.socialSidebarSlot}>
            <SocialSidebar
              token={token}
              currentUserId={currentUserId}
              draggedArticle={draggedArticle}
              onClearDrag={() => setDraggedArticle(null)}
              onClose={() => setSocialOpen(false)}
            />
          </View>
        )}
      </>
    )}
    </View>
  );
}

// ─────────────────────── HELPERS ───────────────────────

function getCategoryColor(cat: ContentCategory): string {
  return CATEGORY_META.find((m) => m.key === cat)?.color ?? '#6b7280';
}

function getCategoryLabel(cat: ContentCategory): string {
  return CATEGORY_META.find((m) => m.key === cat)?.label ?? cat;
}

function getCategorySectionTitle(cat: ContentCategory): string {
  switch (cat) {
    case 'Siyaset':   return 'Gündemden Manşetler';
    case 'Ekonomi':   return 'Piyasalardan';
    case 'Spor':      return 'Sahadan';
    case 'Teknoloji': return 'Teknoloji Dünyası';
    case 'Magazin':   return 'Magazin Penceresi';
    case 'Saglik':    return 'Sağlık Haberleri';
    case 'Kultur':    return 'Kültür - Sanat';
    case 'Deprem':    return 'Doğa & Çevre';
    case 'Kaza':      return 'Asayiş';
    default:          return cat;
  }
}

// ─────────────────────── SUB-COMPONENTS ───────────────────────

function DragWrap({
  article,
  style,
  onArticleDrag,
  onDragEnd,
  children,
}: {
  article: ApiArticle;
  style?: any;
  onArticleDrag: (a: ApiArticle) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  // Keep latest callbacks in refs so DOM listeners never go stale
  const articleRef = useRef(article);
  const onArticleDragRef = useRef(onArticleDrag);
  const onDragEndRef = useRef(onDragEnd);
  articleRef.current = article;
  onArticleDragRef.current = onArticleDrag;
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el: HTMLElement | null = wrapRef.current;
    if (!el) return;

    // Set draggable directly on the DOM element (more reliable than React prop)
    el.draggable = true;

    // Images are draggable by default in browsers – disable them so the card
    // drag takes precedence instead of the browser's native image drag ghost.
    const disableImgDrag = () =>
      el.querySelectorAll('img').forEach((img) => { img.draggable = false; });
    disableImgDrag();
    // Re-run if images load after mount
    const mo = new MutationObserver(disableImgDrag);
    mo.observe(el, { childList: true, subtree: true });

    const onDragStart = (e: Event) => {
      const de = e as DragEvent;
      if (de.dataTransfer) {
        de.dataTransfer.effectAllowed = 'copy';
        de.dataTransfer.setData('text/plain', articleRef.current.id);
      }
      onArticleDragRef.current(articleRef.current);
    };
    const onDragEndHandler = () => onDragEndRef.current();
    const onMouseEnter = () => setHovered(true);
    const onMouseLeave = () => setHovered(false);

    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend', onDragEndHandler);
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      mo.disconnect();
      el.removeEventListener('dragstart', onDragStart);
      el.removeEventListener('dragend', onDragEndHandler);
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []); // mount/unmount only; callbacks are stable via refs above

  if (Platform.OS !== 'web') return <View style={style}>{children}</View>;
  return (
    <View ref={wrapRef} style={[style, { position: 'relative', cursor: 'grab' } as any]}>
      {children}
      {hovered && (
        <Pressable
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.62)',
            borderRadius: 7,
            paddingHorizontal: 8,
            paddingVertical: 5,
            zIndex: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
          onPress={() => onArticleDragRef.current(articleRef.current)}
        >
          <Ionicons name="share-social-outline" size={12} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Paylaş</Text>
        </Pressable>
      )}
    </View>
  );
}

function CategoryChip({
  label, icon, active, color, colors, onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  color: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? color : colors.surface,
          borderColor: active ? color : colors.borderSubtle,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon as any} size={14} color={active ? '#fff' : colors.textPrimary} />
      <Text style={[styles.chipText, { color: active ? '#fff' : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function Section({
  kicker, title, colors, children,
}: {
  kicker: string;
  title: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 14 }}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionKicker, { color: colors.accent }]}>{kicker}</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
        <View style={[styles.sectionLine, { backgroundColor: colors.borderSubtle }]} />
      </View>
      {children}
    </View>
  );
}

function SectionHeader({
  kicker, title, accent, icon, colors, onMore,
}: {
  kicker: string;
  title: string;
  accent: string;
  icon: string;
  colors: any;
  onMore?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: accent + '20' }]}>
        <Ionicons name={icon as any} size={16} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionKicker, { color: accent }]}>{kicker}</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {onMore && (
        <Pressable onPress={onMore} style={({ pressed }) => [styles.moreBtn, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.moreText, { color: accent }]}>TÜMÜ</Text>
          <Ionicons name="arrow-forward" size={12} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────── STYLES ───────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 64, gap: 24 },
  webContent: { width: '100%' as any, maxWidth: 1280, alignSelf: 'center', paddingTop: 28 },

  // Ticker
  tickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    height: 38,
  },
  tickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: '100%' as any,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  tickerDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff',
  },
  tickerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  tickerTrack: { flex: 1, overflow: 'hidden', height: '100%' as any, justifyContent: 'center' },
  tickerItem: {},
  tickerText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Header
  header: { gap: 8 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  kickerText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  headerDate: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  subtitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },

  // Chips
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },

  // Hero
  heroWrap: { gap: 16 },
  heroMain: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    minHeight: 380,
    position: 'relative',
  },
  heroMainImage: { ...StyleSheet.absoluteFillObject, width: '100%' as any, height: '100%' as any },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  heroMainContent: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 24,
    gap: 10,
  },
  heroCatPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  heroCatText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroMainTitle: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, lineHeight: 32 },
  heroMainDesc: { color: '#E5E7EB', fontSize: 14, lineHeight: 20 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroMetaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroMetaDot: { color: '#9CA3AF', fontSize: 12 },

  heroSideStack: { gap: 14 },
  heroSideCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroSideImage: { width: '100%' as any, height: 130 },
  heroSideBody: { padding: 14, gap: 8 },
  heroSideTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  heroSideMeta: { fontSize: 11, fontWeight: '600' },
  heroSideMetaRow: { gap: 4 },
  miniCatPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  miniCatText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  sectionTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4, marginTop: 2 },
  sectionLine: { flex: 1, height: 1, marginLeft: 12 },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  moreText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

  // Editor's grid
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  gridImage: { width: '100%' as any, height: 160 },
  gridBody: { padding: 14, gap: 8 },
  gridTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  gridDesc: { fontSize: 12, lineHeight: 17 },
  gridMeta: { fontSize: 11, fontWeight: '600' },
  gridMetaRow: { gap: 4 },

  // Split row
  splitRow: { gap: 24 },

  // Most read
  rankRow: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  rankNumber: { fontSize: 30, fontWeight: '900', minWidth: 44, letterSpacing: -1 },
  rankTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  rankMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  rankMeta: { fontSize: 11, fontWeight: '600' },

  // Tag cloud
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagHash: { fontSize: 13, fontWeight: '900' },
  tagText: { fontSize: 12, fontWeight: '700' },
  tagCount: { fontSize: 10, fontWeight: '700' },

  // Sources
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sourceAvatar: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sourceInitials: { fontSize: 13, fontWeight: '900' },
  sourceName: { fontSize: 13, fontWeight: '800' },
  sourceMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  livePulse: { width: 8, height: 8, borderRadius: 4 },

  // Per-category band
  bandRow: { gap: 16 },
  bandLead: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bandLeadImage: { width: '100%' as any, height: 220 },
  bandLeadBody: { padding: 16, gap: 8 },
  bandLeadTitle: { fontSize: 19, fontWeight: '900', lineHeight: 25, letterSpacing: -0.3 },
  bandLeadDesc: { fontSize: 13, lineHeight: 19 },
  bandLeadMeta: { fontSize: 11, fontWeight: '600' },

  bandListItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  bandListAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  bandListTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  bandListMeta: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  // States
  loading: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '600' },
  empty: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontWeight: '600' },

  // Footer CTA
  footerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  footerTitle: { fontSize: 15, fontWeight: '900' },
  footerDesc: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  footerBtnText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  socialToggle: {
    position: 'absolute',
    top: 22,
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  socialSidebarSlot: { width: 260, flexShrink: 0, alignSelf: 'stretch' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
});

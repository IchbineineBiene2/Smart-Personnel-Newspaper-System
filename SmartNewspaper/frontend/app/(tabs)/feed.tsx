import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useBookmarks } from '@/hooks/useBookmarks';
import { useApiNews } from '@/hooks/useNews';
import { usePublisherState } from '@/hooks/usePublisherState';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  { key: 'Teknoloji', icon: 'laptop-outline',       color: '#6254FF' },
  { key: 'Spor',      icon: 'trophy-outline',        color: '#10b981' },
  { key: 'Ekonomi',   icon: 'trending-up-outline',   color: '#f59e0b' },
  { key: 'Sağlık',    icon: 'heart-outline',         color: '#ef4444' },
  { key: 'Siyaset',   icon: 'business-outline',      color: '#3b82f6' },
  { key: 'Dünya',     icon: 'globe-outline',         color: '#8b5cf6' },
  { key: 'Bilim',     icon: 'flask-outline',         color: '#06b6d4' },
  { key: 'Kültür',    icon: 'color-palette-outline', color: '#ec4899' },
  { key: 'Genel',     icon: 'newspaper-outline',     color: '#6b7280' },
];

const LANG_META: Record<string, { label: string; flag: string }> = {
  tr: { label: 'Türkçe',    flag: '🇹🇷' },
  en: { label: 'İngilizce', flag: '🇬🇧' },
  de: { label: 'Almanca',   flag: '🇩🇪' },
  fr: { label: 'Fransızca', flag: '🇫🇷' },
  es: { label: 'İspanyolca',flag: '🇪🇸' },
  ar: { label: 'Arapça',    flag: '🇸🇦' },
};

const PER_PAGE_OPTIONS = [20, 40, 60];

// ── Component ──────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const router   = useRouter();
  const { colors } = useTheme();
  const { preferredCategories, preferredNewsLanguages } = usePreferences();
  const { followedIds } = usePublisherState();
  const { savedIds, toggleSaved } = useBookmarks();
  const isWeb = Platform.OS === 'web';

  const [viewMode,   setViewMode]   = useState<'personal' | 'followed'>('personal');
  const [selCats,    setSelCats]    = useState<string[]>([]);
  const [selLangs,   setSelLangs]   = useState<string[]>([]);
  const [selSources, setSelSources] = useState<string[]>([]);
  const [perPage,    setPerPage]    = useState(40);
  const [page,       setPage]       = useState(1);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const requestedLanguages = viewMode === 'followed'
    ? selLangs
    : (selLangs.length > 0 ? selLangs : preferredNewsLanguages);
  const { articles, loading } = useApiNews(requestedLanguages);

  const sidebarAnim = useRef(new Animated.Value(1)).current;
  const entrance    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);

  const toggleSidebar = () => {
    const toValue = sidebarVisible ? 0 : 1;
    Animated.timing(sidebarAnim, { toValue, duration: 260, useNativeDriver: true }).start();
    setSidebarVisible(!sidebarVisible);
  };

  const visibleArticles = articles;

  // ── Derived filter data ────────────────────────────────────────────────────

  const availableLangs = useMemo(() => {
    const langs = new Set<string>();
    articles.forEach((a) => { if ((a as any).language) langs.add((a as any).language); });
    Object.keys(LANG_META).forEach((code) => langs.add(code));
    return Array.from(langs).sort();
  }, [articles]);

  const availableSources = useMemo(() => {
    const seen = new Map<string, number>();
    visibleArticles.forEach((a) => {
      const n = a.source.name;
      seen.set(n, (seen.get(n) ?? 0) + 1);
    });
    return Array.from(seen.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([name]) => name);
  }, [visibleArticles]);

  // ── Filtered + paginated feed ──────────────────────────────────────────────

  const { feedItems, totalCount } = useMemo(() => {
    let ranked = visibleArticles.map((article, index) => {
      const category = mapToContentCategory(article.category, article.title, article.description);
      return { article, category, index };
    });

    if (viewMode === 'followed') {
      if (followedIds.length === 0) {
        ranked = [];
      } else {
        const followedSet = new Set(followedIds);
        ranked = ranked.filter((r) => followedSet.has(getPublisherIdFromSourceName(r.article.source.name)));
        if (selCats.length > 0) {
          ranked = ranked.filter((r) => selCats.includes(r.category));
        }
      }
    } else {
      // personal mode
      const effectiveCats = selCats.length > 0 ? selCats : preferredCategories;
      if (effectiveCats.length === 0) {
        ranked = [];
      } else {
        const catSet = new Set(effectiveCats);
        ranked = ranked.filter((r) => catSet.has(r.category));
      }
    }
    if (selLangs.length > 0) {
      ranked = ranked.filter((r) => selLangs.includes((r.article as any).language ?? ''));
    }
    if (selSources.length > 0) {
      ranked = ranked.filter((r) => selSources.includes(r.article.source.name));
    }

    const totalCount = ranked.length;
    const start = (page - 1) * perPage;
    return { feedItems: ranked.slice(start, start + perPage), totalCount };
  }, [visibleArticles, viewMode, selCats, selLangs, selSources, followedIds, preferredCategories, page, perPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const activeFilterCount = selCats.length + selLangs.length + selSources.length;

  const resetFilters = () => {
    setSelCats([]);
    setSelLangs([]);
    setSelSources([]);
    setPage(1);
  };

  const toggleCat    = (c: string) => { setPage(1); setSelCats((p)    => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]); };
  const toggleLang   = (l: string) => { setPage(1); setSelLangs((p)   => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]); };
  const toggleSource = (s: string) => { setPage(1); setSelSources((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]); };

  // ── Article helpers ───────────────────────────────────────────────────────

  function buildPublisherLogo(source: { name?: string; url?: string } | undefined) {
    if (source?.url) {
      try {
        const host = new URL(source.url).origin;
        return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(host)}`;
      } catch { /* fallthrough */ }
    }
    try {
      const guessed = `https://${String(source?.name ?? '').toLowerCase().replace(/\s+/g, '')}.com`;
      return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(guessed)}`;
    } catch { return undefined; }
  }

  const openArticle = (item: typeof feedItems[number]) => {
    router.push({
      pathname: '/news/[id]',
      params: {
        id: item.article.id,
        title: item.article.title,
        summary: item.article.description,
        imageUrl: item.article.imageUrl,
        source: item.article.source.name,
        publishedAt: item.article.publishedAt,
        category: item.category,
      },
    });
  };

  const shareArticle = async (title: string, url: string) => {
    await Share.share({ title, message: `${title}\n\n${url}`, url });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View
        style={[styles.header, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Kişisel <Text style={{ color: colors.accent, fontStyle: 'italic' }}>Akış</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Tercihlerinizden öğrenen, hızlı gezilebilir haber zaman tüneli.
          </Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {(['personal', 'followed'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => { setViewMode(m); setPage(1); }}
                style={[styles.tabBtn, viewMode === m && { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.tabText, { color: viewMode === m ? '#fff' : colors.textMuted }]}>
                  {m === 'personal' ? 'Kişisel Akış' : 'Takip Edilenler'}
                </Text>
              </Pressable>
            ))}
          </View>

          {isWeb && (
            <Pressable
              onPress={toggleSidebar}
              style={[styles.sidebarToggle, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
            >
              <Ionicons
                name={sidebarVisible ? 'options-outline' : 'options'}
                size={18}
                color={activeFilterCount > 0 ? colors.accent : colors.textMuted}
              />
              {activeFilterCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Body */}
      {loading && feedItems.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {requestedLanguages.length > 0 ? 'Dil tercihlerinize uygun haberler yükleniyor...' : 'Akış hazırlanıyor...'}
          </Text>
        </View>
      ) : (
        <Animated.View style={[styles.feedWrap, isWeb && sidebarVisible && styles.webLayout, { opacity: entrance }]}>

          {/* Feed column */}
          <View style={styles.feedColumn}>
            {/* Result summary bar */}
            <View style={[styles.resultBar, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.resultText, { color: colors.textMuted }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{totalCount}</Text> haber
                {activeFilterCount > 0 && (
                  <Text style={{ color: colors.accent }}> · {activeFilterCount} filtre aktif</Text>
                )}
              </Text>
              {activeFilterCount > 0 && (
                <Pressable onPress={resetFilters}>
                  <Text style={[styles.resetBtn, { color: colors.accent }]}>Temizle</Text>
                </Pressable>
              )}
            </View>

            {feedItems.length === 0 ? (
              <View style={[styles.emptyState, { borderColor: colors.borderSubtle }]}>
                {viewMode === 'personal' && preferredCategories.length === 0 && selCats.length === 0 ? (
                  <>
                    <Ionicons name="options-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Kategori seçilmedi</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                      Kişisel akışınızı görmek için Profil → Tercihler sayfasından ilgilendiğiniz kategorileri seçin.
                    </Text>
                    <Pressable onPress={() => router.push('/(tabs)/profile' as any)} style={[styles.emptyBtn, { backgroundColor: colors.accent }]}>
                      <Text style={styles.emptyBtnText}>Tercihlere Git</Text>
                    </Pressable>
                  </>
                ) : viewMode === 'followed' && followedIds.length === 0 ? (
                  <>
                    <Ionicons name="people-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Takip edilen yayıncı yok</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                      Yayıncılar sayfasından haber kaynaklarını takip ederek bu akışı aktifleştirin.
                    </Text>
                    <Pressable onPress={() => router.push('/(tabs)/publisherpage' as any)} style={[styles.emptyBtn, { backgroundColor: colors.accent }]}>
                      <Text style={styles.emptyBtnText}>Yayıncıları Keşfet</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Ionicons name="filter-outline" size={36} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sonuç bulunamadı</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>Filtreleri değiştirerek tekrar deneyin.</Text>
                    <Pressable onPress={resetFilters} style={[styles.emptyBtn, { backgroundColor: colors.accent }]}>
                      <Text style={styles.emptyBtnText}>Filtreleri Sıfırla</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.feed}>
                {feedItems.map((item, index) => {
                  const article = item.article;
                  const image   = proxyImageUrl(article.imageUrl);
                  const isSaved = savedIds.includes(article.id);
                  const logo    = buildPublisherLogo(article.source);
                  const catMeta = ALL_CATEGORIES.find((c) => c.key === item.category);

                  return (
                    <Pressable
                      key={article.id}
                      onPress={() => openArticle(item)}
                      style={({ pressed }) => [
                        styles.post,
                        { backgroundColor: pressed ? colors.surfaceHigh : colors.surface, borderColor: colors.borderSubtle },
                      ]}
                    >
                      {logo ? (
                        <Image source={{ uri: logo }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: colors.accent + '18' }]}>
                          <Text style={[styles.avatarText, { color: colors.accent }]}>
                            {article.source.name.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.postBody}>
                        <View style={styles.postMeta}>
                          <Text style={[styles.source, { color: colors.textPrimary }]} numberOfLines={1}>
                            {article.source.name}
                          </Text>
                          <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
                          <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(article.publishedAt)}</Text>
                          <View style={[styles.categoryChip, { backgroundColor: (catMeta?.color ?? colors.accent) + '1A' }]}>
                            {catMeta && <Ionicons name={catMeta.icon as any} size={10} color={catMeta.color} />}
                            <Text style={[styles.categoryText, { color: catMeta?.color ?? colors.accent }]}>{item.category}</Text>
                          </View>
                          {(article as any).language && (
                            <Text style={[styles.langTag, { color: colors.textMuted }]}>
                              {LANG_META[(article as any).language]?.flag ?? '🌐'}
                            </Text>
                          )}
                        </View>

                        <Text style={[styles.postTitle, { color: colors.textPrimary }]}>{article.title}</Text>
                        {!!article.description && (
                          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                            {article.description}
                          </Text>
                        )}
                        {!!image && (
                          <Image source={{ uri: image }} style={[styles.postImage, { backgroundColor: colors.surfaceHigh }]} resizeMode="cover" />
                        )}

                        <View style={styles.actions}>
                          <Pressable style={styles.action} onPress={() => toggleSaved(article.id)}>
                            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={isSaved ? colors.accent : colors.textMuted} />
                            <Text style={[styles.actionText, { color: isSaved ? colors.accent : colors.textMuted }]}>Kaydet</Text>
                          </Pressable>
                          <Pressable style={styles.action} onPress={() => shareArticle(article.title, (article as any).url ?? '')}>
                            <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
                            <Text style={[styles.actionText, { color: colors.textMuted }]}>Paylaş</Text>
                          </Pressable>
                          <View style={styles.action}>
                            <Ionicons name="pulse-outline" size={18} color={colors.textMuted} />
                            <Text style={[styles.actionText, { color: colors.textMuted }]}>#{(page - 1) * perPage + index + 1}</Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: page === 1 ? 0.4 : 1 }]}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
                </Pressable>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPage(p)}
                      style={[styles.pageBtn, { backgroundColor: page === p ? colors.accent : colors.surface, borderColor: page === p ? colors.accent : colors.borderSubtle }]}
                    >
                      <Text style={[styles.pageBtnText, { color: page === p ? '#fff' : colors.textSecondary }]}>{p}</Text>
                    </Pressable>
                  );
                })}

                {totalPages > 7 && <Text style={[styles.pageBtnText, { color: colors.textMuted }]}>···</Text>}

                <Pressable
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle, opacity: page === totalPages ? 0.4 : 1 }]}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
                </Pressable>
              </View>
            )}
          </View>

          {/* Sidebar */}
          {isWeb && sidebarVisible && (
            <View style={[styles.sidebar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>

              {/* Header */}
              <View style={styles.sidebarHeader}>
                <View style={styles.sidebarTitleRow}>
                  <Ionicons name="options-outline" size={16} color={colors.accent} />
                  <Text style={[styles.sidebarTitle, { color: colors.textPrimary }]}>Filtreler</Text>
                </View>
                {activeFilterCount > 0 && (
                  <Pressable onPress={resetFilters} style={[styles.clearBtn, { backgroundColor: colors.accent + '18' }]}>
                    <Text style={[styles.clearBtnText, { color: colors.accent }]}>Temizle</Text>
                  </Pressable>
                )}
              </View>

              {/* Active filter count */}
              {activeFilterCount > 0 && (
                <View style={[styles.activeFilterBanner, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '30' }]}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
                  <Text style={[styles.activeFilterText, { color: colors.accent }]}>
                    {activeFilterCount} filtre aktif · {totalCount} sonuç
                  </Text>
                </View>
              )}

              {/* ── Kategoriler ── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KATEGORİLER</Text>
                  {selCats.length > 0 && (
                    <Pressable onPress={() => setSelCats([])}>
                      <Text style={[styles.sectionClear, { color: colors.accent }]}>Temizle</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.chipGrid}>
                  {ALL_CATEGORIES.map((cat) => {
                    const active = selCats.includes(cat.key);
                    return (
                      <Pressable
                        key={cat.key}
                        onPress={() => toggleCat(cat.key)}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: active ? cat.color + '22' : colors.surfaceInput,
                            borderColor: active ? cat.color + '60' : colors.borderSubtle,
                          },
                        ]}
                      >
                        <Ionicons name={cat.icon as any} size={13} color={active ? cat.color : colors.textMuted} />
                        <Text style={[styles.catChipText, { color: active ? cat.color : colors.textSecondary }]}>
                          {cat.key}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              {/* ── Diller ── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DİL</Text>
                  {selLangs.length > 0 && (
                    <Pressable onPress={() => setSelLangs([])}>
                      <Text style={[styles.sectionClear, { color: colors.accent }]}>Temizle</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.langList}>
                  {availableLangs.length === 0
                    ? Object.entries(LANG_META).map(([code, meta]) => (
                        <LangRow
                          key={code}
                          code={code}
                          meta={meta}
                          active={selLangs.includes(code)}
                          onPress={() => toggleLang(code)}
                          colors={colors}
                        />
                      ))
                    : availableLangs.map((code) => {
                        const meta = LANG_META[code] ?? { label: code.toUpperCase(), flag: '🌐' };
                        return (
                          <LangRow
                            key={code}
                            code={code}
                            meta={meta}
                            active={selLangs.includes(code)}
                            onPress={() => toggleLang(code)}
                            colors={colors}
                          />
                        );
                      })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              {/* ── Kaynaklar ── */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KAYNAKLAR</Text>
                  {selSources.length > 0 && (
                    <Pressable onPress={() => setSelSources([])}>
                      <Text style={[styles.sectionClear, { color: colors.accent }]}>Temizle</Text>
                    </Pressable>
                  )}
                </View>
                <View style={styles.sourceList}>
                  {availableSources.map((src) => {
                    const active = selSources.includes(src);
                    return (
                      <Pressable
                        key={src}
                        onPress={() => toggleSource(src)}
                        style={[
                          styles.sourceRow,
                          {
                            backgroundColor: active ? colors.accent + '14' : 'transparent',
                            borderColor: active ? colors.accent + '40' : colors.borderSubtle,
                          },
                        ]}
                      >
                        <View style={[styles.sourceDot, { backgroundColor: active ? colors.accent : colors.textMuted + '50' }]} />
                        <Text style={[styles.sourceText, { color: active ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>
                          {src}
                        </Text>
                        {active && <Ionicons name="checkmark" size={12} color={colors.accent} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

              {/* ── Sayfa başı haber ── */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SAYFA BAŞI HABER</Text>
                <View style={styles.perPageRow}>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => { setPerPage(n); setPage(1); }}
                      style={[
                        styles.perPageBtn,
                        {
                          backgroundColor: perPage === n ? colors.accent : colors.surfaceInput,
                          borderColor: perPage === n ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.perPageText, { color: perPage === n ? '#fff' : colors.textSecondary }]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* ── Sayfalama ── */}
              {totalPages > 1 && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SAYFA</Text>
                    <View style={styles.sidebarPagination}>
                      <Pressable
                        onPress={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={[styles.sidePageBtn, { borderColor: colors.borderSubtle, opacity: page === 1 ? 0.4 : 1 }]}
                      >
                        <Ionicons name="chevron-back" size={14} color={colors.textPrimary} />
                      </Pressable>
                      <Text style={[styles.pageIndicator, { color: colors.textPrimary }]}>
                        {page} / {totalPages}
                      </Text>
                      <Pressable
                        onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={[styles.sidePageBtn, { borderColor: colors.borderSubtle, opacity: page === totalPages ? 0.4 : 1 }]}
                      >
                        <Ionicons name="chevron-forward" size={14} color={colors.textPrimary} />
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LangRow({ code, meta, active, onPress, colors }: {
  code: string; meta: { label: string; flag: string };
  active: boolean; onPress: () => void; colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.langRow,
        {
          backgroundColor: active ? colors.accent + '14' : 'transparent',
          borderColor: active ? colors.accent + '40' : colors.borderSubtle,
        },
      ]}
    >
      <Text style={styles.langFlag}>{meta.flag}</Text>
      <Text style={[styles.langLabel, { color: active ? colors.textPrimary : colors.textSecondary }]}>{meta.label}</Text>
      <View style={[styles.langToggle, { borderColor: active ? colors.accent : colors.borderSubtle, backgroundColor: active ? colors.accent : 'transparent' }]}>
        {active && <Ionicons name="checkmark" size={10} color="#fff" />}
      </View>
    </Pressable>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} gün`;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 56, gap: 20 },
  webContent: { width: '100%' as any, maxWidth: 1320, alignSelf: 'center', paddingTop: 36 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  tabRow: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: 14, borderWidth: 1 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tabText: { fontSize: 12, fontWeight: '800' },
  sidebarToggle: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  filterBadge: { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },

  // Loading / empty
  loading: { paddingVertical: 72, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '700' },
  emptyState: { paddingVertical: 56, alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 24, borderStyle: 'dashed', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptyDesc: { fontSize: 13, textAlign: 'center' },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Layout
  feedWrap: { flexDirection: 'column', gap: 16 },
  webLayout: { flexDirection: 'row', gap: 22, alignItems: 'flex-start' as any },
  feedColumn: { flex: 1, minWidth: 0, gap: 14 },

  // Result bar
  resultBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1 },
  resultText: { fontSize: 13, fontWeight: '600' },
  resetBtn: { fontSize: 12, fontWeight: '800' },

  // Feed cards
  feed: { gap: 14 },
  post: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 24, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '900' },
  avatarImage: { width: 44, height: 44, borderRadius: 10 },
  postBody: { flex: 1, minWidth: 0, gap: 9 },
  postMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  source: { fontSize: 13, fontWeight: '900', maxWidth: 160 },
  dot: { fontSize: 12 },
  time: { fontSize: 12, fontWeight: '700' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  langTag: { fontSize: 14 },
  postTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  description: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
  postImage: { width: '100%', height: 280, borderRadius: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, fontWeight: '800' },

  // Pagination
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8 },
  pageBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageBtnText: { fontSize: 13, fontWeight: '700' },

  // Sidebar
  sidebar: { width: 300, borderWidth: 1, borderRadius: 24, overflow: 'hidden', position: 'sticky' as any, top: 20 },
  sidebarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingBottom: 14 },
  sidebarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sidebarTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.2 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  clearBtnText: { fontSize: 11, fontWeight: '800' },
  activeFilterBanner: { marginHorizontal: 14, marginBottom: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeFilterText: { fontSize: 11, fontWeight: '700', flex: 1 },
  divider: { height: 1, marginHorizontal: 16 },
  section: { padding: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionClear: { fontSize: 10, fontWeight: '800' },

  // Category chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  catChipText: { fontSize: 12, fontWeight: '700' },

  // Language rows
  langList: { gap: 6 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  langFlag: { fontSize: 18 },
  langLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  langToggle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // Source list
  sourceList: { gap: 4 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  sourceDot: { width: 7, height: 7, borderRadius: 4 },
  sourceText: { flex: 1, fontSize: 12, fontWeight: '600' },

  // Per-page
  perPageRow: { flexDirection: 'row', gap: 8 },
  perPageBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  perPageText: { fontSize: 13, fontWeight: '800' },

  // Sidebar pagination
  sidebarPagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  sidePageBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pageIndicator: { fontSize: 13, fontWeight: '800' },
});

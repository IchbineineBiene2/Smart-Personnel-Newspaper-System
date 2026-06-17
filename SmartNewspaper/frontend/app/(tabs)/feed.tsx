import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { useBookmarks } from '@/hooks/useBookmarks';
import { useApiNews } from '@/hooks/useNews';
import { usePublisherState } from '@/hooks/usePublisherState';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { getUserProfile } from '@/services/auth';
import { buildPublisherDataset, getPublisherIdFromSourceName } from '@/services/publisherProfiles';
import { CurrencyWidget } from '@/components/widgets/CurrencyWidget';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { LoadingGreetingOverlay } from '@/components/ui/LoadingGreetingOverlay';

// ── Constants ──────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  { key: 'Siyaset',   icon: 'business-outline',      color: '#3b82f6' },
  { key: 'Dünya',     icon: 'globe-outline',         color: '#8b5cf6' },
  { key: 'Ekonomi',   icon: 'trending-up-outline',   color: '#f59e0b' },
  { key: 'Spor',      icon: 'trophy-outline',        color: '#10b981' },
  { key: 'Teknoloji', icon: 'laptop-outline',        color: '#6254FF' },
  { key: 'Bilim',     icon: 'flask-outline',         color: '#06b6d4' },
  { key: 'Sağlık',    icon: 'heart-outline',         color: '#ef4444' },
  { key: 'Eğitim',    icon: 'school-outline',        color: '#0ea5e9' },
  { key: 'Çevre',     icon: 'leaf-outline',          color: '#22c55e' },
  { key: 'Kültür',    icon: 'color-palette-outline', color: '#ec4899' },
  { key: 'Magazin',   icon: 'star-outline',          color: '#d946ef' },
  { key: 'Asayiş',    icon: 'shield-checkmark-outline', color: '#dc2626' },
  { key: 'Kaza',      icon: 'warning-outline',       color: '#f97316' },
  { key: 'Deprem',    icon: 'pulse-outline',         color: '#ef4444' },
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
type FeedTool = 'currency' | 'weather';
type SearchSuggestion = {
  id: string;
  title: string;
  meta: string;
  kind: 'Haber' | 'Site';
  onPress: () => void;
};

function normalizeSearchText(value: string): string {
  if (!value) return '';
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  const router   = useRouter();
  const { colors } = useTheme();
  const { preferredCategories, preferredNewsLanguages, customTags, reload: reloadPreferences } = usePreferences();
  const { followedIds, reload: reloadPublisherState } = usePublisherState();
  const [profileName, setProfileName] = useState('Kullanici');

  useFocusEffect(
    useCallback(() => {
      reloadPreferences();
      reloadPublisherState();
      getUserProfile().then((profile) => {
        const name = profile?.name?.trim();
        setProfileName(name || 'Kullanici');
      });
    }, [reloadPreferences, reloadPublisherState])
  );
  const { savedIds, toggleSaved } = useBookmarks();
  const isWeb = Platform.OS === 'web';

  const [viewMode,   setViewMode]   = useState<'personal' | 'followed'>('personal');
  const [selCats,    setSelCats]    = useState<string[]>([]);
  const [selLangs,   setSelLangs]   = useState<string[]>([]);
  const [selSources, setSelSources] = useState<string[]>([]);
  const [selCustomTags, setSelCustomTags] = useState<string[]>([]);
  const [perPage,    setPerPage]    = useState(40);
  const [page,       setPage]       = useState(1);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTools, setActiveTools] = useState<FeedTool[]>([]);
  const requestedLanguages = viewMode === 'followed'
    ? selLangs
    : (selLangs.length > 0 ? selLangs : preferredNewsLanguages);
  const { articles, loading: mainLoading } = useApiNews(requestedLanguages);

  const [customTagArticles, setCustomTagArticles] = useState<ApiArticle[]>([]);
  const [backendSuggestions, setBackendSuggestions] = useState<ApiArticle[]>([]);
  const [customTagsLoading, setCustomTagsLoading] = useState(false);

  const loading = mainLoading || customTagsLoading;

  // Fetch articles from backend database for all user custom tags when in personal feed mode,
  // or specifically selected tags.
  useEffect(() => {
    const tagsToFetch = viewMode === 'personal'
      ? (selCustomTags.length > 0 ? selCustomTags : customTags)
      : selCustomTags;

    if (!tagsToFetch || tagsToFetch.length === 0) {
      setCustomTagArticles([]);
      return;
    }

    let active = true;
    setCustomTagsLoading(true);

    const fetchTagArticles = async () => {
      try {
        const promises = tagsToFetch.map(async (tag) => {
          const cleanTag = tag.startsWith('#') ? tag.substring(1) : tag;
          const response = await fetch(`http://localhost:3000/api/news/search?q=${encodeURIComponent(cleanTag)}&limit=50`);
          if (!response.ok) return [];
          const data = await response.json();
          return (data.articles || []) as ApiArticle[];
        });

        const results = await Promise.all(promises);
        if (!active) return;

        // Flatten and deduplicate
        const seen = new Set<string>();
        const flat: ApiArticle[] = [];
        results.flat().forEach((art) => {
          if (!seen.has(art.id)) {
            seen.add(art.id);
            flat.push(art);
          }
        });

        setCustomTagArticles(flat);
      } catch (err) {
        console.error('Failed to fetch custom tag articles:', err);
      } finally {
        if (active) setCustomTagsLoading(false);
      }
    };

    fetchTagArticles();

    return () => {
      active = false;
    };
  }, [viewMode, customTags, selCustomTags]);

  // Debounced search suggestions from backend database
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setBackendSuggestions([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/news/search?q=${encodeURIComponent(query)}&limit=10`);
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setBackendSuggestions(data.articles || []);
        }
      } catch (err) {
        console.error('Error fetching search suggestions:', err);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const drawerAnim = useRef(new Animated.Value(320)).current;
  const [drawerRendered, setDrawerRendered] = useState(false);
  const entrance    = useRef(new Animated.Value(0)).current;

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const filterExpandAnim = useRef(new Animated.Value(1)).current;

  const toggleFilters = () => {
    const nextState = !isFiltersExpanded;
    setIsFiltersExpanded(nextState);
    Animated.timing(filterExpandAnim, {
      toValue: nextState ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const filterMaxHeight = filterExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2000],
  });

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, []);

  const toggleSidebarDrawer = (open: boolean) => {
    if (open) {
      setDrawerRendered(true);
      setSidebarVisible(true);
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: 320,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setDrawerRendered(false);
        setSidebarVisible(false);
      });
    }
  };

  const visibleArticles = useMemo(() => {
    if (customTagArticles.length === 0) return articles;
    const seen = new Set<string>();
    const merged: ApiArticle[] = [];

    [...customTagArticles, ...articles].forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    });

    return merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [articles, customTagArticles]);

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

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (query.length < 2) return [];

    const sourceArticles = backendSuggestions.length > 0 ? backendSuggestions : articles;

    const articleMatches: SearchSuggestion[] = sourceArticles
      .filter((article) => {
        const category = mapToContentCategory(article.category, article.title, article.description);
        const haystack = normalizeSearchText(`${article.title} ${article.description} ${article.source.name} ${category}`);
        const cleanQuery = normalizeSearchText(query);
        return haystack.includes(cleanQuery);
      })
      .slice(0, 4)
      .map((article) => ({
        id: `article-${article.id}`,
        title: article.title,
        meta: article.source.name,
        kind: 'Haber',
        onPress: () => router.push({ pathname: '/news/[id]', params: { id: article.id } }),
      }));

    const publisherMatches: SearchSuggestion[] = buildPublisherDataset(articles).publishers
      .filter((publisher) => {
        const haystack = normalizeSearchText(`${publisher.name} ${publisher.category} ${publisher.description}`);
        const cleanQuery = normalizeSearchText(query);
        return haystack.includes(cleanQuery);
      })
      .slice(0, 3)
      .map((publisher) => ({
        id: `publisher-${publisher.id}`,
        title: publisher.name,
        meta: publisher.category,
        kind: 'Site',
        onPress: () => router.push(`/publisherprofile?id=${encodeURIComponent(publisher.id)}` as any),
      }));

    return [...articleMatches, ...publisherMatches].slice(0, 6);
  }, [articles, backendSuggestions, router, searchQuery]);

  // ── Filtered + paginated feed ──────────────────────────────────────────────

  const { feedItems, totalCount } = useMemo(() => {
    const hasCustomTags = customTags && customTags.length > 0;

    let ranked = visibleArticles.map((article, index) => {
      const category = mapToContentCategory(article.category, article.title, article.description);
      let isCustomTagMatch = false;
      let matchedCustomTags: string[] = [];
      
      if (hasCustomTags) {
        const articleText = normalizeSearchText(`${article.title} ${article.description} ${article.source.name} ${category}`);
        matchedCustomTags = customTags.filter((tag) => {
          const cleanTag = normalizeSearchText(tag.startsWith('#') ? tag.substring(1) : tag);
          return articleText.includes(cleanTag);
        });
        isCustomTagMatch = matchedCustomTags.length > 0;
      }
      
      return { article, category, index, isCustomTagMatch, matchedCustomTags };
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
    } else if (viewMode === 'personal') {
      // personal mode
      const effectiveCats = selCats.length > 0 ? selCats : preferredCategories;
      const catSet = new Set(effectiveCats);
      
      ranked = ranked.filter((r) => {
        const matchesCategory = effectiveCats.length === 0 ? false : catSet.has(r.category);
        return matchesCategory || r.isCustomTagMatch;
      });
      
      if (effectiveCats.length === 0 && !hasCustomTags) {
        ranked = [];
      }
    } else {
      // all mode
      if (selCats.length > 0) {
        ranked = ranked.filter((r) => selCats.includes(r.category));
      }
    }
    
    if (selCustomTags.length > 0) {
      ranked = ranked.filter((r) => selCustomTags.some(tag => r.matchedCustomTags.includes(tag)));
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
  }, [visibleArticles, viewMode, selCats, selLangs, selSources, selCustomTags, followedIds, preferredCategories, customTags, page, perPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const activeFilterCount = selCats.length + selLangs.length + selSources.length + selCustomTags.length;

  const resetFilters = () => {
    setSelCats([]);
    setSelLangs([]);
    setSelSources([]);
    setSelCustomTags([]);
    setPage(1);
  };

  const toggleCat    = (c: string) => { setPage(1); setSelCats((p)    => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]); };
  const toggleLang   = (l: string) => { setPage(1); setSelLangs((p)   => p.includes(l) ? p.filter((x) => x !== l) : [...p, l]); };
  const toggleSource = (s: string) => { setPage(1); setSelSources((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]); };
  const toggleCustomTag = (t: string) => { setPage(1); setSelCustomTags((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]); };

  // ── Article helpers ───────────────────────────────────────────────────────

  function buildPublisherLogo(source: { name?: string; url?: string; logoUrl?: string } | undefined) {
    if (source?.logoUrl) return source.logoUrl;
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
        url: item.article.url,
        publishedAt: item.article.publishedAt,
        category: item.category,
      },
    });
  };

  const shareArticle = async (title: string, url: string) => {
    await Share.share({ title, message: `${title}\n\n${url}`, url });
  };

  const openSearch = () => {
    setSearchFocused(false);
    const query = searchQuery.trim();
    if (query) {
      router.push({ pathname: '/(tabs)/search', params: { q: query } } as any);
      return;
    }
    router.push('/(tabs)/search' as any);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, isWeb && styles.webContent]}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <Animated.View
        style={[styles.header, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Günaydın, <Text style={{ color: colors.accent, fontStyle: 'italic' }}>{profileName}.</Text>
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Tercihlerinizden öğrenen, hızlı gezilebilir haber zaman tüneli.
          </Text>
        </View>

        <View style={styles.searchArea}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.accent + '55' }]}>
            <Ionicons name="search-outline" size={17} color={colors.textPrimary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => {
                setSearchFocused(true);
                if (!isWeb) openSearch();
              }}
              onBlur={() => {
                setTimeout(() => setSearchFocused(false), 120);
              }}
              onSubmitEditing={openSearch}
              returnKeyType="search"
              placeholder="Özel haber ağınızda keşfe çıkın"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
          </View>

          {searchFocused && searchQuery.trim().length >= 2 && (
            <View style={[styles.searchSuggestions, { backgroundColor: colors.surface, borderColor: colors.accent + '45' }]}>
              {searchSuggestions.length > 0 ? (
                searchSuggestions.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSearchQuery('');
                      setSearchFocused(false);
                      item.onPress();
                    }}
                    style={({ pressed }) => [
                      styles.searchSuggestionRow,
                      { backgroundColor: pressed ? colors.surfaceHigh : 'transparent' },
                    ]}
                  >
                    <View style={styles.searchSuggestionText}>
                      <Text style={[styles.searchSuggestionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.searchSuggestionMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.meta}
                      </Text>
                    </View>
                    <View style={[styles.searchSuggestionBadge, { backgroundColor: item.kind === 'Haber' ? colors.accent + '18' : '#10b98118' }]}>
                      <Text style={[styles.searchSuggestionBadgeText, { color: item.kind === 'Haber' ? colors.accent : '#10b981' }]}>
                        {item.kind}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Pressable onPress={openSearch} style={styles.searchSuggestionEmpty}>
                  <Text style={[styles.searchSuggestionMeta, { color: colors.textMuted }]}>Arama sayfasında detaylı ara</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={({ pressed }) => [
              styles.headerIconBtn,
              styles.headerOutlinedBtn,
              {
                backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                borderColor: colors.accent + '55',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Profil"
          >
            <Ionicons name="person" size={20} color={colors.accent} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/notifications' as any)}
            style={({ pressed }) => [
              styles.headerIconBtn,
              styles.headerOutlinedBtn,
              {
                backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                borderColor: colors.accent + '55',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Bildirimler"
          >
            <Ionicons name="notifications" size={20} color={colors.accent} />
            <View style={styles.notificationDot} />
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/messages' as any)}
            style={({ pressed }) => [
              styles.headerIconBtn,
              styles.headerOutlinedBtn,
              {
                backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                borderColor: colors.accent + '55',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Mesajlar"
          >
            <Ionicons name="chatbubble" size={20} color={colors.accent} />
          </Pressable>


        </View>
      </Animated.View>

      {/* Body */}
      {loading && feedItems.length === 0 && (
        <LoadingGreetingOverlay 
          languageCode={preferredNewsLanguages[0] || 'tr'}
          userName={profileName}
        />
      )}

      {(!loading || feedItems.length > 0) && (
        <Animated.View style={[styles.feedWrap, { opacity: entrance }]}>

          {/* Feed column */}
          <View style={styles.feedColumn}>
            <View style={styles.tabsAndFilterRow}>
              <View style={[styles.modeTabs, styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                {(['personal', 'followed'] as const).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => { setViewMode(m); setPage(1); }}
                    style={[styles.tabBtn, viewMode === m && { backgroundColor: colors.accent }]}
                  >
                    <Text style={[styles.tabText, { color: viewMode === m ? '#fff' : colors.textMuted }]}>
                      {m === 'personal' ? 'İlgi Alanlarım' : 'Takip Ettiklerim'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => toggleSidebarDrawer(true)}
                style={({ pressed }) => [
                  styles.filterTogglePill,
                  {
                    backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Filtreler"
              >
                <Ionicons name="options-outline" size={16} color={colors.accent} />
                <Text style={[styles.filterTogglePillText, { color: colors.textPrimary }]}>Filtreler</Text>
                {activeFilterCount > 0 && (
                  <View style={[styles.filterCountBadge, { backgroundColor: colors.accent }]}>
                    <Text style={styles.filterCountBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
            {viewMode === 'personal' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' }}>
                {customTags.map((tag) => {
                  const active = selCustomTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleCustomTag(tag)}
                      style={[
                        styles.toolTab,
                        {
                          backgroundColor: active ? colors.accent : colors.surface,
                          borderColor: active ? colors.accent : colors.accent + '45',
                        },
                      ]}
                    >
                      <Ionicons name="pricetag-outline" size={12} color={active ? '#fff' : colors.textPrimary} />
                      <Text style={[styles.toolTabText, { color: active ? '#fff' : colors.textPrimary }]}>
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => router.push('/(tabs)/profile' as any)}
                  style={[
                    styles.toolTab,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.accent + '90',
                      borderStyle: 'dashed',
                      borderWidth: 1.2,
                    },
                  ]}
                >
                  <Ionicons name="add-outline" size={13} color={colors.accent} />
                  <Text style={[styles.toolTabText, { color: colors.accent, fontWeight: 'bold' }]}>
                    Etiket Ekle/Düzenle
                  </Text>
                </Pressable>
              </ScrollView>
            )}

            <View style={styles.toolTabs}>
              {([
                { key: 'currency', label: 'Piyasalar', icon: 'cash-outline', accent: '#10b981' },
                { key: 'weather', label: 'Hava Durumu', icon: 'partly-sunny-outline', accent: '#38bdf8' },
              ] as const).map((tool) => {
                const active = activeTools.includes(tool.key);
                return (
                  <Pressable
                    key={tool.key}
                    onPress={() => setActiveTools((current) =>
                      current.includes(tool.key)
                        ? current.filter((item) => item !== tool.key)
                        : [...current, tool.key]
                    )}
                    style={[
                      styles.toolTab,
                      {
                        backgroundColor: active ? tool.accent + '18' : colors.surface,
                        borderColor: active ? tool.accent + '70' : colors.accent + '45',
                      },
                    ]}
                  >
                    <Ionicons name={tool.icon as any} size={14} color={active ? tool.accent : colors.textMuted} />
                    <Text style={[styles.toolTabText, { color: active ? colors.textPrimary : colors.textMuted }]}>
                      {tool.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {activeTools.length > 0 && (
              <View style={styles.toolPanels}>
                {activeTools.map((tool) => (
                  <View key={tool} style={[styles.toolPanel, { backgroundColor: colors.surface, borderColor: colors.accent + '45' }]}>
                    <View style={styles.toolPanelHeader}>
                      <View style={styles.toolPanelTitleRow}>
                        <Ionicons
                          name={tool === 'currency' ? 'cash-outline' : 'partly-sunny-outline'}
                          size={16}
                          color={tool === 'currency' ? '#10b981' : '#38bdf8'}
                        />
                        <Text style={[styles.toolPanelTitle, { color: colors.textPrimary }]}>
                          {tool === 'currency' ? 'Piyasalar' : 'Hava Durumu'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => setActiveTools((current) => current.filter((item) => item !== tool))}
                        style={[styles.toolCloseBtn, { backgroundColor: colors.surfaceInput }]}
                      >
                        <Ionicons name="close" size={14} color={colors.textMuted} />
                      </Pressable>
                    </View>
                    {tool === 'currency' ? <CurrencyWidget size="sm" /> : <WeatherWidget size="sm" />}
                  </View>
                ))}
              </View>
            )}

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
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>İlgi Alanı seçilmedi</Text>
                    <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                      İlgi alanlarınıza özel haberleri görmek için Profil → Tercihler sayfasından ilgilendiğiniz kategorileri seçin.
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
                        { 
                          backgroundColor: pressed ? colors.surfaceHigh : colors.surface, 
                          borderColor: (item as any).isCustomTagMatch ? '#ec489980' : colors.borderSubtle,
                          borderWidth: (item as any).isCustomTagMatch ? 1.5 : 1
                        },
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
                        
                        {(item as any).isCustomTagMatch && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
                            <View style={{ backgroundColor: '#ec489920', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons name="sparkles" size={12} color="#ec4899" style={{ marginRight: 4 }} />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#ec4899', letterSpacing: 0.3 }}>ÖZEL İLGİ ALANI</Text>
                            </View>
                          </View>
                        )}

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
                            <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.actionText, { color: colors.textMuted }]}>{article.viewCount ?? 0}</Text>
                          </View>
                          <View style={styles.action}>
                            <Ionicons name="heart-outline" size={16} color={colors.textMuted} />
                            <Text style={[styles.actionText, { color: colors.textMuted }]}>{article.likeCount ?? 0}</Text>
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
        </Animated.View>
      )}
      </ScrollView>

      {/* Sidebar Drawer Overlay */}
      {drawerRendered && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* Backdrop */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 999 }]}
            onPress={() => toggleSidebarDrawer(false)}
          />
          {/* Drawer Panel */}
          <Animated.View
            style={[
              styles.sidebarDrawer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                transform: [{ translateX: drawerAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.sidebarHeader, { borderBottomColor: colors.borderSubtle, borderBottomWidth: 1 }]}>
              <View style={styles.sidebarTitleRow}>
                <Ionicons name="options-outline" size={16} color={colors.accent} />
                <Text style={[styles.sidebarTitle, { color: colors.textPrimary }]}>Filtreler</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {activeFilterCount > 0 && (
                  <Pressable onPress={resetFilters} style={[styles.clearBtn, { backgroundColor: colors.accent + '18' }]}>
                    <Text style={[styles.clearBtnText, { color: colors.accent }]}>Temizle</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => toggleSidebarDrawer(false)} style={styles.closeDrawerBtn}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Scrollable Filters */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              {/* Active filter count */}
              {activeFilterCount > 0 && (
                <View style={[styles.activeFilterBanner, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '30', marginTop: 12 }]}>
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
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
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
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 100 },
  headerLeft: { flex: 1, minWidth: 260, gap: 6 },
  title: { fontSize: 34, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0, alignSelf: 'center' },
  searchArea: { flex: 1.1, minWidth: 320, maxWidth: 460, alignSelf: 'center', position: 'relative', zIndex: 200 },
  searchBox: { width: '100%', height: 52, borderRadius: 26, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '700', outlineStyle: 'none' as any },
  searchSuggestions: { position: 'absolute', top: 60, left: 0, right: 0, borderWidth: 1.5, borderRadius: 18, padding: 6, gap: 2, zIndex: 300 },
  searchSuggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  searchSuggestionText: { flex: 1, minWidth: 0, gap: 3 },
  searchSuggestionTitle: { fontSize: 13, fontWeight: '800' },
  searchSuggestionMeta: { fontSize: 11, fontWeight: '700' },
  searchSuggestionBadge: { minWidth: 48, alignItems: 'center', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  searchSuggestionBadgeText: { fontSize: 10, fontWeight: '900' },
  searchSuggestionEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 13, paddingHorizontal: 12, paddingVertical: 11 },
  headerIconBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  headerOutlinedBtn: { borderWidth: 1.5 },
  notificationDot: { position: 'absolute', top: 12, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },
  modeTabs: { alignSelf: 'flex-start' },
  tabRow: { flexDirection: 'row', gap: 3, padding: 4, borderRadius: 14, borderWidth: 1 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tabText: { fontSize: 12, fontWeight: '800' },
  toolTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignSelf: 'flex-start' },
  toolTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5 },
  toolTabText: { fontSize: 11, fontWeight: '800' },
  toolPanels: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  toolPanel: { flex: 1, minWidth: 260, maxWidth: 420, borderWidth: 1.5, borderRadius: 18, padding: 14, gap: 12 },
  toolPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolPanelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolPanelTitle: { fontSize: 13, fontWeight: '900' },
  toolCloseBtn: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sidebarToggle: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative' },
  filterBadge: { position: 'absolute', top: 10, right: 10, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
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
  feedWrap: { flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 },
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

  // Sidebar Drawer Panel
  sidebarDrawer: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    borderLeftWidth: 1,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabsAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterTogglePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  closeDrawerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

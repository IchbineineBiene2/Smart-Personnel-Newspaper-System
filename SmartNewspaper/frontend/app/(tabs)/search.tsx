import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useApiNews } from '@/hooks/useNews';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { useSearch, getTrendingArticles } from '@/hooks/useSearch';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { buildPublisherDataset } from '@/services/publisherProfiles';
import { getToken } from '@/services/auth';

const RECENT_KEY = 'recent-searches';

type SearchScope = 'all' | 'news' | 'publishers' | 'users' | 'tags';
type UserResult = { id: number; username: string; full_name?: string; email: string };

const SEARCH_SCOPES: Array<{ key: SearchScope; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'T\u00fcm\u00fc', icon: 'apps-outline' },
  { key: 'news', label: 'Haber', icon: 'newspaper-outline' },
  { key: 'publishers', label: 'Haber Sayfas\u0131', icon: 'albums-outline' },
  { key: 'users', label: 'Kullan\u0131c\u0131', icon: 'person-outline' },
  { key: 'tags', label: 'Etiketler', icon: 'pricetag-outline' },
];

function normalizeSearchText(value: string): string {
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

export default function SearchTab() {
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string | string[] }>();
  const { colors } = useTheme();
  const { articles } = useApiNews();
  const { savedIds, toggleSaved } = useBookmarks();
  const { results, updateFilter, debouncedQuery } = useSearch(articles);

  const [localQuery, setLocalQuery] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [recentLocal, setRecentLocal] = useState<string[]>([]);
  const [activeScope, setActiveScope] = useState<SearchScope>('all');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<Array<{ tag: string; count: number }>>([]);
  const [backendSearchResults, setBackendSearchResults] = useState<any[]>([]);
  const [backendSearchLoading, setBackendSearchLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const headerFade = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(0)).current;
  const isWeb = Platform.OS === 'web';
  const normalizedQuery = normalizeSearchText(debouncedQuery.trim());
  const routeQuery = Array.isArray(q) ? q[0] : q;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listFade, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) {
        try {
          setRecentLocal(JSON.parse(raw));
        } catch {
          setRecentLocal([]);
        }
      }
    });

    fetch('http://localhost:3000/api/news/trending-topics')
      .then((r) => r.json())
      .then((data) => setTrendingTopics(data.topics || []))
      .catch(() => {});
  }, [headerFade, listFade]);

  useEffect(() => {
    const incoming = routeQuery?.trim();
    if (!incoming || incoming === localQuery) return;
    setLocalQuery(incoming);
    setActiveSearchQuery(incoming);
    updateFilter('query', incoming);
  }, [localQuery, routeQuery, updateFilter]);

  const { publishers } = useMemo(() => buildPublisherDataset(articles), [articles]);

  const publisherResults = useMemo(() => {
    const pool = normalizedQuery
      ? publishers.filter((publisher) =>
          normalizeSearchText(`${publisher.name} ${publisher.category} ${publisher.description}`).includes(normalizedQuery)
        )
      : publishers;
    return pool.slice(0, 14);
  }, [normalizedQuery, publishers]);

  const tagResults = useMemo(() => {
    const trendingTagNames = trendingTopics.map((t) => t.tag);
    const categoryTags = articles
      .flatMap((article) => [
        article.category || '',
        mapToContentCategory(article.category, article.title, article.description),
      ])
      .filter(Boolean);
    const displayTags = Array.from(new Set([...trendingTagNames, ...categoryTags]));
    const counts = new Map<string, number>();

    articles.forEach((article) => {
      const mappedCategory = mapToContentCategory(article.category, article.title, article.description);
      if (article.category) counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
      counts.set(mappedCategory, (counts.get(mappedCategory) ?? 0) + 1);
    });

    trendingTopics.forEach(({ tag, count }) => {
      if (!counts.has(tag)) counts.set(tag, count);
    });

    return displayTags
      .filter((tag) => !normalizedQuery || normalizeSearchText(tag).includes(normalizedQuery))
      .map((tag) => ({ tag, count: counts.get(tag) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'tr'))
      .slice(0, 18);
  }, [articles, normalizedQuery, trendingTopics]);

  const tagArticleResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return articles
      .filter((article) => {
        const mappedCategory = mapToContentCategory(article.category, article.title, article.description);
        const haystack = normalizeSearchText(
          `${article.category ?? ''} ${mappedCategory} ${article.title} ${article.description} ${article.source?.name ?? ''}`
        );
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 24);
  }, [articles, normalizedQuery]);

  useEffect(() => {
    let active = true;
    const query = activeSearchQuery.trim();

    if (query.length < 2 || !['all', 'users'].includes(activeScope)) {
      setUserResults([]);
      setUserSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setUserSearchLoading(true);
        const token = await getToken();
        if (!token) {
          if (active) setUserResults([]);
          return;
        }

        const response = await fetch(`http://localhost:3000/api/contacts/search?q=${encodeURIComponent(query)}&limit=8`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (active) setUserResults([]);
          return;
        }

        const data = await response.json();
        if (active) setUserResults(data.users || []);
      } catch {
        if (active) setUserResults([]);
      } finally {
        if (active) setUserSearchLoading(false);
      }
    }, 260);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeScope, activeSearchQuery]);

  useEffect(() => {
    const q = activeSearchQuery.trim();
    if (q.length < 2 || (activeScope !== 'all' && activeScope !== 'news')) {
      setBackendSearchResults([]);
      setBackendSearchLoading(false);
      return;
    }

    let active = true;
    setBackendSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/news/search?q=${encodeURIComponent(q)}&limit=20`
        );
        if (!response.ok) throw new Error('search failed');
        const data = await response.json();
        if (active) setBackendSearchResults(data.articles || []);
      } catch {
        if (active) setBackendSearchResults([]);
      } finally {
        if (active) setBackendSearchLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeScope, activeSearchQuery]);

  const handleQueryChange = (value: string) => {
    setLocalQuery(value);
  };

  const handleSearch = async (q: string) => {
    const term = q.trim();
    setActiveSearchQuery(term);
    updateFilter('query', term);
    
    if (!term) return;
    
    const updated = [term, ...recentLocal.filter((r) => r !== term)].slice(0, 6);
    setRecentLocal(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const clearQuery = () => {
    setLocalQuery('');
    setActiveSearchQuery('');
    updateFilter('query', '');
  };

  const articleResults = useMemo(() => {
    if (activeScope === 'publishers' || activeScope === 'users' || activeScope === 'tags') return [];
    if (backendSearchResults.length > 0) {
      const ids = new Set(backendSearchResults.map((a) => a.id));
      return [...backendSearchResults, ...results.filter((a) => !ids.has(a.id))];
    }
    return results;
  }, [activeScope, backendSearchResults, results]);

  const isSearching = activeSearchQuery.trim().length > 0;
  const resultCount =
    (activeScope === 'all' || activeScope === 'news' ? articleResults.length : 0) +
    (activeScope === 'all' || activeScope === 'publishers' ? publisherResults.length : 0) +
    (activeScope === 'all' || activeScope === 'users' ? userResults.length : 0) +
    (activeScope === 'all' || activeScope === 'tags' ? tagResults.length + tagArticleResults.length : 0);
  const suggested = getTrendingArticles(articles, 5);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View style={[styles.searchWrap, { opacity: headerFade }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={'Haber, sayfa, kullanıcı veya etiket ara...'}
            placeholderTextColor={colors.textMuted}
            value={localQuery}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => handleSearch(localQuery)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {localQuery.length > 0 && localQuery !== activeSearchQuery ? (
            <Pressable onPress={() => handleSearch(localQuery)} style={{ backgroundColor: colors.accent, padding: 6, borderRadius: 16 }}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          ) : null}
          {localQuery.length > 0 ? (
            <Pressable onPress={clearQuery}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeTabs}>
        {SEARCH_SCOPES.map((scope) => {
          const active = activeScope === scope.key;
          return (
            <Pressable
              key={scope.key}
              style={[
                styles.scopeTab,
                {
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderColor: active ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setActiveScope(scope.key)}
            >
              <Ionicons name={scope.icon} size={15} color={active ? '#fff' : colors.textMuted} />
              <Text style={[styles.scopeTabText, { color: active ? '#fff' : colors.textPrimary }]}>{scope.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isSearching ? (
        <Animated.View style={{ opacity: listFade, gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{resultCount} sonuc bulundu</Text>

          {(activeScope === 'all' || activeScope === 'news') ? (
            backendSearchLoading && articleResults.length === 0 ? (
              <SearchSection title="Haberler" colors={colors}>
                <View style={styles.loadingLine}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.noResultText, { color: colors.textMuted }]}>Haberler aranıyor...</Text>
                </View>
              </SearchSection>
            ) : articleResults.length > 0 ? (
              <SearchSection title="Haberler" colors={colors}>
                <NewspaperGrid
                  articles={articleResults.slice(0, activeScope === 'all' ? 5 : 14)}
                  colors={colors}
                  savedIds={savedIds}
                  onPress={(id) => router.push({ pathname: '/news/[id]', params: { id } })}
                  onSave={toggleSaved}
                />
              </SearchSection>
            ) : null
          ) : null}

          {(activeScope === 'all' || activeScope === 'publishers') && publisherResults.length > 0 ? (
            <SearchSection title="Haber Sayfalari" colors={colors}>
              {publisherResults.slice(0, activeScope === 'all' ? 4 : 14).map((publisher) => (
                <PublisherRow
                  key={publisher.id}
                  publisher={publisher}
                  colors={colors}
                  onPress={() => router.push(`/publisherprofile?id=${encodeURIComponent(publisher.id)}` as any)}
                />
              ))}
            </SearchSection>
          ) : null}

          {activeScope === 'all' || activeScope === 'users' ? (
            <SearchSection title="Kullanicilar" colors={colors}>
              {userSearchLoading ? (
                <View style={styles.loadingLine}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.noResultText, { color: colors.textMuted }]}>{'Kullan\u0131c\u0131lar aran\u0131yor...'}</Text>
                </View>
              ) : userResults.length > 0 ? (
                userResults.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    colors={colors}
                    onPress={() => router.push({ pathname: '/profile/[userId]', params: { userId: String(user.id), username: user.username } })}
                  />
                ))
              ) : activeScope === 'users' ? (
                <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>{'Kullan\u0131c\u0131 sonucu yok veya giri\u015f yap\u0131lmam\u0131\u015f.'}</Text>
              ) : null}
            </SearchSection>
          ) : null}

          {(activeScope === 'all' || activeScope === 'tags') && tagResults.length > 0 ? (
            <SearchSection title="Etiketler" colors={colors}>
              <View style={styles.tagResultGrid}>
                {tagResults.map((item) => (
                  <Pressable
                    key={item.tag}
                    style={[styles.tagResult, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                    onPress={() => {
                      handleQueryChange(item.tag);
                      setActiveScope('news');
                    }}
                  >
                    <Text style={[styles.tagResultHash, { color: colors.accent }]}>#</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tagResultText, { color: colors.textPrimary }]}>{item.tag}</Text>
                      <Text style={[styles.tagResultCount, { color: colors.textMuted }]}>{item.count} haber</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </SearchSection>
          ) : null}

          {(activeScope === 'tags' || activeScope === 'all') && tagArticleResults.length > 0 ? (
            <SearchSection title="Etikete Uyan Haberler" colors={colors}>
              <NewspaperGrid
                articles={tagArticleResults.slice(0, activeScope === 'all' ? 5 : 18)}
                colors={colors}
                savedIds={savedIds}
                onPress={(id) => router.push({ pathname: '/news/[id]', params: { id } })}
                onSave={toggleSaved}
              />
            </SearchSection>
          ) : null}

          {resultCount === 0 ? (
            <View style={styles.noResult}>
              <Ionicons name="search-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.noResultText, { color: colors.textMuted }]}>Sonuc bulunamadi</Text>
            </View>
          ) : null}
        </Animated.View>
      ) : (
        <Animated.View style={{ opacity: listFade, gap: 28 }}>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="time-outline" size={14} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>SON ARAMALAR</Text>
              </View>
              <View style={styles.recentList}>
                {recentLocal.length === 0 ? (
                  <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>Henüz arama yapmadınız.</Text>
                ) : recentLocal.map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [
                      styles.recentItem,
                      { backgroundColor: pressed ? colors.surfaceHigh : colors.surface, borderColor: colors.borderSubtle },
                    ]}
                    onPress={() => {
                      setLocalQuery(q);
                      handleSearch(q);
                    }}
                  >
                    <Text style={[styles.recentText, { color: colors.textPrimary }]}>{q}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.col}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trending-up" size={14} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>TREND BASLIKLAR</Text>
              </View>
              <View style={styles.tagCloud}>
                {trendingTopics.length === 0 ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : trendingTopics.slice(0, 10).map(({ tag }) => (
                  <Pressable
                    key={tag}
                    style={[styles.tag, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}
                    onPress={() => {
                      setLocalQuery(tag);
                      handleSearch(tag);
                    }}
                  >
                    <Text style={[styles.tagText, { color: colors.accent }]}>#{tag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bookmark-outline" size={14} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>ONERILEN MAKALELER</Text>
            </View>
            <View style={styles.articleList}>
              {suggested.map((item) => (
                <ArticleRow
                  key={item.id}
                  article={item}
                  colors={colors}
                  isSaved={savedIds.includes(item.id)}
                  onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                  onSave={() => toggleSaved(item.id)}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      )}

      <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.footerLeft}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>AI Destekli Gazete</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Gizlilik</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Haberdar</Text>
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>2026 Haberdar v2.0</Text>
      </View>
    </ScrollView>
  );
}

function SearchSection({ title, colors, children }: { title: string; colors: any; children: any }) {
  return (
    <View style={styles.resultSection}>
      <Text style={[styles.resultSectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
}

function NewspaperGrid({
  articles,
  colors,
  savedIds,
  onPress,
  onSave,
}: {
  articles: any[];
  colors: any;
  savedIds: string[];
  onPress: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width > 768;

  if (articles.length === 0) return null;

  const hero = articles[0];
  const sideBySide = articles.slice(1, 3);
  const rest = articles.slice(3);

  return (
    <View style={{ gap: 24 }}>
      {/* Hero Article */}
      <Pressable
        style={({ pressed }) => [
          { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, paddingBottom: 24, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => onPress(hero.id)}
      >
        {hero.imageUrl && (
          <Image
            source={{ uri: proxyImageUrl(hero.imageUrl) }}
            style={{ width: '100%', height: isWide ? 400 : 220, borderRadius: 8, marginBottom: 16 }}
          />
        )}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[styles.articleCat, { color: colors.accent, marginBottom: 8 }]}>
              {hero.category?.toUpperCase() ?? 'GENEL'}
            </Text>
            <Text style={[styles.articleTitle, { color: colors.textPrimary, fontSize: isWide ? 32 : 24, lineHeight: isWide ? 38 : 30, marginBottom: 12 }]}>
              {hero.title}
            </Text>
            {!!hero.description && (
              <Text style={[{ color: colors.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 12 }]} numberOfLines={3}>
                {hero.description}
              </Text>
            )}
            <Text style={[styles.articleMeta, { color: colors.textMuted }]}>
              {hero.source?.name}
            </Text>
          </View>
          <Pressable onPress={() => onSave(hero.id)} hitSlop={12} style={{ marginTop: 4 }}>
            <Ionicons name={savedIds.includes(hero.id) ? 'bookmark' : 'bookmark-outline'} size={22} color={savedIds.includes(hero.id) ? colors.accent : colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>

      {/* Side by side (if available) */}
      {sideBySide.length > 0 && (
        <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 24, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, paddingBottom: 24 }}>
          {sideBySide.map((a, i) => (
            <Pressable
              key={a.id}
              style={({ pressed }) => [
                { flex: 1, opacity: pressed ? 0.7 : 1 },
                isWide && i === 0 && { paddingRight: 24, borderRightWidth: 1, borderRightColor: colors.borderSubtle }
              ]}
              onPress={() => onPress(a.id)}
            >
              {a.imageUrl && (
                <Image
                  source={{ uri: proxyImageUrl(a.imageUrl) }}
                  style={{ width: '100%', height: 160, borderRadius: 6, marginBottom: 12 }}
                />
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.articleCat, { color: colors.accent, marginBottom: 6 }]}>
                    {a.category?.toUpperCase() ?? 'GENEL'}
                  </Text>
                  <Text style={[styles.articleTitle, { color: colors.textPrimary, fontSize: 18, lineHeight: 24, marginBottom: 8 }]} numberOfLines={3}>
                    {a.title}
                  </Text>
                  <Text style={[styles.articleMeta, { color: colors.textMuted }]}>
                    {a.source?.name}
                  </Text>
                </View>
                <Pressable onPress={() => onSave(a.id)} hitSlop={12}>
                  <Ionicons name={savedIds.includes(a.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={savedIds.includes(a.id) ? colors.accent : colors.textMuted} />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Standard Rows */}
      {rest.length > 0 && (
        <View style={{ gap: 0 }}>
          {rest.map((a) => (
            <ArticleRow
              key={a.id}
              article={a}
              colors={colors}
              isSaved={savedIds.includes(a.id)}
              onPress={() => onPress(a.id)}
              onSave={() => onSave(a.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ArticleRow({
  article,
  colors,
  isSaved,
  onPress,
  onSave,
}: {
  article: any;
  colors: any;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const img = proxyImageUrl(article.imageUrl ?? '');
  return (
    <Pressable
      style={({ pressed }) => [
        styles.articleRow,
        { borderBottomColor: colors.borderSubtle, opacity: pressed ? 0.6 : 1 },
      ]}
      onPress={onPress}
    >
      {img ? (
        <Image source={{ uri: img }} style={[styles.articleThumb, { backgroundColor: colors.surfaceHigh }]} />
      ) : (
        <View style={[styles.articleThumb, { backgroundColor: colors.surfaceHigh }]} />
      )}
      <View style={styles.articleText}>
        <Text style={[styles.articleCat, { color: colors.accent }]}>{article.category?.toUpperCase() ?? 'GENEL'}</Text>
        <Text style={[styles.articleTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {article.title}
        </Text>
        <Text style={[styles.articleMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {article.source?.name}
        </Text>
      </View>
      <Pressable onPress={onSave} hitSlop={8}>
        <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={17} color={isSaved ? colors.accent : colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

function PublisherRow({ publisher, colors, onPress }: { publisher: any; colors: any; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.articleRow,
        { borderBottomColor: colors.borderSubtle, opacity: pressed ? 0.6 : 1, alignItems: 'center' },
      ]}
      onPress={onPress}
    >
      {publisher.logoUrl ? (
        <Image source={{ uri: publisher.logoUrl }} style={[styles.publisherThumb, { backgroundColor: colors.surfaceHigh }]} />
      ) : (
        <View style={[styles.publisherThumb, styles.centerThumb, { backgroundColor: colors.accent + '18' }]}>
          <Text style={[styles.publisherLogoText, { color: colors.accent }]}>{publisher.logoText}</Text>
        </View>
      )}
      <View style={styles.articleText}>
        <Text style={[styles.articleCat, { color: colors.accent }]}>{publisher.category?.toUpperCase?.() ?? 'KAYNAK'}</Text>
        <Text style={[styles.articleTitle, { color: colors.textPrimary }]} numberOfLines={1}>{publisher.name}</Text>
        <Text style={[styles.articleMeta, { color: colors.textMuted }]} numberOfLines={1}>{publisher.articlesCount} haber | {publisher.cadence}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

function UserRow({ user, colors, onPress }: { user: UserResult; colors: any; onPress: () => void }) {
  const display = user.full_name || user.username;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.articleRow,
        { borderBottomColor: colors.borderSubtle, opacity: pressed ? 0.6 : 1, alignItems: 'center' },
      ]}
      onPress={onPress}
    >
      <View style={[styles.publisherThumb, styles.centerThumb, { backgroundColor: colors.accent + '18' }]}>
        <Text style={[styles.publisherLogoText, { color: colors.accent }]}>{display.slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.articleText}>
        <Text style={[styles.articleCat, { color: colors.accent }]}>KULLANICI</Text>
        <Text style={[styles.articleTitle, { color: colors.textPrimary }]} numberOfLines={1}>{display}</Text>
        <Text style={[styles.articleMeta, { color: colors.textMuted }]} numberOfLines={1}>@{user.username} | {user.email}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 18, paddingBottom: 40 },
  webContent: { maxWidth: 980, width: '100%' as any, alignSelf: 'center' },
  searchWrap: {},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  scopeTabs: { gap: 8, paddingVertical: 2 },
  scopeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  scopeTabText: { fontSize: 12, fontWeight: '800' },
  twoCol: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 240, gap: 14 },
  section: { gap: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  resultSection: { gap: 8 },
  resultSectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 4 },
  recentList: { gap: 8 },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  recentText: { fontSize: 13, fontWeight: '600' },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '700' },
  tagResultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagResult: {
    width: 180,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagResultHash: { fontSize: 18, fontWeight: '900' },
  tagResultText: { fontSize: 13, fontWeight: '800' },
  tagResultCount: { fontSize: 11, marginTop: 2 },
  articleList: { gap: 4 },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  articleThumb: { width: 120, height: 85, borderRadius: 6 },
  publisherThumb: { width: 60, height: 60, borderRadius: 30 },
  centerThumb: { alignItems: 'center', justifyContent: 'center' },
  publisherLogoText: { fontSize: 16, fontWeight: '900' },
  articleText: { flex: 1, gap: 6, minWidth: 0, justifyContent: 'center' },
  articleCat: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  articleTitle: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  articleMeta: { fontSize: 12, fontWeight: '500' },
  noResult: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  noResultText: { fontSize: 14, fontWeight: '600' },
  emptySectionText: { fontSize: 13, lineHeight: 19, paddingVertical: 8 },
  loadingLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  footerLeft: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  footerText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});

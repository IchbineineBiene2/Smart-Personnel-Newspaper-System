import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useApiNews } from '@/hooks/useNews';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { useSearch, getTrendingArticles } from '@/hooks/useSearch';
import { proxyImageUrl } from '@/services/newsApi';

const RECENT_KEY = 'recent-searches';
const TRENDING_TAGS = ['#Kripto', '#MilliTakım', '#YapayZeka', '#ElonMusk', '#Seçim2026', '#GüneşFırtınası'];

export default function SearchTab() {
  const router = useRouter();
  const { colors, themeName } = useTheme();
  const { articles } = useApiNews();
  const { savedIds, toggleSaved } = useBookmarks();
  const { filters, results, updateFilter, debouncedQuery, recentSearches, clearRecentSearches } = useSearch(articles);

  const [localQuery, setLocalQuery] = useState('');
  const [recentLocal, setRecentLocal] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const headerFade = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === 'web';
  const bg = colors.background;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listFade, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();

    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) try { setRecentLocal(JSON.parse(raw)); } catch {}
    });
  }, []);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    updateFilter('query', q);
    const updated = [q, ...recentLocal.filter((r) => r !== q)].slice(0, 6);
    setRecentLocal(updated);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  const handleClearRecent = async () => {
    setRecentLocal([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  const suggested = articles.slice(0, 5);
  const isSearching = localQuery.trim().length > 0;
  const searchResults = isSearching ? results : [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Search Bar ── */}
      <Animated.View style={[styles.searchWrap, { opacity: headerFade }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Tüm haber ağında keşfe çıkın..."
            placeholderTextColor={colors.textMuted}
            value={localQuery}
            onChangeText={(v) => { setLocalQuery(v); updateFilter('query', v); }}
            onSubmitEditing={() => handleSearch(localQuery)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {localQuery.length > 0 && (
            <Pressable onPress={() => { setLocalQuery(''); updateFilter('query', ''); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* ── Search Results ── */}
      {isSearching && (
        <Animated.View style={{ opacity: listFade, gap: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {searchResults.length} sonuç bulundu
          </Text>
          {searchResults.slice(0, 10).map((item) => (
            <ArticleRow
              key={item.id}
              article={item}
              colors={colors}
              isSaved={savedIds.includes(item.id)}
              onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
              onSave={() => toggleSaved(item.id)}
            />
          ))}
          {searchResults.length === 0 && (
            <View style={styles.noResult}>
              <Ionicons name="search-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.noResultText, { color: colors.textMuted }]}>Sonuç bulunamadı</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* ── Not Searching ── */}
      {!isSearching && (
        <Animated.View style={{ opacity: listFade, gap: 28 }}>
          {/* Two-column layout for web */}
          <View style={styles.twoCol}>
            {/* Left: Recent Searches */}
            <View style={styles.col}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="time-outline" size={14} color={colors.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>SON ARAMALAR</Text>
                </View>
              </View>

              <View style={styles.recentList}>
                {(recentLocal.length > 0 ? recentLocal : ['Altın Fiyatları', 'Süper Lig', 'Enflasyon Tahmini', 'Yeni iPhone']).map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [
                      styles.recentItem,
                      {
                        backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    onPress={() => { setLocalQuery(q); handleSearch(q); }}
                  >
                    <Text style={[styles.recentText, { color: colors.textPrimary }]}>{q}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Right: Trending + Filters */}
            <View style={styles.col}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="trending-up" size={14} color={colors.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>TREND BAŞLIKLAR</Text>
                </View>
              </View>

              <View style={styles.tagCloud}>
                {TRENDING_TAGS.map((tag) => (
                  <Pressable
                    key={tag}
                    style={[styles.tag, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}
                    onPress={() => { setLocalQuery(tag.replace('#', '')); handleSearch(tag.replace('#', '')); }}
                  >
                    <Text style={[styles.tagText, { color: colors.accent }]}>{tag}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Smart filters card */}
              <View style={[styles.filtersCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.filtersHeader}>
                  <Text style={[styles.filtersTitle, { color: colors.textPrimary }]}>Akıllı Filtreler</Text>
                  <Ionicons name="options-outline" size={16} color={colors.textMuted} />
                </View>
                <Text style={[styles.filtersDesc, { color: colors.textMuted }]}>
                  Aramalarınızı zamana, kaynağa veya duyarlılığa göre özelleştirin.
                </Text>
                <Pressable
                  style={[styles.filtersBtn, { backgroundColor: colors.surfaceHigh }]}
                  onPress={() => {}}
                >
                  <Text style={[styles.filtersBtnText, { color: colors.textPrimary }]}>Filtre Paneline Git</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Suggested Articles */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="bookmark-outline" size={14} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>ÖNERİLEN MAKALELER</Text>
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

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.footerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="sparkles" size={11} color={colors.accent} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>AI Destekli Gazete</Text>
          </View>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Gizlilik</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Destek</Text>
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>© 2026 GazeteAI Hub v2.0</Text>
      </View>
    </ScrollView>
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
        {
          backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
          borderColor: colors.borderSubtle,
        },
      ]}
      onPress={onPress}
    >
      {img ? (
        <Image source={{ uri: img }} style={[styles.articleThumb, { backgroundColor: colors.surfaceHigh }]} />
      ) : (
        <View style={[styles.articleThumb, { backgroundColor: colors.surfaceHigh }]} />
      )}
      <View style={styles.articleText}>
        <Text style={[styles.articleCat, { color: colors.accent }]}>
          {article.category?.toUpperCase() ?? 'GENEL'}
        </Text>
        <Text style={[styles.articleTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {article.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 24, paddingBottom: 40 },
  webContent: { maxWidth: 980, width: '100%' as any, alignSelf: 'center' },

  // Search
  searchWrap: {},
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 28, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

  // Two column
  twoCol: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },
  col: { flex: 1, minWidth: 240, gap: 14 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },

  // Recent
  recentList: { gap: 8 },
  recentItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  recentText: { fontSize: 13, fontWeight: '600' },

  // Tags
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '700' },

  // Filters card
  filtersCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10, marginTop: 4 },
  filtersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filtersTitle: { fontSize: 14, fontWeight: '700' },
  filtersDesc: { fontSize: 12, lineHeight: 18 },
  filtersBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  filtersBtnText: { fontSize: 12, fontWeight: '700' },

  // Article list
  articleList: { gap: 8 },
  articleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
  },
  articleThumb: { width: 52, height: 52, borderRadius: 10 },
  articleText: { flex: 1, gap: 4 },
  articleCat: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  articleTitle: { fontSize: 13, fontWeight: '600', lineHeight: 18 },

  // No result
  noResult: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  noResultText: { fontSize: 14, fontWeight: '600' },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 8, paddingTop: 20, borderTopWidth: 1,
  },
  footerLeft: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  footerText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});

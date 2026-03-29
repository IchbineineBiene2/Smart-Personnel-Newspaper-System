import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useApiNews } from '@/hooks/useNews';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { useSearch, getTrendingArticles, useSavedArticles } from '@/hooks/useSearch';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { CATEGORIES, ContentCategory } from '@/services/content';
import { Radius, Spacing, Typography } from '@/constants/theme';
import type { SortOption } from '@/hooks/useSearch';

const LANG_OPTIONS: { key: 'all' | 'tr' | 'en' | 'de'; label: string; flag: string }[] = [
  { key: 'all', label: 'Tümü',    flag: '🌐' },
  { key: 'tr',  label: 'Türkçe', flag: '🇹🇷' },
  { key: 'en',  label: 'İngilizce', flag: '🇬🇧' },
  { key: 'de',  label: 'Almanca',  flag: '🇩🇪' },
];

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'newest',  label: 'En Yeni',  icon: 'time-outline' },
  { key: 'oldest',  label: 'En Eski',  icon: 'hourglass-outline' },
  { key: 'popular', label: 'Popüler',  icon: 'flame-outline' },
];

type ActiveTab = 'recent' | 'saved' | 'trending';

export default function SearchTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('recent');

  const { articles, loading: articlesLoading } = useApiNews();
  const { savedIds, toggleSaved } = useBookmarks();
  const {
    filters, results, debouncedQuery,
    recentSearches, activeFilterCount, availableSources,
    updateFilter, resetFilters, saveRecentSearch, clearRecentSearches,
  } = useSearch(articles);

  const trending = getTrendingArticles(articles, 10);
  const savedArticles = useSavedArticles(savedIds, articles);
  const hasQuery = debouncedQuery.length > 0;
  const showResults = hasQuery || activeFilterCount > 0;

  const s = styles(colors);

  return (
    <View style={s.root}>

      {/* ── Arama Başlık Alanı ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Ara</Text>
          {activeFilterCount > 0 && (
            <Pressable onPress={resetFilters} style={s.clearBtn}>
              <Ionicons name="refresh-outline" size={13} color={colors.error} />
              <Text style={[s.clearBtnText, { color: colors.error }]}>Sıfırla</Text>
            </Pressable>
          )}
        </View>

        {/* Input */}
        <View style={[s.inputRow, { borderColor: showFilters ? colors.accent : colors.border, backgroundColor: colors.surfaceInput }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={filters.query}
            onChangeText={(t) => updateFilter('query', t)}
            onSubmitEditing={() => saveRecentSearch(filters.query)}
            placeholder="Haber, kaynak veya konu ara..."
            placeholderTextColor={colors.textMuted}
            style={[s.input, { color: colors.textPrimary }]}
            returnKeyType="search"
          />
          {filters.query.length > 0 ? (
            <Pressable onPress={() => updateFilter('query', '')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <View style={[s.inputDivider, { backgroundColor: colors.borderSubtle }]} />
          <Pressable
            onPress={() => setShowFilters((v) => !v)}
            style={[s.filterToggle, showFilters && { backgroundColor: colors.accent + '22' }]}
            hitSlop={6}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={showFilters ? colors.accent : colors.textMuted}
            />
            {activeFilterCount > 0 && (
              <View style={s.filterDot} />
            )}
          </Pressable>
        </View>

        {/* Filtre Paneli */}
        {showFilters && (
          <View style={[s.filterPanel, { borderColor: colors.borderSubtle }]}>
            {/* Kategori */}
            <Text style={[s.filterLabel, { color: colors.textMuted }]}>KATEGORİ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              {([null, ...CATEGORIES] as (ContentCategory | null)[]).map((cat) => {
                const isActive = filters.category === cat;
                return (
                  <Pressable
                    key={cat ?? '__all__'}
                    style={[s.chip, isActive && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                    onPress={() => updateFilter('category', cat)}
                  >
                    <Text style={[s.chipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                      {cat ?? 'Tümü'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Dil + Sıralama yan yana */}
            <View style={s.filterRow2}>
              <View style={{ flex: 1 }}>
                <Text style={[s.filterLabel, { color: colors.textMuted }]}>DİL</Text>
                <View style={[s.segGroup, { borderColor: colors.border }]}>
                  {LANG_OPTIONS.map(({ key, flag }) => {
                    const isActive = filters.language === key;
                    return (
                      <Pressable
                        key={key}
                        style={[s.segItem, isActive && { backgroundColor: colors.accent }]}
                        onPress={() => updateFilter('language', key)}
                      >
                        <Text style={s.segFlag}>{flag}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.filterLabel, { color: colors.textMuted }]}>SIRALAMA</Text>
                <View style={[s.segGroup, { borderColor: colors.border }]}>
                  {SORT_OPTIONS.map(({ key, icon }) => {
                    const isActive = filters.sortBy === key;
                    return (
                      <Pressable
                        key={key}
                        style={[s.segItem, isActive && { backgroundColor: colors.accent }]}
                        onPress={() => updateFilter('sortBy', key)}
                      >
                        <Ionicons
                          name={icon as any}
                          size={14}
                          color={isActive ? '#fff' : colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* ── İçerik ── */}
      {articlesLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Haberler yükleniyor...</Text>
        </View>
      ) : showResults ? (
        /* Arama Sonuçları */
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          ListHeaderComponent={
            <View style={s.resultsHeader}>
              <Text style={[s.resultsCount, { color: colors.textMuted }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{results.length}</Text>
                {' '}sonuç bulundu
                {debouncedQuery ? ` — "${debouncedQuery}"` : ''}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { borderColor: colors.borderSubtle }]}>
                <Ionicons name="search-outline" size={30} color={colors.textMuted} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Sonuç bulunamadı</Text>
              <Text style={[s.emptyBody, { color: colors.textMuted }]}>
                Farklı anahtar kelime deneyin veya filtreleri değiştirin.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSaved = savedIds.includes(item.id);
            const cat = mapToContentCategory(item.category, item.title, item.description);
            return (
              <ArticleCard
                title={item.title}
                excerpt={item.description}
                source={item.source.name}
                category={cat}
                publishedAt={item.publishedAt}
                imageUrl={proxyImageUrl(item.imageUrl)}
                isSaved={isSaved}
                onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                onSave={() => toggleSaved(item.id)}
                colors={colors}
              />
            );
          }}
        />
      ) : (
        /* Tab İçeriği */
        <View style={{ flex: 1 }}>
          {/* Tab Bar */}
          <View style={[s.tabBar, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            {(['recent', 'saved', 'trending'] as ActiveTab[]).map((tab) => {
              const cfg = {
                recent:   { label: 'Son Aramalar', icon: 'time-outline' },
                saved:    { label: `Kaydedilen (${savedArticles.length})`, icon: 'bookmark-outline' },
                trending: { label: 'Trend', icon: 'flame-outline' },
              }[tab];
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[s.tabItem, isActive && { borderBottomColor: colors.accent }]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Ionicons
                    name={cfg.icon as any}
                    size={14}
                    color={isActive ? colors.accent : colors.textMuted}
                  />
                  <Text style={[s.tabLabel, { color: isActive ? colors.accent : colors.textMuted }]}>
                    {cfg.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {activeTab === 'recent' && (
            <ScrollView contentContainerStyle={s.listContent}>
              {recentSearches.length === 0 ? (
                <View style={s.emptyState}>
                  <View style={[s.emptyIcon, { borderColor: colors.borderSubtle }]}>
                    <Ionicons name="time-outline" size={28} color={colors.textMuted} />
                  </View>
                  <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Henüz arama yapılmadı</Text>
                  <Text style={[s.emptyBody, { color: colors.textMuted }]}>
                    Yukarıdaki arama çubuğunu kullanarak haber bulun.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={s.sectionRow}>
                    <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Son Aramalar</Text>
                    <Pressable onPress={clearRecentSearches}>
                      <Text style={[s.clearLink, { color: colors.accent }]}>Temizle</Text>
                    </Pressable>
                  </View>
                  {recentSearches.map((term) => (
                    <Pressable
                      key={term}
                      style={[s.recentItem, { borderColor: colors.borderSubtle }]}
                      onPress={() => updateFilter('query', term)}
                    >
                      <View style={[s.recentIconBox, { backgroundColor: colors.surfaceInput }]}>
                        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                      </View>
                      <Text style={[s.recentText, { color: colors.textSecondary }]}>{term}</Text>
                      <Ionicons name="arrow-forward-outline" size={14} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {activeTab === 'saved' && (
            <FlatList
              data={savedArticles}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.listContent}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <View style={[s.emptyIcon, { borderColor: colors.borderSubtle }]}>
                    <Ionicons name="bookmark-outline" size={28} color={colors.textMuted} />
                  </View>
                  <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Kaydedilen haber yok</Text>
                  <Text style={[s.emptyBody, { color: colors.textMuted }]}>
                    Haber kartındaki bookmark ikonuna basarak kaydedin.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const cat = mapToContentCategory(item.category, item.title, item.description);
                return (
                  <ArticleCard
                    title={item.title}
                    excerpt={item.description}
                    source={item.source.name}
                    category={cat}
                    publishedAt={item.publishedAt}
                    imageUrl={item.imageUrl}
                    isSaved
                    onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                    onSave={() => toggleSaved(item.id)}
                    colors={colors}
                  />
                );
              }}
            />
          )}

          {activeTab === 'trending' && (
            <FlatList
              data={trending}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.listContent}
              ListHeaderComponent={
                <View style={s.trendHeaderRow}>
                  <Ionicons name="flame" size={16} color="#EF4444" />
                  <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>
                    Son 24 Saatin Trend Haberleri
                  </Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const isSaved = savedIds.includes(item.id);
                const cat = mapToContentCategory(item.category, item.title, item.description);
                return (
                  <ArticleCard
                    rank={index + 1}
                    title={item.title}
                    excerpt={item.description}
                    source={item.source.name}
                    category={cat}
                    publishedAt={item.publishedAt}
                    imageUrl={proxyImageUrl(item.imageUrl)}
                    isSaved={isSaved}
                    onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                    onSave={() => toggleSaved(item.id)}
                    colors={colors}
                  />
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

// ─── Article Card ────────────────────────────────────────────────────────────
function ArticleCard({
  rank, title, excerpt, source, category, publishedAt,
  imageUrl, isSaved, onPress, onSave, colors,
}: {
  rank?: number; title: string; excerpt: string; source: string;
  category: string; publishedAt: string; imageUrl?: string;
  isSaved: boolean; onPress: () => void; onSave: () => void; colors: any;
}) {
  const diff = Date.now() - new Date(publishedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const timeLabel =
    mins < 60 ? `${mins}dk` : mins < 1440 ? `${Math.floor(mins / 60)}sa` : `${Math.floor(mins / 1440)}g`;

  return (
    <Pressable
      style={({ pressed }) => [
        cardStyles.card,
        { borderColor: colors.borderSubtle, backgroundColor: colors.surface },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onPress}
    >
      {rank !== undefined && (
        <Text style={[cardStyles.rank, { color: colors.accent + '80' }]}>
          {String(rank).padStart(2, '0')}
        </Text>
      )}

      <View style={cardStyles.body}>
        {/* Üst meta satırı */}
        <View style={cardStyles.meta}>
          <View style={[cardStyles.catPill, { backgroundColor: colors.accent + '18' }]}>
            <Text style={[cardStyles.catText, { color: colors.accent }]}>{category}</Text>
          </View>
          <Text style={[cardStyles.metaText, { color: colors.textMuted }]}>
            {source}
          </Text>
          <Text style={[cardStyles.dot, { color: colors.borderSubtle }]}>·</Text>
          <Text style={[cardStyles.metaText, { color: colors.textMuted }]}>{timeLabel}</Text>
        </View>

        {/* Başlık */}
        <Text style={[cardStyles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>

        {/* Özet */}
        <Text style={[cardStyles.excerpt, { color: colors.textSecondary }]} numberOfLines={2}>
          {excerpt}
        </Text>
      </View>

      {/* Sağ: resim + bookmark */}
      <View style={cardStyles.rightCol}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={cardStyles.thumb} resizeMode="cover" />
        ) : (
          <View style={[cardStyles.thumbPlaceholder, { backgroundColor: colors.surfaceInput }]}>
            <Ionicons name="newspaper-outline" size={20} color={colors.textMuted} />
          </View>
        )}
        <Pressable onPress={onSave} hitSlop={10} style={cardStyles.saveBtn}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.accent : colors.textMuted}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  rank: {
    fontSize: 20,
    fontWeight: '900',
    width: 30,
    textAlign: 'center',
    paddingTop: 4,
  },
  body: { flex: 1, gap: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  catPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  catText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaText: { fontSize: 11 },
  dot: { fontSize: 11 },
  title: { fontSize: Typography.fontSize.base, fontWeight: '700', lineHeight: 21 },
  excerpt: { fontSize: Typography.fontSize.sm, lineHeight: 18 },
  rightCol: { alignItems: 'flex-end', gap: Spacing.sm },
  thumb: { width: 68, height: 68, borderRadius: Radius.md },
  thumbPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { padding: 2 },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: Typography.fontSize.xl,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    clearBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clearBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },

    // Input
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderRadius: Radius.xl,
      paddingHorizontal: 14,
      height: 48,
    },
    input: {
      flex: 1,
      fontSize: Typography.fontSize.base,
    },
    inputDivider: { width: 1, height: 20 },
    filterToggle: {
      width: 32,
      height: 32,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    filterDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#EF4444',
    },

    // Filter panel
    filterPanel: {
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: 10,
      backgroundColor: colors.surface,
    },
    filterLabel: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
    },
    chipRow: { gap: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipText: { fontSize: 12, fontWeight: '600' },
    filterRow2: { flexDirection: 'row', gap: Spacing.md },
    segGroup: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    segItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    segFlag: { fontSize: 14 },

    // Tab bar
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: 1,
    },
    tabItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 12, fontWeight: '600' },

    // Content
    listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 90 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
    },
    loadingText: { fontSize: Typography.fontSize.sm },

    // Results header
    resultsHeader: { marginBottom: 4 },
    resultsCount: { fontSize: Typography.fontSize.sm },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingTop: 48,
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
    },
    emptyBody: {
      fontSize: Typography.fontSize.sm,
      textAlign: 'center',
      lineHeight: 19,
    },

    // Recent searches
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: Typography.fontSize.base,
      fontWeight: '700',
    },
    clearLink: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 11,
      borderBottomWidth: 1,
    },
    recentIconBox: {
      width: 30,
      height: 30,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recentText: { flex: 1, fontSize: Typography.fontSize.base },

    // Trending
    trendHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
  });
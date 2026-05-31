import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useApiNews } from '@/hooks/useNews';
import { usePreferences } from '@/hooks/usePreferences';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import type { WidgetSize } from './WidgetCard';
import type { ApiArticle } from '@/services/newsApi';

const CATEGORY_COLORS: Record<string, string> = {
  teknoloji: '#5442F5', spor: '#10b981', ekonomi: '#f59e0b',
  dunya: '#3b82f6', bilim: '#8b5cf6', saglik: '#ef4444',
  kultur: '#ec4899', genel: '#6b7280',
};

export type NewsWidgetMode = 'foryou' | 'popular' | 'analysis';

interface Props {
  size?: WidgetSize;
  mode?: NewsWidgetMode;
  preferredCategories?: string[];
  excludeIds?: string[];
}

export function NewsWidget({ size = 'sm', mode = 'foryou', preferredCategories = [], excludeIds = [] }: Props) {
  const { colors } = useTheme();
  const { preferredNewsLanguages } = usePreferences();
  const { articles, loading } = useApiNews(preferredNewsLanguages);
  const router = useRouter();

  const count = size === 'lg' ? 6 : size === 'md' ? 5 : 4;
  const items = selectArticlesForMode(articles, mode, preferredCategories, excludeIds).slice(0, count);

  const thumbSize = size === 'lg' ? 68 : size === 'md' ? 58 : 50;
  const titleSize = size === 'lg' ? 14 : size === 'md' ? 13 : 12;
  const titleLines = size === 'lg' ? 3 : 2;
  const gap = size === 'lg' ? 14 : size === 'md' ? 12 : 10;

  if (loading || items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Haberler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.list, { gap }]}>
      {items.map((article, idx) => {
        const catColor = CATEGORY_COLORS[article.category?.toLowerCase() ?? ''] ?? colors.accent;
        const img = proxyImageUrl(article.imageUrl ?? '');
        const isFirst = idx === 0 && size === 'lg';

        if (isFirst) {
          return (
            <Pressable
              key={article.id}
              style={({ pressed }) => [
                styles.featuredRow,
                { backgroundColor: colors.surfaceHigh, borderRadius: 16, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => router.push({ pathname: '/news/[id]', params: { id: article.id } })}
            >
              {img ? (
                <Image
                  source={{ uri: img }}
                  style={[styles.featuredThumb, { backgroundColor: colors.surfaceInput }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.featuredThumb, { backgroundColor: colors.surfaceInput }]} />
              )}
              <View style={styles.featuredText}>
                <Text style={[styles.rowCat, { color: catColor, fontSize: 9 }]}>
                  {article.category?.toUpperCase() ?? 'GENEL'}
                </Text>
                <Text style={[styles.rowTitle, { color: colors.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: '800' }]} numberOfLines={3}>
                  {article.title}
                </Text>
                <Text style={[styles.rowTime, { color: colors.textMuted }]}>
                  {timeAgo(article.publishedAt)}
                </Text>
              </View>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={article.id}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: '/news/[id]', params: { id: article.id } })}
          >
            {img ? (
              <Image
                source={{ uri: img }}
                style={[styles.thumb, { width: thumbSize, height: thumbSize, backgroundColor: colors.surfaceHigh }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.thumb, { width: thumbSize, height: thumbSize, backgroundColor: colors.surfaceHigh }]} />
            )}
            <View style={styles.rowText}>
              <Text style={[styles.rowCat, { color: catColor }]}>
                {article.category?.toUpperCase() ?? 'GENEL'}
              </Text>
              <Text
                style={[styles.rowTitle, { color: colors.textPrimary, fontSize: titleSize, lineHeight: titleSize * 1.45 }]}
                numberOfLines={titleLines}
              >
                {article.title}
              </Text>
              <Text style={[styles.rowTime, { color: colors.textMuted }]}>
                {timeAgo(article.publishedAt)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function selectArticlesForMode(
  articles: ApiArticle[],
  mode: NewsWidgetMode,
  preferredCategories: string[],
  excludeIds: string[]
): ApiArticle[] {
  const excluded = new Set(excludeIds);
  const pool = articles.filter((article) => !excluded.has(article.id));

  if (mode === 'popular') {
    return [...pool].sort((a, b) => popularityScore(b) - popularityScore(a));
  }

  if (mode === 'analysis') {
    return [...pool].sort((a, b) => analysisScore(b) - analysisScore(a));
  }

  const preferred = normalizeCategorySet(preferredCategories);
  if (preferred.size === 0) return pool;

  return [...pool].sort((a, b) => {
    const aPreferred = preferred.has(normalizeDisplayCategory(a));
    const bPreferred = preferred.has(normalizeDisplayCategory(b));
    if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function popularityScore(article: ApiArticle): number {
  const ageHours = Math.max(0, (Date.now() - new Date(article.publishedAt).getTime()) / 36e5);
  const title = article.title ?? '';
  const text = `${title} ${article.description ?? ''}`.toLowerCase();
  const recency = Math.max(0, 160 - ageHours * 4);
  const media = article.imageUrl ? 22 : 0;
  const sourceBoost = article.source?.type === 'rss' ? 12 : article.source?.type === 'newsapi' ? 8 : 4;
  const impactTerms = ['breaking', 'son dakika', 'champion', 'win', 'election', 'market', 'crisis', 'transfer', 'minister', 'president'];
  const impact = impactTerms.reduce((score, term) => score + (text.includes(term) ? 12 : 0), 0);

  return (article.viewCount ?? 0) * 100 + recency + media + sourceBoost + impact + stableEngagement(article.id);
}

function analysisScore(article: ApiArticle): number {
  const text = `${article.title ?? ''} ${article.description ?? ''} ${article.content ?? ''}`.toLowerCase();
  const ageHours = Math.max(0, (Date.now() - new Date(article.publishedAt).getTime()) / 36e5);
  const depth = Math.min(90, text.length / 18);
  const recency = Math.max(0, 80 - ageHours * 1.5);
  const analysisTerms = [
    'why', 'how', 'plan', 'policy', 'economy', 'market', 'election', 'government',
    'analysis', 'report', 'study', 'risk', 'impact', 'war', 'court', 'budget',
    'neden', 'nasil', 'politika', 'ekonomi', 'piyasa', 'secim', 'rapor', 'risk', 'etki',
  ];
  const context = analysisTerms.reduce((score, term) => score + (text.includes(term) ? 10 : 0), 0);
  const category = normalizeCategory(article.category);
  const categoryBoost = ['business', 'economy', 'politics', 'technology', 'science', 'general'].includes(category) ? 20 : 0;

  return depth + recency + context + categoryBoost;
}

function stableEngagement(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 70;
}

function normalizeCategorySet(categories: string[]): Set<string> {
  return new Set(categories.map(normalizeCategory).filter(Boolean));
}

function normalizeDisplayCategory(article: ApiArticle): string {
  return normalizeCategory(mapToContentCategory(article.category, article.title, article.description));
}

function normalizeCategory(category?: string): string {
  return (category ?? '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

const styles = StyleSheet.create({
  list: {},
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  thumb: { borderRadius: 10, flexShrink: 0 },
  rowText: { flex: 1, gap: 2 },
  rowCat: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  rowTitle: { fontWeight: '600' },
  rowTime: { fontSize: 10, fontWeight: '500' },
  featuredRow: { flexDirection: 'row', gap: 12, overflow: 'hidden' },
  featuredThumb: { width: 100, height: 80, borderRadius: 12 },
  featuredText: { flex: 1, gap: 5, padding: 4, justifyContent: 'center' },
  empty: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 12 },
});

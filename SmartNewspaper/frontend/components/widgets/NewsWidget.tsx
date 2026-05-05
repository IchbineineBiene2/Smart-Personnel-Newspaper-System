import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useApiNews } from '@/hooks/useNews';
import { proxyImageUrl } from '@/services/newsApi';
import type { WidgetSize } from './WidgetCard';

const CATEGORY_COLORS: Record<string, string> = {
  teknoloji: '#5442F5', spor: '#10b981', ekonomi: '#f59e0b',
  dunya: '#3b82f6', bilim: '#8b5cf6', saglik: '#ef4444',
  kultur: '#ec4899', genel: '#6b7280',
};

interface Props { size?: WidgetSize }

export function NewsWidget({ size = 'sm' }: Props) {
  const { colors } = useTheme();
  const { articles, loading } = useApiNews();
  const router = useRouter();

  const count = size === 'lg' ? 6 : size === 'md' ? 5 : 4;
  const items = articles.slice(0, count);

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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
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

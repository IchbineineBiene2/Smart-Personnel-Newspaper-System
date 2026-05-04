import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useApiNews } from '@/hooks/useNews';
import { proxyImageUrl } from '@/services/newsApi';

const CATEGORY_COLORS: Record<string, string> = {
  teknoloji: '#5442F5', spor: '#10b981', ekonomi: '#f59e0b',
  dunya: '#3b82f6', bilim: '#8b5cf6', saglik: '#ef4444',
  kultur: '#ec4899', genel: '#6b7280',
};

export function NewsWidget() {
  const { colors } = useTheme();
  const { articles, loading } = useApiNews();
  const router = useRouter();
  const items = articles.slice(0, 4);

  if (loading || items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Haberler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((article) => {
        const catColor = CATEGORY_COLORS[article.category?.toLowerCase() ?? ''] ?? colors.accent;
        const img = proxyImageUrl(article.imageUrl ?? '');
        return (
          <Pressable
            key={article.id}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: '/news/[id]', params: { id: article.id } })}
          >
            {img ? (
              <Image source={{ uri: img }} style={[styles.thumb, { backgroundColor: colors.surfaceHigh }]} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.surfaceHigh }]} />
            )}
            <View style={styles.rowText}>
              <Text style={[styles.rowCat, { color: catColor }]}>
                {article.category?.toUpperCase() ?? 'GENEL'}
              </Text>
              <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={2}>
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
  list: { gap: 12 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  rowText: { flex: 1, gap: 2 },
  rowCat: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  rowTitle: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  rowTime: { fontSize: 10, fontWeight: '500' },
  empty: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 12 },
});

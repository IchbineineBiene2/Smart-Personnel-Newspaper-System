import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useApiNews } from '@/hooks/useNews';
import { proxyImageUrl } from '@/services/newsApi';

export function SportsWidget() {
  const { colors } = useTheme();
  const { articles } = useApiNews();
  const sportNews = articles
    .filter((a) => a.category?.toLowerCase().includes('spor'))
    .slice(0, 3);

  if (sportNews.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Spor haberleri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {sportNews.map((item) => {
        const img = proxyImageUrl(item.imageUrl ?? '');
        return (
          <View key={item.id} style={[styles.row, { borderColor: colors.borderSubtle }]}>
            {img ? (
              <Image source={{ uri: img }} style={[styles.thumb, { backgroundColor: colors.surfaceHigh }]} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.surfaceHigh }]} />
            )}
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  title: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  empty: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 12 },
});

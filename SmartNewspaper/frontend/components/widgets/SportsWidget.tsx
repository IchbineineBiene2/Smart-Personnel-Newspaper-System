import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useApiNews } from '@/hooks/useNews';
import { proxyImageUrl } from '@/services/newsApi';
import type { WidgetSize } from './WidgetCard';

interface Props { size?: WidgetSize }

export function SportsWidget({ size = 'sm' }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const { articles } = useApiNews();
  const count = size === 'lg' ? 5 : size === 'md' ? 4 : 3;
  const sportNews = articles
    .filter((a) => a.category?.toLowerCase().includes('spor') || a.category?.toLowerCase() === 'sports')
    .slice(0, count);

  if (sportNews.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>Spor haberleri yükleniyor...</Text>
      </View>
    );
  }

  const thumbSize = size === 'lg' ? 60 : size === 'md' ? 52 : 44;
  const titleSize = size === 'lg' ? 14 : size === 'md' ? 13 : 12;

  return (
    <View style={[styles.list, { gap: size === 'lg' ? 12 : 10 }]}>
      {sportNews.map((item) => {
        const img = proxyImageUrl(item.imageUrl ?? '');
        return (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.row, { borderColor: colors.borderSubtle, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
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
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: titleSize, lineHeight: titleSize * 1.45 }]} numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {},
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  thumb: { borderRadius: 10 },
  title: { flex: 1, fontWeight: '600' },
  empty: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 12 },
});

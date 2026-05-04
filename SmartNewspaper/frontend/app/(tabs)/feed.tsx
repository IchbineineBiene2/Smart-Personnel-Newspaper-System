import { useEffect, useMemo, useRef } from 'react';
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
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';

export default function FeedScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { articles, loading } = useApiNews();
  const { preferredCategories } = usePreferences();
  const { savedIds, toggleSaved } = useBookmarks();
  const entrance = useRef(new Animated.Value(0)).current;
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, []);

  const feedItems = useMemo(() => {
    const ranked = articles.map((article, index) => {
      const category = mapToContentCategory(article.category, article.title, article.description);
      const matchesPreference =
        preferredCategories.length === 0 || preferredCategories.includes(category);
      return { article, category, score: matchesPreference ? 2 : 1, index };
    });

    return ranked
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 60);
  }, [articles, preferredCategories]);

  const openArticle = (item: (typeof feedItems)[number]) => {
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

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.header,
          {
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Kişisel <Text style={{ color: colors.accent, fontStyle: 'italic' }}>Akış</Text>
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Tercihlerinizden öğrenen, hızlı gezilebilir haber zaman tüneli.
        </Text>
        <View style={styles.prefRow}>
          {(preferredCategories.length ? preferredCategories : ['Tüm haberler']).slice(0, 5).map((label) => (
            <View key={label} style={[styles.prefChip, { backgroundColor: colors.accent + '16', borderColor: colors.accent + '32' }]}>
              <Text style={[styles.prefText, { color: colors.accent }]}>{label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {loading && feedItems.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Akış hazırlanıyor...</Text>
        </View>
      ) : (
        <Animated.View style={[styles.feed, { opacity: entrance }]}>
          {feedItems.map((item, index) => {
            const article = item.article;
            const image = proxyImageUrl(article.imageUrl);
            const isSaved = savedIds.includes(article.id);

            return (
              <Pressable
                key={article.id}
                onPress={() => openArticle(item)}
                style={({ pressed }) => [
                  styles.post,
                  {
                    backgroundColor: pressed ? colors.surfaceHigh : colors.surface,
                    borderColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: colors.accent + '18' }]}>
                  <Text style={[styles.avatarText, { color: colors.accent }]}>
                    {article.source.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.postBody}>
                  <View style={styles.postMeta}>
                    <Text style={[styles.source, { color: colors.textPrimary }]} numberOfLines={1}>
                      {article.source.name}
                    </Text>
                    <Text style={[styles.dot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.time, { color: colors.textMuted }]}>{timeAgo(article.publishedAt)}</Text>
                    <View style={[styles.categoryChip, { backgroundColor: colors.accent + '14' }]}>
                      <Text style={[styles.categoryText, { color: colors.accent }]}>{item.category}</Text>
                    </View>
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
                    <Pressable style={styles.action} onPress={() => shareArticle(article.title, article.url)}>
                      <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
                      <Text style={[styles.actionText, { color: colors.textMuted }]}>Paylaş</Text>
                    </Pressable>
                    <View style={styles.action}>
                      <Ionicons name="pulse-outline" size={18} color={colors.textMuted} />
                      <Text style={[styles.actionText, { color: colors.textMuted }]}>#{index + 1}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </ScrollView>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  return `${Math.floor(h / 24)} gün`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  webContent: { width: '100%' as any, maxWidth: 760, alignSelf: 'center', paddingTop: 42 },
  header: { gap: 8 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  prefChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  prefText: { fontSize: 11, fontWeight: '800' },
  loading: { paddingVertical: 72, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13, fontWeight: '700' },
  feed: { gap: 14 },
  post: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 24, padding: 16 },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '900' },
  postBody: { flex: 1, minWidth: 0, gap: 9 },
  postMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  source: { fontSize: 13, fontWeight: '900', maxWidth: 160 },
  dot: { fontSize: 12, fontWeight: '800' },
  time: { fontSize: 12, fontWeight: '700' },
  categoryChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  postTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  description: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
  postImage: { width: '100%', height: 280, borderRadius: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 12, fontWeight: '800' },
});

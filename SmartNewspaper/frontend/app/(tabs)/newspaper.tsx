import { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useApiNews } from '@/hooks/useNews';
import { useBookmarks } from '@/hooks/useBookmarks';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { ApiArticle, fetchArticleFullContent, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { exportNewspaperPdf } from '@/services/pdf/newspaperPdfExporter';
import { NewspaperArticleInput } from '@/services/pdf/newspaperPdfTemplate';
import { exportInteractiveNewspaperHtml } from '@/services/pdf/interactiveNewspaperHtmlExporter';
import { createEdition } from '@/services/archive';
import { getToken } from '@/services/auth';

type DateFilter = 'day' | 'week' | 'all';
type CountOption = 6 | 9 | 12;

function dateMatchesFilter(publishedAt: string, filter: DateFilter) {
  if (filter === 'all') return true;
  const age = Date.now() - new Date(publishedAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  return filter === 'day' ? age <= day : age <= day * 7;
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

function scoreArticle(article: ApiArticle, preferredCategories: string[], savedIds: string[]) {
  const category = mapToContentCategory(article.category, article.title, article.description);
  const preferenceBoost = preferredCategories.includes(category) ? 60 : 0;
  const savedBoost = savedIds.includes(article.id) ? 45 : 0;
  const imageBoost = article.imageUrl ? 12 : 0;
  const ageHours = Math.max(1, Math.floor((Date.now() - new Date(article.publishedAt).getTime()) / 3600000));
  const freshness = Math.max(0, 72 - ageHours);
  return preferenceBoost + savedBoost + imageBoost + freshness;
}

export default function NewspaperBuilder() {
  const { colors } = useTheme();
  const { articles, loading } = useApiNews();
  const { savedIds } = useBookmarks();
  const { preferredCategories } = usePreferences();
  const isWeb = Platform.OS === 'web';

  const [paperName, setPaperName] = useState('Smart Newspaper');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(preferredCategories);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [articleCount, setArticleCount] = useState<CountOption>(9);
  const [imagesOnly, setImagesOnly] = useState(false);
  const [savedFirst, setSavedFirst] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsInitializing(true);
      const timer = setTimeout(() => setIsInitializing(false), 800);
      return () => clearTimeout(timer);
    }, [])
  );

  useEffect(() => {
    const loadToken = async () => {
      const token = await getToken();
      setUserToken(token);
    };
    loadToken();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((article) => {
      set.add(mapToContentCategory(article.category, article.title, article.description));
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [articles]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((article) => set.add(article.source.name));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr')).slice(0, 24);
  }, [articles]);

  const selectedArticles = useMemo(() => {
    const categorySet = new Set(selectedCategories);
    return articles
      .filter((article) => {
        const category = mapToContentCategory(article.category, article.title, article.description);
        if (categorySet.size > 0 && !categorySet.has(category)) return false;
        if (selectedSource !== 'all' && article.source.name !== selectedSource) return false;
        if (imagesOnly && !article.imageUrl) return false;
        return dateMatchesFilter(article.publishedAt, dateFilter);
      })
      .sort((a, b) => {
        if (savedFirst) {
          const savedDiff = Number(savedIds.includes(b.id)) - Number(savedIds.includes(a.id));
          if (savedDiff !== 0) return savedDiff;
        }
        return (
          scoreArticle(b, preferredCategories, savedIds) -
            scoreArticle(a, preferredCategories, savedIds) ||
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      })
      .slice(0, articleCount);
  }, [
    articles,
    articleCount,
    dateFilter,
    imagesOnly,
    preferredCategories,
    savedFirst,
    savedIds,
    selectedCategories,
    selectedSource,
  ]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearCategories = () => setSelectedCategories([]);

  const mapForPdf = async (article: ApiArticle): Promise<NewspaperArticleInput> => {
    let content = article.content || article.description || '';
    let imageUrl = article.imageUrl ? proxyImageUrl(article.imageUrl) : undefined;

    try {
      const full = await fetchArticleFullContent(article.id);
      if (full.content?.trim()) content = full.content;
      if (!imageUrl && full.images?.[0]) imageUrl = proxyImageUrl(full.images[0]) || full.images[0];
    } catch {
      // Export still works with the article summary when full scraping is unavailable.
    }

    return {
      id: article.id,
      title: article.title,
      summary: article.description || '',
      content,
      category: mapToContentCategory(article.category, article.title, article.description),
      source: article.source.name,
      date: article.publishedAt,
      imageUrl,
      relevanceScore: scoreArticle(article, preferredCategories, savedIds),
    };
  };

  const exportPaper = async () => {
    if (!userToken) {
      Alert.alert('Uyarı', 'Gazete oluşturmak için giriş yapmalısınız.');
      return;
    }

    if (selectedArticles.length === 0) {
      Alert.alert('Uyarı', 'Gazete oluşturmak için haber bulunamadı.');
      return;
    }

    try {
      setExporting(true);
      const pdfArticles = await Promise.all(selectedArticles.map(mapForPdf));
      
      // Gazeteyi arşive kaydet
      await createEdition(
        paperName.trim() || 'Smart Newspaper',
        `${selectedCategories.join(', ')} kategorilerinden seçilmiş ${selectedArticles.length} haber`,
        selectedArticles.map((a) => parseInt(a.id, 10)).filter((n) => !isNaN(n)),
        userToken
      );

      // PDF indir
      await exportNewspaperPdf({
        engine: Platform.OS === 'web' ? 'react-pdf' : 'html-css',
        newspaperName: paperName.trim() || 'Smart Newspaper',
        generatedAt: new Date().toISOString(),
        shareTitle: `${paperName.trim() || 'Smart Newspaper'} - ${new Date().toLocaleDateString('tr-TR')}`,
        personalization: {
          preferredCategories: selectedCategories,
        },
        articles: pdfArticles,
      });

      Alert.alert('Başarılı', 'Gazete oluşturuldu ve arşivde kaydedildi.');
    } catch (error) {
      console.error('Newspaper export error:', error);
      Alert.alert('Hata', 'Gazete oluşturulurken bir sorun oluştu.');
    } finally {
      setExporting(false);
    }
  };

  const exportInteractiveHtml = async () => {
    if (!userToken) {
      Alert.alert('Uyarı', 'Gazete oluşturmak için giriş yapmalısınız.');
      return;
    }

    if (selectedArticles.length === 0) {
      Alert.alert('Uyarı', 'Gazete oluşturmak için haber bulunamadı.');
      return;
    }

    if (Platform.OS !== 'web') {
      Alert.alert('Uyarı', 'Etkileşimli HTML export şu an web üzerinden destekleniyor.');
      return;
    }

    try {
      setExportingHtml(true);
      const htmlArticles = await Promise.all(selectedArticles.map(mapForPdf));
      
      // Gazeteyi arşive kaydet
      await createEdition(
        paperName.trim() || 'Smart Newspaper',
        `${selectedCategories.join(', ')} kategorilerinden seçilmiş ${selectedArticles.length} haber`,
        selectedArticles.map((a) => parseInt(a.id, 10)).filter((n) => !isNaN(n)),
        userToken
      );

      // HTML indir
      await exportInteractiveNewspaperHtml({
        newspaperName: paperName.trim() || 'Smart Newspaper',
        generatedAt: new Date().toISOString(),
        personalization: {
          preferredCategories: selectedCategories,
        },
        articles: htmlArticles,
      });

      Alert.alert('Başarılı', 'İnteraktif gazete oluşturuldu ve arşivde kaydedildi.');
    } catch (error) {
      console.error('Interactive HTML export error:', error);
      Alert.alert('Hata', 'HTML gazete oluşturulurken bir sorun oluştu.');
    } finally {
      setExportingHtml(false);
    }
  };

  const leadArticle = selectedArticles[0];
  const secondaryArticles = selectedArticles.slice(1);

  return (
    <>
      {(isInitializing || loading) && (
        <View style={[styles.fullscreenLoading, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Gazete hazırlanıyor...</Text>
        </View>
      )}
      
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, isWeb && styles.webContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
        <View style={[styles.kicker, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '30' }]}>
          <Ionicons name="newspaper" size={14} color={colors.accent} />
          <Text style={[styles.kickerText, { color: colors.accent }]}>KISISel GAZETE</Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Kendi Gazeteni Olustur</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Haberleri kategori, kaynak ve zaman araligina gore filtrele; gercek icerik ve gorsellerle PDF olarak indir.
        </Text>
      </View>

      <View style={[styles.builderLayout, isWeb && styles.builderLayoutWeb]}>
        <View style={styles.controls}>
          <View style={[styles.controlSection, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>Gazete Bilgisi</Text>
            <TextInput
              value={paperName}
              onChangeText={setPaperName}
              placeholder="Gazete adi"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceInput }]}
            />
          </View>

          <View style={[styles.controlSection, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <View style={styles.controlTitleRow}>
              <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>Kategoriler</Text>
              <Pressable onPress={clearCategories}>
                <Text style={[styles.clearText, { color: colors.accent }]}>Tumu</Text>
              </Pressable>
            </View>
            <View style={styles.chipWrap}>
              {categories.map((category) => {
                const active = selectedCategories.includes(category);
                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.accent : colors.surfaceInput,
                        borderColor: active ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text style={[styles.filterChipText, { color: active ? colors.white : colors.textSecondary }]}>
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.controlSection, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>Kaynak</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
              <Pressable
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedSource === 'all' ? colors.accent : colors.surfaceInput,
                    borderColor: selectedSource === 'all' ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => setSelectedSource('all')}
              >
                <Text style={[styles.filterChipText, { color: selectedSource === 'all' ? colors.white : colors.textSecondary }]}>
                  Tum kaynaklar
                </Text>
              </Pressable>
              {sources.map((source) => {
                const active = selectedSource === source;
                return (
                  <Pressable
                    key={source}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.accent : colors.surfaceInput,
                        borderColor: active ? colors.accent : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setSelectedSource(source)}
                  >
                    <Text style={[styles.filterChipText, { color: active ? colors.white : colors.textSecondary }]}>
                      {source}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.controlSection, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <Text style={[styles.controlTitle, { color: colors.textPrimary }]}>Filtreler</Text>
            <View style={styles.segmentRow}>
              {[
                ['day', 'Bugun'],
                ['week', 'Bu Hafta'],
                ['all', 'Tumu'],
              ].map(([value, label]) => {
                const active = dateFilter === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.segmentButton, { backgroundColor: active ? colors.accent : colors.surfaceInput }]}
                    onPress={() => setDateFilter(value as DateFilter)}
                  >
                    <Text style={[styles.segmentText, { color: active ? colors.white : colors.textSecondary }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.segmentRow}>
              {([6, 9, 12] as CountOption[]).map((count) => {
                const active = articleCount === count;
                return (
                  <Pressable
                    key={count}
                    style={[styles.segmentButton, { backgroundColor: active ? colors.accent : colors.surfaceInput }]}
                    onPress={() => setArticleCount(count)}
                  >
                    <Text style={[styles.segmentText, { color: active ? colors.white : colors.textSecondary }]}>
                      {count} haber
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.toggleRow} onPress={() => setImagesOnly((current) => !current)}>
              <Ionicons name={imagesOnly ? 'checkbox' : 'square-outline'} size={20} color={colors.accent} />
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>Sadece gorselli haberler</Text>
            </Pressable>
            <Pressable style={styles.toggleRow} onPress={() => setSavedFirst((current) => !current)}>
              <Ionicons name={savedFirst ? 'checkbox' : 'square-outline'} size={20} color={colors.accent} />
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>Kaydedilenlere oncelik ver</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.exportButton, { backgroundColor: colors.accent, opacity: exporting || selectedArticles.length === 0 ? 0.6 : 1 }]}
            onPress={exportPaper}
            disabled={exporting || selectedArticles.length === 0}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={20} color="#fff" />
            )}
            <Text style={styles.exportText}>{exporting ? 'PDF hazirlaniyor...' : 'PDF Olarak Export Et'}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.exportButton,
              styles.htmlExportButton,
              {
                borderColor: colors.accent,
                opacity: exportingHtml || selectedArticles.length === 0 ? 0.6 : 1,
              },
            ]}
            onPress={exportInteractiveHtml}
            disabled={exportingHtml || selectedArticles.length === 0}
          >
            {exportingHtml ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Ionicons name="code-slash-outline" size={20} color={colors.accent} />
            )}
            <Text style={[styles.exportText, { color: colors.accent }]}>
              {exportingHtml ? 'HTML hazirlaniyor...' : 'Etkilesimli HTML Export'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.preview, { borderColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
          <View style={[styles.paperMasthead, { borderBottomColor: colors.textPrimary }]}>
            <Text style={[styles.paperTitle, { color: colors.textPrimary }]}>{paperName || 'Smart Newspaper'}</Text>
            <Text style={[styles.paperSub, { color: colors.textMuted }]}>
              {new Date().toLocaleDateString('tr-TR')} | {selectedArticles.length} haber
            </Text>
          </View>

          {loading ? (
            <View style={styles.emptyPreview}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Haberler yukleniyor...</Text>
            </View>
          ) : !leadArticle ? (
            <View style={styles.emptyPreview}>
              <Ionicons name="newspaper-outline" size={42} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu filtrelerle haber bulunamadi.</Text>
            </View>
          ) : (
            <>
              <View style={styles.leadStory}>
                {leadArticle.imageUrl ? (
                  <Image source={{ uri: proxyImageUrl(leadArticle.imageUrl) }} style={styles.leadImage} resizeMode="cover" />
                ) : null}
                <View style={styles.leadBody}>
                  <Text style={[styles.leadCategory, { color: colors.accent }]}>
                    {mapToContentCategory(leadArticle.category, leadArticle.title, leadArticle.description).toUpperCase()}
                  </Text>
                  <Text style={[styles.leadTitle, { color: colors.textPrimary }]}>{leadArticle.title}</Text>
                  {!!leadArticle.description && (
                    <Text style={[styles.leadSummary, { color: colors.textSecondary }]} numberOfLines={4}>
                      {leadArticle.description}
                    </Text>
                  )}
                  <Text style={[styles.articleMeta, { color: colors.textMuted }]}>
                    {leadArticle.source.name} | {shortDate(leadArticle.publishedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.articleGrid}>
                {secondaryArticles.map((article) => (
                  <View key={article.id} style={[styles.previewArticle, { borderTopColor: colors.borderSubtle }]}>
                    {article.imageUrl ? (
                      <Image source={{ uri: proxyImageUrl(article.imageUrl) }} style={styles.previewImage} resizeMode="cover" />
                    ) : null}
                    <Text style={[styles.previewCategory, { color: colors.accent }]}>
                      {mapToContentCategory(article.category, article.title, article.description)}
                    </Text>
                    <Text style={[styles.previewTitle, { color: colors.textPrimary }]} numberOfLines={3}>
                      {article.title}
                    </Text>
                    <Text style={[styles.previewSummary, { color: colors.textSecondary }]} numberOfLines={3}>
                      {article.description}
                    </Text>
                    <Text style={[styles.articleMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {article.source.name} | {shortDate(article.publishedAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 64, gap: 22 },
  webContent: { width: '100%' as any, maxWidth: 1280, alignSelf: 'center', paddingTop: 32 },
  header: { gap: 8 },
  kicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  kickerText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 21, fontWeight: '600', maxWidth: 760 },
  builderLayout: { gap: 18 },
  builderLayoutWeb: { flexDirection: 'row', alignItems: 'flex-start' },
  controls: { gap: 12, flex: 0.72, minWidth: 300 },
  controlSection: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  controlTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controlTitle: { fontSize: 15, fontWeight: '800' },
  clearText: { fontSize: 12, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  horizontalChips: { gap: 8, paddingRight: 8 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  filterChipText: { fontSize: 12, fontWeight: '800' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentButton: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8 },
  segmentText: { fontSize: 12, fontWeight: '800' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  toggleText: { fontSize: 13, fontWeight: '700' },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 14,
    paddingVertical: 14,
  },
  htmlExportButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  exportText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  preview: { flex: 1.28, borderWidth: 1, borderRadius: 18, padding: 18, gap: 16, minHeight: 620 },
  paperMasthead: { alignItems: 'center', borderBottomWidth: 2, paddingBottom: 12, gap: 4 },
  paperTitle: { fontFamily: 'serif', fontSize: 42, fontWeight: '900', textAlign: 'center' },
  paperSub: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  emptyPreview: { minHeight: 420, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  leadStory: { gap: 14 },
  leadImage: { width: '100%', height: 260, borderRadius: 10 },
  leadBody: { gap: 7 },
  leadCategory: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  leadTitle: { fontFamily: 'serif', fontSize: 31, lineHeight: 36, fontWeight: '900' },
  leadSummary: { fontSize: 14, lineHeight: 22 },
  articleMeta: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  articleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  previewArticle: { width: Platform.OS === 'web' ? 'calc(50% - 6px)' as any : '100%', borderTopWidth: 1, paddingTop: 12, gap: 6 },
  previewImage: { width: '100%', height: 130, borderRadius: 8 },
  previewCategory: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  previewTitle: { fontFamily: 'serif', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  previewSummary: { fontSize: 12, lineHeight: 18 },
  fullscreenLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

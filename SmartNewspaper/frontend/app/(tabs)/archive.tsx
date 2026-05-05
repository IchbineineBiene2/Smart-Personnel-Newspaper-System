import { useMemo, useState } from 'react';
import {
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
import { useRouter } from 'expo-router';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useApiNews } from '@/hooks/useNews';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import {
  ARCHIVED_EDITIONS,
  ArchivedArticle,
  ArchivedEdition,
  getEditionArticles,
  searchArchive,
} from '@/services/archive';
import { exportNewspaperPdf } from '@/services/pdf/newspaperPdfExporter';
import { ApiArticle, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';

type ScreenState = 'list' | 'detail' | 'search';
type ArchiveTab = 'editions' | 'saved';

async function downloadEditionPdf(
  edition: ArchivedEdition,
  articles: ArchivedArticle[],
  preferredCategories: string[]
) {
  try {
    await exportNewspaperPdf({
      engine: Platform.OS === 'web' ? 'react-pdf' : 'html-css',
      newspaperName: 'Smart Newspaper',
      generatedAt: edition.generatedAt,
      shareTitle: edition.title,
      personalization: { preferredCategories },
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        summary: article.excerpt,
        content: article.excerpt,
        category: article.category,
        source: article.source,
        date: article.publishedAt,
        imageUrl: article.imageUrl,
      })),
    });
  } catch {
    Alert.alert('Hata', 'PDF olusturulurken bir sorun olustu.');
  }
}

export default function Archive() {
  const router = useRouter();
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';
  const { articles } = useApiNews();
  const { savedIds, toggleSaved } = useBookmarks();
  const { preferredCategories } = usePreferences();
  const [screen, setScreen] = useState<ScreenState>('list');
  const [activeTab, setActiveTab] = useState<ArchiveTab>('editions');
  const [selectedEdition, setSelectedEdition] = useState<ArchivedEdition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const editionArticles = useMemo(() => {
    if (!selectedEdition) return [];
    return getEditionArticles(selectedEdition.id);
  }, [selectedEdition]);

  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return [];
    return searchArchive(searchQuery.trim());
  }, [searchQuery]);

  const savedArticles = useMemo(
    () =>
      savedIds
        .map((id) => articles.find((article) => article.id === id))
        .filter((article): article is ApiArticle => Boolean(article)),
    [articles, savedIds]
  );

  const openEdition = (edition: ArchivedEdition) => {
    setSelectedEdition(edition);
    setScreen('detail');
  };

  const goBack = () => {
    setScreen('list');
    setSelectedEdition(null);
    setSearchQuery('');
  };

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const openArticle = (article: ApiArticle) => {
    const category = mapToContentCategory(article.category, article.title, article.description);
    router.push({
      pathname: '/news/[id]',
      params: {
        id: article.id,
        title: article.title,
        summary: article.description,
        imageUrl: article.imageUrl ?? '',
        source: article.source.name,
        publishedAt: article.publishedAt,
        category,
      },
    });
  };

  if (screen === 'search') {
    return (
      <ScrollView style={s(colors).container} contentContainerStyle={[s(colors).content, isWeb && s(colors).webContent]}>
        <Pressable style={s(colors).backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
          <Text style={s(colors).backText}>Arsive Don</Text>
        </Pressable>

        <Text style={s(colors).sectionTitle}>Arsivde Ara</Text>

        <View style={s(colors).searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={s(colors).searchInput}
            placeholder="Baslik, kategori veya kaynak ara..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {searchQuery.trim().length < 2 ? (
          <Text style={s(colors).emptyText}>En az 2 karakter girin.</Text>
        ) : searchResults.length === 0 ? (
          <Text style={s(colors).emptyText}>Sonuc bulunamadi.</Text>
        ) : (
          <>
            <Text style={s(colors).resultCount}>{searchResults.length} sonuc bulundu</Text>
            {searchResults.map((article) => (
              <View key={article.id} style={s(colors).card}>
                <View style={s(colors).cardHeader}>
                  <View style={s(colors).categoryBadge}>
                    <Text style={s(colors).categoryText}>{article.category}</Text>
                  </View>
                  <Text style={s(colors).cardSource}>{article.source}</Text>
                </View>
                <Text style={s(colors).cardTitle}>{article.title}</Text>
                <Text style={s(colors).cardBody}>{article.excerpt}</Text>
                <Text style={s(colors).cardMeta}>{article.publishedAt}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  }

  if (screen === 'detail' && selectedEdition) {
    return (
      <ScrollView style={s(colors).container} contentContainerStyle={[s(colors).content, isWeb && s(colors).webContent]}>
        <Pressable style={s(colors).backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
          <Text style={s(colors).backText}>Arsive Don</Text>
        </Pressable>

        <View style={s(colors).editionHeader}>
          <Text style={s(colors).editionTitle}>{selectedEdition.title}</Text>
          <Text style={s(colors).editionDate}>{formatDate(selectedEdition.generatedAt)}</Text>
          <View style={s(colors).chipGroup}>
            {selectedEdition.categories.map((cat) => (
              <View key={cat} style={s(colors).categoryBadge}>
                <Text style={s(colors).categoryText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable
          style={s(colors).downloadButton}
          onPress={() => downloadEditionPdf(selectedEdition, editionArticles, preferredCategories)}
        >
          <Ionicons name="download-outline" size={20} color={colors.white} />
          <Text style={s(colors).downloadText}>PDF Olarak Indir</Text>
        </Pressable>

        <Text style={s(colors).sectionTitle}>Makaleler ({editionArticles.length})</Text>

        {editionArticles.length === 0 ? (
          <Text style={s(colors).emptyText}>Bu edisyonda makale bulunamadi.</Text>
        ) : (
          editionArticles.map((article) => (
            <View key={article.id} style={s(colors).card}>
              <View style={s(colors).cardHeader}>
                <View style={s(colors).categoryBadge}>
                  <Text style={s(colors).categoryText}>{article.category}</Text>
                </View>
                <Text style={s(colors).cardSource}>{article.source}</Text>
              </View>
              <Text style={s(colors).cardTitle}>{article.title}</Text>
              <Text style={s(colors).cardBody}>{article.excerpt}</Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s(colors).container} contentContainerStyle={[s(colors).content, isWeb && s(colors).webContent]}>
      <View style={[s(colors).tabs, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TabButton
          active={activeTab === 'editions'}
          icon="newspaper-outline"
          label="Kisisel Gazete"
          colors={colors}
          onPress={() => setActiveTab('editions')}
        />
        <TabButton
          active={activeTab === 'saved'}
          icon="bookmark-outline"
          label="Kaydedilenler"
          colors={colors}
          onPress={() => setActiveTab('saved')}
        />
      </View>

      <View style={s(colors).topActions}>
        <Pressable style={s(colors).searchButton} onPress={() => setScreen('search')}>
          <Ionicons name="search-outline" size={18} color={colors.accent} />
          <Text style={s(colors).searchButtonText}>Arsivde Ara</Text>
        </Pressable>
      </View>

      {activeTab === 'editions' ? (
        <>
          <Text style={s(colors).sectionTitle}>Kisisel Gazeteler</Text>
          <Text style={s(colors).sectionSubtitle}>Daha once olusturulmus kisisel gazeteleriniz</Text>

          {ARCHIVED_EDITIONS.map((edition) => (
            <Pressable key={edition.id} style={s(colors).editionCard} onPress={() => openEdition(edition)}>
              <View style={s(colors).editionCardTop}>
                <View style={s(colors).editionIcon}>
                  <Ionicons name="newspaper-outline" size={24} color={colors.accent} />
                </View>
                <View style={s(colors).editionInfo}>
                  <Text style={s(colors).editionCardTitle}>{edition.title}</Text>
                  <Text style={s(colors).editionCardDate}>{formatDate(edition.generatedAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              <Text style={s(colors).editionSummary}>{edition.summary}</Text>
              <View style={s(colors).editionFooter}>
                <View style={s(colors).chipGroup}>
                  {edition.categories.map((cat) => (
                    <View key={cat} style={s(colors).chipSmall}>
                      <Text style={s(colors).chipSmallText}>{cat}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s(colors).articleCount}>{edition.articleCount} makale</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={s(colors).sectionTitle}>Kaydedilenler</Text>
          <Text style={s(colors).sectionSubtitle}>Sonradan okumak icin kaydettiginiz haberler</Text>

          {savedArticles.length === 0 ? (
            <View style={s(colors).savedEmpty}>
              <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
              <Text style={s(colors).emptyText}>Henuz kaydedilen haber yok.</Text>
            </View>
          ) : (
            <View style={s(colors).savedGrid}>
              {savedArticles.map((article, index) => {
                const category = mapToContentCategory(article.category, article.title, article.description);
                const imageUrl = article.imageUrl ? proxyImageUrl(article.imageUrl) : undefined;
                const wide = isWeb && index % 5 === 0;

                return (
                  <Pressable
                    key={article.id}
                    style={({ pressed }) => [
                      s(colors).savedCard,
                      wide ? s(colors).savedCardWide : null,
                      { opacity: pressed ? 0.86 : 1 },
                    ]}
                    onPress={() => openArticle(article)}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={s(colors).savedImage} resizeMode="cover" />
                    ) : (
                      <View style={s(colors).savedImagePlaceholder}>
                        <Ionicons name="newspaper-outline" size={28} color={colors.accent} />
                      </View>
                    )}
                    <View style={s(colors).savedCardBody}>
                      <View style={s(colors).savedMetaRow}>
                        <View style={s(colors).categoryBadge}>
                          <Text style={s(colors).categoryText}>{category}</Text>
                        </View>
                        <Pressable
                          style={s(colors).removeSavedButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            toggleSaved(article.id);
                          }}
                        >
                          <Ionicons name="bookmark" size={16} color={colors.accent} />
                        </Pressable>
                      </View>
                      <Text style={s(colors).savedTitle} numberOfLines={3}>{article.title}</Text>
                      {!!article.description && (
                        <Text style={s(colors).savedSummary} numberOfLines={2}>{article.description}</Text>
                      )}
                      <Text style={s(colors).savedSource} numberOfLines={1}>
                        {article.source.name} - {new Date(article.publishedAt).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function TabButton({
  active,
  icon,
  label,
  colors,
  onPress,
}: {
  active: boolean;
  icon: string;
  label: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        s(colors).tabButton,
        active && { backgroundColor: colors.accent },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={16} color={active ? colors.white : colors.textMuted} />
      <Text style={[s(colors).tabText, { color: active ? colors.white : colors.textMuted }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const s = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingBottom: 100,
      gap: 18,
    },
    webContent: {
      maxWidth: 1080,
      width: '100%' as any,
      alignSelf: 'center',
      paddingTop: 48,
    },
    tabs: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 14,
      padding: 4,
      gap: 4,
      alignSelf: 'flex-start',
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    topActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    searchButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.full,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    searchButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      fontSize: 32,
      color: colors.textPrimary,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: -Spacing.sm,
    },
    editionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 24,
      padding: 22,
      gap: 14,
    },
    editionCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    editionIcon: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.accent + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editionInfo: {
      flex: 1,
      gap: 2,
    },
    editionCardTitle: {
      fontSize: 17,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    editionCardDate: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    editionSummary: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    editionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    chipGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    chipSmall: {
      backgroundColor: colors.accent + '14',
      borderRadius: Radius.full,
      paddingVertical: 2,
      paddingHorizontal: Spacing.sm,
    },
    chipSmallText: {
      fontSize: Typography.fontSize.xs,
      color: colors.accent,
      fontWeight: Typography.fontWeight.medium,
    },
    articleCount: {
      fontSize: 12,
      color: colors.textMuted,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    backText: {
      color: colors.accent,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
    },
    editionHeader: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 24,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    editionTitle: {
      fontSize: Typography.fontSize.xl,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    editionDate: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    downloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: Spacing.md,
    },
    downloadText: {
      color: colors.white,
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 22,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    categoryBadge: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.full,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
    },
    categoryText: {
      fontSize: Typography.fontSize.xs,
      color: colors.accent,
      fontWeight: Typography.fontWeight.bold,
    },
    cardSource: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    cardTitle: {
      fontSize: Typography.fontSize.md,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    cardBody: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    cardMeta: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      paddingVertical: Spacing.xs,
    },
    resultCount: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    emptyText: {
      fontSize: Typography.fontSize.base,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: Spacing.xl,
    },
    savedEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
      gap: 12,
    },
    savedGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'stretch',
    },
    savedCard: {
      width: Platform.OS === 'web' ? 'calc(50% - 8px)' as any : '100%',
      minWidth: Platform.OS === 'web' ? 320 : undefined,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: 18,
      overflow: 'hidden',
    },
    savedCardWide: {
      width: '100%' as any,
    },
    savedImage: {
      width: '100%',
      height: 190,
      backgroundColor: colors.surfaceHigh,
    },
    savedImagePlaceholder: {
      width: '100%',
      height: 150,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHigh,
    },
    savedCardBody: {
      padding: 14,
      gap: 9,
    },
    savedMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    removeSavedButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent + '14',
    },
    savedTitle: {
      color: colors.textPrimary,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '900',
    },
    savedSummary: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    savedSource: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
  });

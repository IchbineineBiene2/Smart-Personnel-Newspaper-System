import { useState, useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/hooks/useTheme';
import {
  ARCHIVED_EDITIONS,
  getEditionArticles,
  searchArchive,
  ArchivedEdition,
  ArchivedArticle,
} from '@/services/archive';
import { Radius, Spacing, Typography } from '@/constants/theme';

function generateEditionHtml(edition: ArchivedEdition, articles: ArchivedArticle[]): string {
  const articleRows = articles
    .map(
      (a) => `
      <div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;">
        <span style="background:#f0e6d3;padding:2px 10px;border-radius:12px;font-size:11px;color:#3D2B1F;font-weight:600;">${a.category}</span>
        <span style="float:right;font-size:11px;color:#999;">${a.source}</span>
        <h3 style="margin:8px 0 4px;font-size:15px;color:#3B2A1A;">${a.title}</h3>
        <p style="margin:0;font-size:13px;color:#7A5C3A;line-height:1.5;">${a.excerpt}</p>
      </div>`
    )
    .join('');

  return `
    <html>
    <head><meta charset="utf-8"/><style>
      body { font-family: -apple-system, sans-serif; padding: 32px 24px; background: #fff; color: #3B2A1A; }
      h1 { font-size: 22px; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #A08060; font-weight: 400; margin-top: 0; }
      .tags { margin: 12px 0 20px; }
      .tag { background: #FAF0D7; padding: 4px 12px; border-radius: 12px; font-size: 11px; margin-right: 6px; display: inline-block; }
      hr { border: none; border-top: 1px solid #E8D5B0; margin: 16px 0; }
    </style></head>
    <body>
      <h1>${edition.title}</h1>
      <h2>${new Date(edition.generatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
      <div class="tags">${edition.categories.map((c) => `<span class="tag">${c}</span>`).join('')}</div>
      <p style="font-size:13px;color:#7A5C3A;">${edition.summary}</p>
      <hr/>
      <h2 style="color:#3B2A1A;font-weight:600;font-size:16px;">${articles.length} Makale</h2>
      ${articleRows}
      <hr/>
      <p style="text-align:center;font-size:11px;color:#A08060;">Smart Personnel Newspaper System</p>
    </body>
    </html>`;
}

async function downloadEditionPdf(edition: ArchivedEdition, articles: ArchivedArticle[]) {
  try {
    const html = generateEditionHtml(edition, articles);
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: edition.title,
      UTI: 'com.adobe.pdf',
    });
  } catch (error) {
    Alert.alert('Hata', 'PDF olusturulurken bir sorun olustu.');
  }
}

type ScreenState = 'list' | 'detail' | 'search';

export default function Archive() {
  const { colors } = useTheme();
  const [screen, setScreen] = useState<ScreenState>('list');
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

  const openEdition = (edition: ArchivedEdition) => {
    setSelectedEdition(edition);
    setScreen('detail');
  };

  const goBack = () => {
    setScreen('list');
    setSelectedEdition(null);
    setSearchQuery('');
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // FR28: Arama Ekrani
  if (screen === 'search') {
    return (
      <ScrollView style={s(colors).container} contentContainerStyle={s(colors).content}>
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

  // FR27: Edition Detay Ekrani
  if (screen === 'detail' && selectedEdition) {
    return (
      <ScrollView style={s(colors).container} contentContainerStyle={s(colors).content}>
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
          onPress={() => downloadEditionPdf(selectedEdition, editionArticles)}
        >
          <Ionicons name="download-outline" size={20} color={colors.white} />
          <Text style={s(colors).downloadText}>PDF Olarak Indir</Text>
        </Pressable>

        <Text style={s(colors).sectionTitle}>
          Makaleler ({editionArticles.length})
        </Text>

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

  // FR26: Arsiv Listesi
  return (
    <ScrollView style={s(colors).container} contentContainerStyle={s(colors).content}>
      <View style={s(colors).topActions}>
        <Pressable
          style={s(colors).searchButton}
          onPress={() => setScreen('search')}
        >
          <Ionicons name="search-outline" size={18} color={colors.accent} />
          <Text style={s(colors).searchButtonText}>Arsivde Ara</Text>
        </Pressable>
      </View>

      <Text style={s(colors).sectionTitle}>Gecmis Edisyonlar</Text>
      <Text style={s(colors).sectionSubtitle}>
        Daha once olusturulmus kisisel gazeteleriniz
      </Text>

      {ARCHIVED_EDITIONS.map((edition) => (
        <Pressable
          key={edition.id}
          style={s(colors).editionCard}
          onPress={() => openEdition(edition)}
        >
          <View style={s(colors).editionCardTop}>
            <View style={s(colors).editionIcon}>
              <Ionicons name="newspaper-outline" size={24} color={colors.accent} />
            </View>
            <View style={s(colors).editionInfo}>
              <Text style={s(colors).editionCardTitle}>{edition.title}</Text>
              <Text style={s(colors).editionCardDate}>
                {formatDate(edition.generatedAt)}
              </Text>
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
    </ScrollView>
  );
}

const s = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.lg,
      paddingBottom: 100,
      gap: Spacing.md,
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
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    searchButtonText: {
      color: colors.accent,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.lg,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    sectionSubtitle: {
      fontSize: Typography.fontSize.base,
      color: colors.textMuted,
      marginTop: -Spacing.sm,
    },
    editionCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    editionCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    editionIcon: {
      width: 44,
      height: 44,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editionInfo: {
      flex: 1,
      gap: 2,
    },
    editionCardTitle: {
      fontSize: Typography.fontSize.md,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    editionCardDate: {
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    editionSummary: {
      fontSize: Typography.fontSize.base,
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
      backgroundColor: colors.surfaceHigh,
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
      fontSize: Typography.fontSize.sm,
      color: colors.textMuted,
    },
    // Detail screen
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
      borderRadius: Radius.lg,
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
      borderRadius: Radius.md,
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
      borderRadius: Radius.lg,
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
    // Search screen
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
  });

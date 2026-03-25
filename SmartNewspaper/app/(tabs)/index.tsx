
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { ContentCategory } from '@/services/content';

type PeriodFilter = 'daily' | 'weekly';
type SortKey = 'newest' | 'popularity' | 'relevance';

type PersonalizedNewsItem = {
  id: string;
  title: string;
  summary: string;
  source: string;
  publicationDate: string;
  category: ContentCategory;
  popularity: number;
  relevance: number;
  period: 'daily' | 'weekly' | 'both';
};

const PERSONALIZED_NEWS: PersonalizedNewsItem[] = [
  {
    id: 'pn-1',
    title: 'Yapay zeka destekli haber odaları yeni editor rolü oluşturuyor',
    summary: 'Yerli medya kuruluşlari, otomasyon ve insan editor dengesini yeniden tanımlıyor.',
    source: 'Cumhuriyet',
    publicationDate: '2026-03-25',
    category: 'Teknoloji',
    popularity: 88,
    relevance: 94,
    period: 'daily',
  },
  {
    id: 'pn-2',
    title: 'Super Lig final haftasına girerken takım performansları dikkat çekiyor',
    summary: 'Son 5 haftanın verileri, şampiyonluk yarışı için kritik sinyaller veriyor.',
    source: 'Hürriyet',
    publicationDate: '2026-03-24',
    category: 'Spor',
    popularity: 92,
    relevance: 78,
    period: 'daily',
  },
  {
    id: 'pn-3',
    title: 'Piyasalarda haftalık beklenti: enflasyon verisine odakli yeni senaryo',
    summary: 'Analistler, haftanın ikinci yarısında oynakligin artabilecegini belirtiyor.',
    source: 'Milliyet',
    publicationDate: '2026-03-23',
    category: 'Ekonomi',
    popularity: 79,
    relevance: 86,
    period: 'both',
  },
  {
    id: 'pn-4',
    title: 'Erken tanı programlarıyla toplum sağlığında yeni pilot dönem',
    summary: 'Aile sağlığı merkezlerinde dijital tarama uygulamalari yaygınlaştırılıyor.',
    source: 'Sabah',
    publicationDate: '2026-03-22',
    category: 'Saglık',
    popularity: 71,
    relevance: 83,
    period: 'weekly',
  },
  {
    id: 'pn-5',
    title: 'Kültür rotası: haftanın açık hava etkinlikleri açıklandı',
    summary: 'Sahne sanatları ve kent festivalleri için yeni program takvimi paylaşıldı.',
    source: 'Sözcü',
    publicationDate: '2026-03-21',
    category: 'Kultur',
    popularity: 68,
    relevance: 74,
    period: 'weekly',
  },
  {
    id: 'pn-6',
    title: 'Siber guvenlik ekipleri mobil haber uygulamalarinda yeni riskleri izliyor',
    summary: 'Guvenlik uzmanlari, kimlik avina karsi kullanicilarin dikkatli olmasini oneriyor.',
    source: 'Cumhuriyet',
    publicationDate: '2026-03-20',
    category: 'Teknoloji',
    popularity: 74,
    relevance: 89,
    period: 'both',
  },
  {
    id: 'pn-7',
    title: 'Yerel liglerde izlenme artisiyla sponsorluk modelleri degisiyor',
    summary: 'Kulupler, dijital abonelik gelirlerini yeni finansman kaynagi olarak kullaniyor.',
    source: 'Hürriyet',
    publicationDate: '2026-03-19',
    category: 'Spor',
    popularity: 76,
    relevance: 72,
    period: 'weekly',
  },
];

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function PersonalizedNewsScreen() {
  const { colors } = useTheme();
  const { preferredCategories } = usePreferences();

  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('daily');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const defaultCategories: ContentCategory[] = ['Teknoloji', 'Spor', 'Ekonomi'];

  const interestCategories = preferredCategories.length ? preferredCategories : defaultCategories;

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(interestCategories));
  }, [interestCategories]);

  const sourceOptions = useMemo(() => {
    return Array.from(new Set(PERSONALIZED_NEWS.map((item) => item.source))).sort((a, b) =>
      a.localeCompare(b, 'tr')
    );
  }, []);

  const sortedNews = useMemo(() => {
    const periodFiltered = PERSONALIZED_NEWS.filter(
      (item) => item.period === 'both' || item.period === activePeriod
    );

    const categoryFiltered = selectedCategory
      ? periodFiltered.filter((item) => item.category === selectedCategory)
      : periodFiltered;

    const sourceFiltered =
      selectedSource === 'all'
        ? categoryFiltered
        : categoryFiltered.filter((item) => item.source === selectedSource);

    const withPreferenceBoost = sourceFiltered.map((item) => {
      const preferenceBoost = interestCategories.includes(item.category) ? 8 : 0;
      return {
        ...item,
        boostedRelevance: item.relevance + preferenceBoost,
      };
    });

    const result = [...withPreferenceBoost].sort((a, b) => {
      if (sortKey === 'newest') {
        return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
      }

      if (sortKey === 'popularity') {
        return b.popularity - a.popularity;
      }

      return b.boostedRelevance - a.boostedRelevance;
    });

    return result;
  }, [activePeriod, interestCategories, selectedCategory, selectedSource, sortKey]);

  const featured = sortedNews[0];
  const listItems = sortedNews.slice(1);

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).title}>Kişisel Gazete</Text>
      <Text style={styles(colors).subtitle}>For You</Text>

      <View style={styles(colors).periodToggleRow}>
        <Pressable
          style={[
            styles(colors).periodToggleButton,
            activePeriod === 'daily' ? styles(colors).periodToggleButtonActive : null,
          ]}
          onPress={() => setActivePeriod('daily')}
        >
          <Text
            style={[
              styles(colors).periodToggleText,
              activePeriod === 'daily' ? styles(colors).periodToggleTextActive : null,
            ]}
          >
            Daily
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles(colors).periodToggleButton,
            activePeriod === 'weekly' ? styles(colors).periodToggleButtonActive : null,
          ]}
          onPress={() => setActivePeriod('weekly')}
        >
          <Text
            style={[
              styles(colors).periodToggleText,
              activePeriod === 'weekly' ? styles(colors).periodToggleTextActive : null,
            ]}
          >
            Weekly
          </Text>
        </Pressable>
      </View>

      <Text style={styles(colors).sectionTitle}>Based on Your Interests</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).chipsRow}
      >
        <Pressable
          style={[
            styles(colors).chip,
            selectedCategory === null ? styles(colors).chipActive : null,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles(colors).chipText,
              selectedCategory === null ? styles(colors).chipTextActive : null,
            ]}
          >
            Tümü
          </Text>
        </Pressable>

        {categoryOptions.map((category) => {
          const isActive = selectedCategory === category;

          return (
            <Pressable
              key={category}
              style={[styles(colors).chip, isActive ? styles(colors).chipActive : null]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[styles(colors).chipText, isActive ? styles(colors).chipTextActive : null]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles(colors).sectionTitle}>Source Filter</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).chipsRow}
      >
        <Pressable
          style={[
            styles(colors).chip,
            selectedSource === 'all' ? styles(colors).chipActive : null,
          ]}
          onPress={() => setSelectedSource('all')}
        >
          <Text
            style={[
              styles(colors).chipText,
              selectedSource === 'all' ? styles(colors).chipTextActive : null,
            ]}
          >
            All Sources
          </Text>
        </Pressable>

        {sourceOptions.map((source) => {
          const isActive = selectedSource === source;

          return (
            <Pressable
              key={source}
              style={[styles(colors).chip, isActive ? styles(colors).chipActive : null]}
              onPress={() => setSelectedSource(source)}
            >
              <Text style={[styles(colors).chipText, isActive ? styles(colors).chipTextActive : null]}>
                {source}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles(colors).sectionTitle}>Sort By</Text>
      <View style={styles(colors).sortOptionsRow}>
        {([
          { key: 'newest' as const, label: 'Newest' },
          { key: 'popularity' as const, label: 'Most Popular' },
          { key: 'relevance' as const, label: 'Most Relevant' },
        ]).map((option) => {
          const active = sortKey === option.key;

            return (
              <Pressable
                key={option.key}
                style={[styles(colors).sortOption, active ? styles(colors).sortOptionActive : null]}
                onPress={() => setSortKey(option.key)}
              >
                <Text
                  style={[
                    styles(colors).sortOptionText,
                    active ? styles(colors).sortOptionTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
      </View>

      {featured ? (
        <View style={styles(colors).featuredCard}>
          <Text style={styles(colors).featuredTag}>Featured</Text>
          <Text style={styles(colors).featuredTitle}>{featured.title}</Text>
          <Text style={styles(colors).featuredSummary}>{featured.summary}</Text>
          <View style={styles(colors).metaRow}>
            <Text style={styles(colors).metaText}>{featured.source}</Text>
            <Text style={styles(colors).metaDivider}>|</Text>
            <Text style={styles(colors).metaText}>{formatDate(featured.publicationDate)}</Text>
          </View>
          <View style={styles(colors).categoryBadge}>
            <Text style={styles(colors).categoryBadgeText}>{featured.category}</Text>
          </View>
        </View>
      ) : (
        <View style={styles(colors).emptyState}>
          <Text style={styles(colors).emptyStateText}>Secili filtreler icin haber bulunamadi.</Text>
        </View>
      )}

      {listItems.map((item) => (
        <View key={item.id} style={styles(colors).newsCard}>
          <View style={styles(colors).cardHeader}>
            <Text style={styles(colors).cardCategory}>{item.category}</Text>
            <Text style={styles(colors).cardDate}>{formatDate(item.publicationDate)}</Text>
          </View>
          <Text style={styles(colors).newsTitle}>{item.title}</Text>
          <Text style={styles(colors).newsSummary}>{item.summary}</Text>
          <Text style={styles(colors).cardSource}>Source: {item.source}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.xxl,
      gap: Spacing.md,
    },
    title: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      marginTop: -4,
    },
    sectionTitle: {
      fontSize: Typography.fontSize.md,
      color: colors.accent,
      fontWeight: Typography.fontWeight.bold,
      marginTop: Spacing.xs,
    },
    periodToggleRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    periodToggleButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    periodToggleButtonActive: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },
    periodToggleText: {
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontSize: Typography.fontSize.base,
    },
    periodToggleTextActive: {
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingRight: Spacing.lg,
    },
    chip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.full,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontSize: Typography.fontSize.sm,
    },
    chipTextActive: {
      color: colors.white,
    },
    sortOptionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    sortOption: {
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.background,
    },
    sortOptionActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    sortOptionText: {
      textTransform: 'capitalize',
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    sortOptionTextActive: {
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.bold,
    },
    featuredCard: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    featuredTag: {
      alignSelf: 'flex-start',
      color: colors.accent,
      fontWeight: Typography.fontWeight.bold,
      fontSize: Typography.fontSize.sm,
      backgroundColor: colors.background,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      paddingHorizontal: Spacing.sm,
    },
    featuredTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
      lineHeight: 25,
    },
    featuredSummary: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 21,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    metaDivider: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingVertical: 4,
      paddingHorizontal: Spacing.sm,
    },
    categoryBadgeText: {
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontSize: Typography.fontSize.sm,
    },
    newsCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    cardCategory: {
      color: colors.accent,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    cardDate: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    newsTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
      lineHeight: 22,
    },
    newsSummary: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 20,
    },
    cardSource: {
      marginTop: Spacing.xs,
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: Spacing.lg,
    },
    emptyStateText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
    },
  });



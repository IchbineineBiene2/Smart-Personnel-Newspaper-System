import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';

type PeriodFilter = 'daily' | 'weekly';
type SortKey = 'newest' | 'popularity' | 'relevance';
type CountryFilter = 'all' | 'Turkiye' | 'Global';
type LanguageFilter = 'all' | 'Turkce' | 'Ingilizce';
type MarketKind = 'Borsa' | 'Maden';

type MarketWatchItem = {
  id: string;
  label: string;
  kind: MarketKind;
  value: string;
  change: string;
  isPositive: boolean;
};

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
    title: 'Yapay zeka destekli haber odalari yeni editor rolu olusturuyor',
    summary: 'Yerli medya kuruluslari, otomasyon ve insan editor dengesini yeniden tanimliyor.',
    source: 'Cumhuriyet',
    publicationDate: '2026-03-25',
    category: 'Teknoloji',
    popularity: 88,
    relevance: 94,
    period: 'daily',
  },
  {
    id: 'pn-2',
    title: 'Super Lig final haftasina girerken takim performanslari dikkat cekiyor',
    summary: 'Son 5 haftanin verileri, sampiyonluk yarisi icin kritik sinyaller veriyor.',
    source: 'Hurriyet',
    publicationDate: '2026-03-24',
    category: 'Spor',
    popularity: 92,
    relevance: 78,
    period: 'daily',
  },
  {
    id: 'pn-3',
    title: 'Piyasalarda haftalik beklenti: enflasyon verisine odakli yeni senaryo',
    summary: 'Analistler, haftanin ikinci yarisinda oynakligin artabilecegini belirtiyor.',
    source: 'Milliyet',
    publicationDate: '2026-03-23',
    category: 'Ekonomi',
    popularity: 79,
    relevance: 86,
    period: 'both',
  },
  {
    id: 'pn-4',
    title: 'Erken tani programlariyla toplum sagliginda yeni pilot donem',
    summary: 'Aile sagligi merkezlerinde dijital tarama uygulamalari yayginlastiriliyor.',
    source: 'Sabah',
    publicationDate: '2026-03-22',
    category: 'Saglik',
    popularity: 71,
    relevance: 83,
    period: 'weekly',
  },
  {
    id: 'pn-5',
    title: 'Kultur rotasi: haftanin acik hava etkinlikleri aciklandi',
    summary: 'Sahne sanatlari ve kent festivalleri icin yeni program takvimi paylasildi.',
    source: 'Sozcu',
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
    source: 'Hurriyet',
    publicationDate: '2026-03-19',
    category: 'Spor',
    popularity: 76,
    relevance: 72,
    period: 'weekly',
  },
  {
    id: 'pn-8',
    title: 'Reuters: European editors accelerate AI-assisted publishing workflows',
    summary: 'Newsrooms report faster draft preparation while preserving final editorial oversight.',
    source: 'Reuters',
    publicationDate: '2026-03-18',
    category: 'Teknoloji',
    popularity: 81,
    relevance: 87,
    period: 'both',
  },
  {
    id: 'pn-9',
    title: 'BBC Analysis: Commodity markets remain sensitive to policy signals',
    summary: 'Traders are closely monitoring central bank comments for short-term direction.',
    source: 'BBC',
    publicationDate: '2026-03-17',
    category: 'Ekonomi',
    popularity: 73,
    relevance: 80,
    period: 'weekly',
  },
];

const SOURCE_META: Record<string, { country: CountryFilter; language: LanguageFilter }> = {
  Sabah: { country: 'Turkiye', language: 'Turkce' },
  Cumhuriyet: { country: 'Turkiye', language: 'Turkce' },
  Hurriyet: { country: 'Turkiye', language: 'Turkce' },
  Sozcu: { country: 'Turkiye', language: 'Turkce' },
  Milliyet: { country: 'Turkiye', language: 'Turkce' },
  Reuters: { country: 'Global', language: 'Ingilizce' },
  BBC: { country: 'Global', language: 'Ingilizce' },
};

const MARKET_WATCH: MarketWatchItem[] = [
  { id: 'bist100', label: 'BIST 100', kind: 'Borsa', value: '10,412.35', change: '+1.42%', isPositive: true },
  { id: 'xu030', label: 'XU030', kind: 'Borsa', value: '11,287.90', change: '-0.38%', isPositive: false },
  { id: 'gold', label: 'Gram Altin', kind: 'Maden', value: '3,472 TL', change: '+0.91%', isPositive: true },
  { id: 'silver', label: 'Gumus Ons', kind: 'Maden', value: '$27.84', change: '-0.21%', isPositive: false },
];

function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function normalizeFilterValue(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/Ä±/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function PersonalizedNewsScreen() {
  const { colors } = useTheme();
  const { preferredCategories, preferredNewspapers } = usePreferences();
  const isWeb = Platform.OS === 'web';

  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('daily');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');

  const defaultCategories: ContentCategory[] = ['Teknoloji', 'Spor', 'Ekonomi'];
  const interestCategories = preferredCategories.length ? preferredCategories : defaultCategories;

  const categoryOptions = useMemo(() => Array.from(new Set(interestCategories)), [interestCategories]);

  const sourceOptions = useMemo(
    () => Array.from(new Set(PERSONALIZED_NEWS.map((item) => item.source))).sort((a, b) => a.localeCompare(b, 'tr')),
    []
  );

  const followedSources = useMemo(() => {
    if (preferredNewspapers.length) {
      return Array.from(new Set(preferredNewspapers.map((item) => item.toString())));
    }
    return sourceOptions;
  }, [preferredNewspapers, sourceOptions]);

  const filteredFollowedSources = useMemo(() => {
    return followedSources.filter((source) => {
      const meta = SOURCE_META[source] ?? { country: 'Global', language: 'Ingilizce' as const };
      const countryMatches = countryFilter === 'all' || meta.country === countryFilter;
      const languageMatches = languageFilter === 'all' || meta.language === languageFilter;
      return countryMatches && languageMatches;
    });
  }, [countryFilter, followedSources, languageFilter]);

  const sortedNews = useMemo(() => {
    const periodFiltered = PERSONALIZED_NEWS.filter((item) => item.period === 'both' || item.period === activePeriod);

    const categoryFiltered = selectedCategory
      ? periodFiltered.filter(
          (item) => normalizeFilterValue(item.category) === normalizeFilterValue(selectedCategory)
        )
      : periodFiltered;

    const sourceFiltered =
      selectedSource === 'all'
        ? categoryFiltered
        : categoryFiltered.filter(
            (item) => normalizeFilterValue(item.source) === normalizeFilterValue(selectedSource)
          );

    const withPreferenceBoost = sourceFiltered.map((item) => ({
      ...item,
      boostedRelevance: item.relevance + (interestCategories.includes(item.category) ? 8 : 0),
    }));

    return [...withPreferenceBoost].sort((a, b) => {
      if (sortKey === 'newest') {
        return new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
      }
      if (sortKey === 'popularity') {
        return b.popularity - a.popularity;
      }
      return b.boostedRelevance - a.boostedRelevance;
    });
  }, [activePeriod, interestCategories, selectedCategory, selectedSource, sortKey]);

  const featured = sortedNews[0];
  const listItems = sortedNews.slice(1);

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).title}>Kisisel Gazete</Text>
      <Text style={styles(colors).subtitle}>For You</Text>

      <View style={[styles(colors).boardRow, isWeb ? styles(colors).boardRowWeb : null]}>
        <View style={[styles(colors).mainColumn, isWeb ? styles(colors).mainColumnWeb : null]}>
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
            style={styles(colors).filterScroll}
            contentContainerStyle={styles(colors).chipsRow}
          >
            <Pressable
              style={[
                styles(colors).chip,
                styles(colors).categoryChip,
                selectedCategory === null ? styles(colors).chipActive : null,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles(colors).chipText,
                  selectedCategory === null ? styles(colors).chipTextActive : null,
                ]}
              >
                Tumu
              </Text>
            </Pressable>

            {categoryOptions.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  style={[styles(colors).chip, styles(colors).categoryChip, isActive ? styles(colors).chipActive : null]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
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
            style={styles(colors).filterScroll}
            contentContainerStyle={styles(colors).chipsRow}
          >
            <Pressable
              style={[
                styles(colors).chip,
                styles(colors).sourceChip,
                selectedSource === 'all' ? styles(colors).chipActive : null,
              ]}
              onPress={() => setSelectedSource('all')}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
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
                  style={[styles(colors).chip, styles(colors).sourceChip, isActive ? styles(colors).chipActive : null]}
                  onPress={() => setSelectedSource(source)}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles(colors).chipText, isActive ? styles(colors).chipTextActive : null]}
                  >
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
                    style={[styles(colors).sortOptionText, active ? styles(colors).sortOptionTextActive : null]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {featured ? (
            <View style={[styles(colors).featuredCard, styles(colors).featuredCardStable]}>
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
            <View style={[styles(colors).emptyState, styles(colors).featuredCardStable]}>
              <Text style={styles(colors).emptyStateText}>Secili filtreler icin haber bulunamadi.</Text>
            </View>
          )}

          <View style={styles(colors).newsListWrap}>
            {listItems.length ? (
              listItems.map((item) => (
                <View key={item.id} style={styles(colors).newsCard}>
                  <View style={styles(colors).cardHeader}>
                    <Text style={styles(colors).cardCategory}>{item.category}</Text>
                    <Text style={styles(colors).cardDate}>{formatDate(item.publicationDate)}</Text>
                  </View>
                  <Text style={styles(colors).newsTitle}>{item.title}</Text>
                  <Text style={styles(colors).newsSummary}>{item.summary}</Text>
                  <Text style={styles(colors).cardSource}>Source: {item.source}</Text>
                </View>
              ))
            ) : (
              <View style={styles(colors).newsListEmptyState}>
                <Text style={styles(colors).emptyStateText}>Bu filtre kombinasyonunda ek haber yok.</Text>
              </View>
            )}
          </View>
        </View>

        {isWeb ? (
          <View style={styles(colors).rightColumn}>
            <View style={styles(colors).rightColumnShell}>
              <View style={styles(colors).rightTopBlock}>
                <View style={styles(colors).sideCardHeader}>
                  <Text style={styles(colors).sideTitle}>Takip Edilen Haber Sayfalari</Text>
                  <Text style={styles(colors).sideSubTitle}>
                    {filteredFollowedSources.length}/{followedSources.length} kaynak goruntuleniyor
                  </Text>
                </View>

                <Text style={styles(colors).sideFilterTitle}>Ulke</Text>
                <View style={styles(colors).sideFilterRow}>
                  {(['all', 'Turkiye', 'Global'] as CountryFilter[]).map((option) => {
                    const active = countryFilter === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setCountryFilter(option)}
                        style={[styles(colors).sideFilterChip, active ? styles(colors).sideFilterChipActive : null]}
                      >
                        <Text
                          style={[
                            styles(colors).sideFilterChipText,
                            active ? styles(colors).sideFilterChipTextActive : null,
                          ]}
                        >
                          {option === 'all' ? 'Tum' : option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles(colors).sideFilterTitle}>Dil</Text>
                <View style={styles(colors).sideFilterRow}>
                  {(['all', 'Turkce', 'Ingilizce'] as LanguageFilter[]).map((option) => {
                    const active = languageFilter === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setLanguageFilter(option)}
                        style={[styles(colors).sideFilterChip, active ? styles(colors).sideFilterChipActive : null]}
                      >
                        <Text
                          style={[
                            styles(colors).sideFilterChipText,
                            active ? styles(colors).sideFilterChipTextActive : null,
                          ]}
                        >
                          {option === 'all' ? 'Tum' : option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles(colors).sideCardList}>
                {filteredFollowedSources.length ? (
                  filteredFollowedSources.map((source) => {
                    const meta = SOURCE_META[source] ?? { country: 'Global', language: 'Ingilizce' as const };

                    return (
                      <View key={source} style={styles(colors).sourceItem}>
                        <View style={styles(colors).sourceIconWrap}>
                          <Text style={styles(colors).sourceIconText}>{source.charAt(0)}</Text>
                        </View>
                        <View style={styles(colors).sourceTextWrap}>
                          <Text style={styles(colors).sourceTitle}>{source}</Text>
                          <Text style={styles(colors).sourceMeta}>{meta.country} - {meta.language}</Text>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles(colors).sideEmptyText}>Filtrelerle eslesen takip edilen sayfa bulunamadi.</Text>
                )}
              </View>

              <View style={styles(colors).marketCard}>
                <Text style={styles(colors).marketTitle}>Takip Edilen Piyasalar</Text>

                {MARKET_WATCH.map((item) => (
                  <View key={item.id} style={styles(colors).marketItem}>
                    <View style={styles(colors).marketLeft}>
                      <Text style={styles(colors).marketLabel}>{item.label}</Text>
                      <Text style={styles(colors).marketKind}>{item.kind}</Text>
                    </View>

                    <View style={styles(colors).marketRight}>
                      <Text style={styles(colors).marketValue}>{item.value}</Text>
                      <Text style={[styles(colors).marketChange, { color: item.isPositive ? colors.success : colors.error }]}>
                        {item.change}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>
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
    boardRow: {
      width: '100%',
    },
    boardRowWeb: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: Spacing.md,
    },
    mainColumn: {
      width: '100%',
      gap: Spacing.md,
    },
    mainColumnWeb: {
      flex: 1,
      minWidth: 0,
    },
    rightColumn: {
      width: 276,
      alignSelf: 'stretch',
    },
    rightColumnShell: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 12,
      paddingVertical: 14,
      gap: 10,
      flex: 1,
      minHeight: 720,
    },
    rightTopBlock: {
      gap: Spacing.sm,
    },
    sideCardHeader: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 4,
    },
    sideTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
    },
    sideSubTitle: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: Typography.fontWeight.bold,
    },
    sideFilterTitle: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    sideFilterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
    },
    sideFilterChip: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: Spacing.sm,
      backgroundColor: colors.surface,
      minWidth: 78,
      alignItems: 'center',
    },
    sideFilterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    sideFilterChipText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    sideFilterChipTextActive: {
      color: colors.white,
    },
    sideCardList: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 8,
      gap: 8,
      flex: 1,
      justifyContent: 'flex-start',
    },
    sourceItem: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      backgroundColor: colors.surfaceHigh,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sourceIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    sourceIconText: {
      color: colors.white,
      fontWeight: Typography.fontWeight.bold,
      fontSize: Typography.fontSize.sm,
    },
    sourceTextWrap: {
      flex: 1,
    },
    sourceTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    sourceMeta: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    sideEmptyText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.base,
      lineHeight: 20,
    },
    marketCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
    },
    marketTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
      marginBottom: 2,
    },
    marketItem: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.surfaceHigh,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    marketLeft: {
      flex: 1,
      minWidth: 0,
    },
    marketLabel: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    marketKind: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      fontWeight: Typography.fontWeight.medium,
    },
    marketRight: {
      alignItems: 'flex-end',
    },
    marketValue: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    marketChange: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
      marginTop: 2,
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
      alignItems: 'center',
      minHeight: 44,
    },
    periodToggleButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.lg,
      height: 40,
      width: 96,
      justifyContent: 'center',
      alignItems: 'center',
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
      fontWeight: Typography.fontWeight.medium,
    },
    filterScroll: {
      minHeight: 46,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingRight: Spacing.lg,
      alignItems: 'center',
      minHeight: 44,
    },
    chip: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.full,
      height: 40,
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      alignSelf: 'flex-start',
      alignItems: 'center',
      overflow: 'hidden',
    },
    categoryChip: {
      width: 92,
    },
    sourceChip: {
      width: 108,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      color: colors.textSecondary,
      fontWeight: Typography.fontWeight.medium,
      fontSize: Typography.fontSize.sm,
      lineHeight: 18,
      textAlign: 'center',
    },
    chipTextActive: {
      color: colors.white,
    },
    sortOptionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      alignItems: 'center',
      minHeight: 40,
    },
    sortOption: {
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      height: 36,
      width: 118,
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.background,
      alignSelf: 'flex-start',
      alignItems: 'center',
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
      fontWeight: Typography.fontWeight.medium,
    },
    featuredCard: {
      backgroundColor: colors.surfaceHigh,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    featuredCardStable: {
      minHeight: 190,
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
    newsListWrap: {
      minHeight: 260,
      gap: Spacing.sm,
    },
    newsListEmptyState: {
      minHeight: 120,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      backgroundColor: colors.surface,
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import NewsQuickPreviewModal from '@/components/NewsQuickPreviewModal';
import { usePersonalizedNews } from '@/hooks/useNews';
import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { useEventNotifications } from '@/hooks/useEventNotifications';
import { ContentCategory } from '@/services/content';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';

type PeriodFilter = 'daily' | 'weekly';
type SortKey = 'newest' | 'popularity' | 'relevance';
type CountryFilter = 'all' | 'Turkiye' | 'Global';
type LanguageFilter = 'all' | 'Turkce' | 'Ingilizce';
type LangFilter = 'all' | 'tr' | 'en' | 'de';
type MarketKind = 'Borsa' | 'Maden';

const I18N = {
  tr: {
    filters: 'FILTRELER',
    clear: 'Temizle',
    period: 'DONEM',
    daily: 'Gunluk',
    weekly: 'Haftalik',
    lang: 'DIL',
    all: 'Tumu',
    sorting: 'SIRALAMA',
    newest: 'En Yeni',
    popular: 'Populer',
    related: 'Ilgili',
    category: 'KATEGORI',
    source: 'KAYNAK',
    showing: 'haber gosteriliyor',
    print: 'KISESEL BASKI',
    newspaper: 'KİŞİSEL GAZETE',
    slogan: 'Haberleri sizin icin derliyoruz',
    topic: 'GUNUN\nKONUSU',
    breaking: 'SON\nDAKIKA',
    loading: 'Haberler yukleniyor...',
    noNews: 'Secili filtreler icin haber bulunamadi.',
    followed: 'Takip Edilen Kaynaklar',
    country: 'Ulke',
    language: 'Dil',
    noSource: 'Eslesen kaynak bulunamadi.',
    markets: 'Piyasalar',
    importantUpdates: 'ONEMLI GUNCELLEMELER',
    liveNow: 'CANLI',
  },
  en: {
    filters: 'FILTERS',
    clear: 'Clear',
    period: 'PERIOD',
    daily: 'Daily',
    weekly: 'Weekly',
    lang: 'LANG',
    all: 'All',
    sorting: 'SORTING',
    newest: 'Newest',
    popular: 'Popular',
    related: 'Relevant',
    category: 'CATEGORY',
    source: 'SOURCE',
    showing: 'articles shown',
    print: 'PERSONAL EDITION',
    newspaper: 'PERSONAL NEWSPAPER',
    slogan: 'We curate the news for you',
    topic: 'TOP\nTOPIC',
    breaking: 'BREAKING\nNEWS',
    loading: 'Loading news...',
    noNews: 'No news found for selected filters.',
    followed: 'Followed Sources',
    country: 'Country',
    language: 'Language',
    noSource: 'No matching sources found.',
    markets: 'Markets',
    importantUpdates: 'IMPORTANT UPDATES',
    liveNow: 'LIVE',
  },
  de: {
    filters: 'FILTER',
    clear: 'Loschen',
    period: 'ZEITRAUM',
    daily: 'Taglich',
    weekly: 'Wochentlich',
    lang: 'SPRACHE',
    all: 'Alle',
    sorting: 'SORTIERUNG',
    newest: 'Neueste',
    popular: 'Popular',
    related: 'Relevant',
    category: 'KATEGORIE',
    source: 'QUELLE',
    showing: 'Nachrichten angezeigt',
    print: 'PERSONLICHE AUSGABE',
    newspaper: 'PERSONLICHE ZEITUNG',
    slogan: 'Wir kuratieren Nachrichten fur dich',
    topic: 'THEMA\nDES TAGES',
    breaking: 'EIL\nMELDUNG',
    loading: 'Nachrichten werden geladen...',
    noNews: 'Keine Nachrichten fur gewahlte Filter gefunden.',
    followed: 'Gefolgte Quellen',
    country: 'Land',
    language: 'Sprache',
    noSource: 'Keine passenden Quellen gefunden.',
    markets: 'Markte',
    importantUpdates: 'WICHTIGE UPDATES',
    liveNow: 'LIVE',
  },
} as const;

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
  content?: string;
  source: string;
  sourceUrl?: string;
  publicationDate: string;
  category: ContentCategory;
  popularity: number;
  relevance: number;
  period: 'daily' | 'weekly' | 'both';
  url?: string;
  imageUrl?: string;
  language?: string;
};

function getSourceMeta(sourceName: string, language?: string): { country: CountryFilter; language: LanguageFilter } {
  const static_meta: Record<string, { country: CountryFilter; language: LanguageFilter }> = {
    Sabah: { country: 'Turkiye', language: 'Turkce' },
    Cumhuriyet: { country: 'Turkiye', language: 'Turkce' },
    Hurriyet: { country: 'Turkiye', language: 'Turkce' },
    Hürriyet: { country: 'Turkiye', language: 'Turkce' },
    Sozcu: { country: 'Turkiye', language: 'Turkce' },
    Milliyet: { country: 'Turkiye', language: 'Turkce' },
    Reuters: { country: 'Global', language: 'Ingilizce' },
    BBC: { country: 'Global', language: 'Ingilizce' },
    'BBC News': { country: 'Global', language: 'Ingilizce' },
    'BBC Türkçe': { country: 'Global', language: 'Turkce' },
    'BBC Technology': { country: 'Global', language: 'Ingilizce' },
    'BBC Business': { country: 'Global', language: 'Ingilizce' },
    'DW News': { country: 'Global', language: 'Ingilizce' },
    'DW Europe': { country: 'Global', language: 'Ingilizce' },
    'DW Business': { country: 'Global', language: 'Ingilizce' },
    'DW Deutsch': { country: 'Global', language: 'Ingilizce' },
    Tagesschau: { country: 'Global', language: 'Ingilizce' },
    Spiegel: { country: 'Global', language: 'Ingilizce' },
    'Spiegel International': { country: 'Global', language: 'Ingilizce' },
    'The Guardian': { country: 'Global', language: 'Ingilizce' },
  };
  if (static_meta[sourceName]) return static_meta[sourceName];
  const isEnglish = language === 'en';
  return { country: isEnglish ? 'Global' : 'Turkiye', language: isEnglish ? 'Ingilizce' : 'Turkce' };
}

const MARKET_WATCH: MarketWatchItem[] = [
  { id: 'bist100', label: 'BIST 100', kind: 'Borsa', value: '10,412.35', change: '+1.42%', isPositive: true },
  { id: 'xu030', label: 'XU030', kind: 'Borsa', value: '11,287.90', change: '-0.38%', isPositive: false },
  { id: 'gold', label: 'Gram Altin', kind: 'Maden', value: '3,472 TL', change: '+0.91%', isPositive: true },
  { id: 'silver', label: 'Gumus Ons', kind: 'Maden', value: '$27.84', change: '-0.21%', isPositive: false },
];

function formatDate(isoDate: string, locale: string) {
  const date = new Date(isoDate);
  const dateStr = date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} ${timeStr}`;
}

function formatRelativeTime(isoDate: string, language: 'tr' | 'en' | 'de', nowTs: number = Date.now()) {
  const diffMs = nowTs - new Date(isoDate).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 1) return language === 'en' ? 'just now' : language === 'de' ? 'gerade eben' : 'simdi';
  if (diffMinutes < 60) return language === 'en' ? `${diffMinutes}m ago` : language === 'de' ? `vor ${diffMinutes} Min.` : `${diffMinutes} dk once`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return language === 'en' ? `${diffHours}h ago` : language === 'de' ? `vor ${diffHours} Std.` : `${diffHours} sa once`;

  const diffDays = Math.floor(diffHours / 24);
  return language === 'en' ? `${diffDays}d ago` : language === 'de' ? `vor ${diffDays} Tg.` : `${diffDays} gun once`;
}

function normalizeFilterValue(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/Ä±/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toLiveUpdateText(title: string, summary: string | undefined, language: 'tr' | 'en' | 'de') {
  const seed = `${title ?? ''} ${summary ?? ''}`.trim();
  const normalized = normalizeFilterValue(seed);
  const cleanedTitle = (title ?? summary ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s+-\s+(reuters|ap|afp|bbc|dw|tagesschau|spiegel).*$/i, '')
    .replace(/\s*\|\s*[^|]*$/g, '')
    .trim();

  const baseText = cleanedTitle.length >= 16 ? cleanedTitle : (summary ?? cleanedTitle).trim();
  if (!baseText) {
    return language === 'en' ? 'Update in progress' : language === 'de' ? 'Update laeuft' : 'Guncelleme suruyor';
  }
  return baseText;
}

const SOURCE_DOMAINS: Record<string, string> = {
  hurriyet: 'https://www.hurriyet.com.tr',
  'hürriyet': 'https://www.hurriyet.com.tr',
  milliyet: 'https://www.milliyet.com.tr',
  sabah: 'https://www.sabah.com.tr',
  ntv: 'https://www.ntv.com.tr',
  reuters: 'https://www.reuters.com',
  spiegel: 'https://www.spiegel.de',
  tagesschau: 'https://www.tagesschau.de',
  'bbc türkçe': 'https://www.bbc.com/turkce',
  'bbc news': 'https://www.bbc.com/news',
  'bbc business': 'https://www.bbc.com/news/business',
  'bbc technology': 'https://www.bbc.com/news/technology',
  'dw deutsch': 'https://www.dw.com/de',
  'dw news': 'https://www.dw.com/en',
  'dw europe': 'https://www.dw.com/en',
  'dw business': 'https://www.dw.com/en/business',
};

const HIGH_IMPACT_KEYWORDS = [
  'son dakika',
  'acil',
  'savas',
  'saldiri',
  'catisma',
  'vur',
  'kriz',
  'oldu',
  'yarali',
  'deprem',
  'patlama',
  'iran',
  'israil',
  'gaza',
  'ukrayna',
  'rusya',
  'abd',
  'nato',
  'ambargo',
  'attack',
  'strike',
  'missile',
  'war',
  'killed',
  'urgent',
  'breaking',
  'earthquake',
  'flood',
  'wildfire',
  'storm',
  'tsunami',
  'volcano',
  'evacuation',
  'alert',
  'emergency',
];

function buildSourceLogoUrl(sourceName: string, sourceUrl?: string): string | undefined {
  try {
    if (sourceUrl) {
      const origin = new URL(sourceUrl).origin;
      return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(origin)}`;
    }
  } catch {
    // Fall back to source-name mapping when URL cannot be parsed.
  }

  const mapped = SOURCE_DOMAINS[sourceName.toLocaleLowerCase('tr-TR').trim()];
  if (!mapped) return undefined;
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(mapped)}`;
}

export default function PersonalizedNewsScreen() {
  const router = useRouter();
  const { colors, themeName } = useTheme();
  const { language } = useLanguage();
  const t = I18N[language];
  const dateLocale = language === 'en' ? 'en-GB' : language === 'de' ? 'de-DE' : 'tr-TR';
  const { preferredCategories, preferredNewspapers } = usePreferences();
  const isWeb = Platform.OS === 'web';
  const pageBackground = themeName === 'vincent' ? colors.surface : colors.background;
  const { news: apiNews, loading: newsLoading } = usePersonalizedNews();
  useNewsNotifications(); // Yeni haberler için notification
  useEventNotifications(); // Yaklaşan etkinlikler için notification

  const [activePeriod, setActivePeriod] = useState<PeriodFilter>('daily');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<CountryFilter>('all');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const [langFilter, setLangFilter] = useState<LangFilter>('tr');
  const [liveNowTs, setLiveNowTs] = useState<number>(Date.now());
  const [previewItem, setPreviewItem] = useState<{
    id: string;
    title: string;
    summary: string;
    content?: string;
    sourceName: string;
    imageUrl?: string;
    publishedAt?: string;
    url?: string;
    category?: string;
  } | null>(null);

  // Ticker animasyonu
  const tickerX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(tickerX, { toValue: -4500, duration: 80000, useNativeDriver: true }),
        Animated.timing(tickerX, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [tickerX]);

  useEffect(() => {
    setLangFilter(language);
  }, [language]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLiveNowTs(Date.now());
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const defaultCategories: ContentCategory[] = ['Siyaset', 'Teknoloji', 'Spor', 'Magazin'];
  const interestCategories = preferredCategories.length ? preferredCategories : defaultCategories;

  // Haberlerden gelen TÜM kategorileri göster (sadece tercihler değil)
  const categoryOptions = useMemo(
    () => Array.from(new Set(apiNews.map((a) => a.category))).sort((a, b) => a.localeCompare(b, 'tr')),
    [apiNews]
  );

  const sourceOptions = useMemo(
    () => Array.from(new Set(apiNews.map((item) => item.source))).sort((a, b) => a.localeCompare(b, 'tr')),
    [apiNews]
  );

  const sourceLogoMap = useMemo(() => {
    const map: Record<string, string | undefined> = {};

    for (const item of apiNews) {
      if (map[item.source]) continue;
      map[item.source] = buildSourceLogoUrl(item.source, item.sourceUrl);
    }

    return map;
  }, [apiNews]);

  const followedSources = useMemo(() => {
    if (preferredNewspapers.length) {
      return Array.from(new Set(preferredNewspapers.map((item) => item.toString())));
    }
    return sourceOptions;
  }, [preferredNewspapers, sourceOptions]);

  const filteredFollowedSources = useMemo(() => {
    return followedSources.filter((source) => {
      const meta = getSourceMeta(source);
      const countryMatches = countryFilter === 'all' || meta.country === countryFilter;
      const languageMatches = languageFilter === 'all' || meta.language === languageFilter;
      return countryMatches && languageMatches;
    });
  }, [countryFilter, followedSources, languageFilter]);

  // Günün konusu: en fazla haber üretilen kategori + o kategorinin en yeni haberi
  const gununKonusu = useMemo(() => {
    const today = apiNews.filter((a) => a.period === 'daily' || a.period === 'both');
    const counts: Record<string, number> = {};
    today.forEach((a) => { counts[a.category] = (counts[a.category] ?? 0) + 1; });
    const topCat = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!topCat) return null;
    const topArticle = today.find((a) => a.category === topCat[0]);
    return { category: topCat[0] as ContentCategory, count: topCat[1], article: topArticle ?? null };
  }, [apiNews]);

  // Son dakika ticker için en yeni 15 haber
  const tickerItems = useMemo(
    () => apiNews.slice(0, 15).map((a) => a.title),
    [apiNews]
  );

  // Kategori bazlı haber sayıları (filtre etiketleri için)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    apiNews.forEach((a) => { counts[a.category] = (counts[a.category] ?? 0) + 1; });
    return counts;
  }, [apiNews]);

  const sortedNews = useMemo(() => {
    const langFiltered = langFilter === 'all'
      ? apiNews
      : apiNews.filter((a) => a.language === langFilter);
    const periodFiltered = langFiltered.filter((item) => item.period === 'both' || item.period === activePeriod);

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
  }, [activePeriod, apiNews, interestCategories, langFilter, selectedCategory, selectedSource, sortKey]);

  const prioritizedNews = useMemo(() => {
    const withImage = sortedNews.filter((item) => !!item.imageUrl);
    const withoutImage = sortedNews.filter((item) => !item.imageUrl);
    return [...withImage, ...withoutImage];
  }, [sortedNews]);

  const featured = prioritizedNews[0];
  const secondaries = prioritizedNews.slice(1, 5);
  const importantUpdates = useMemo(() => {
    const now = Date.now();
    const seen = new Set<string>();

    return prioritizedNews
      .map((item) => {
        const normalizedText = normalizeFilterValue(`${item.title} ${item.summary}`);
        const keywordHits = HIGH_IMPACT_KEYWORDS.reduce(
          (count, keyword) => (normalizedText.includes(keyword) ? count + 1 : count),
          0
        );

        const normalizedCategory = normalizeFilterValue(item.category);
        const categoryBoost = /(siyaset|politic|dunya|world|ekonomi|business|guvenlik|security)/.test(normalizedCategory)
          ? 8
          : 0;

        const ageHours = Math.max(0, (now - new Date(item.publicationDate).getTime()) / (1000 * 60 * 60));
        const recencyScore = Math.max(0, 36 - ageHours);
        const engagementBoost = Math.min(10, Math.round(item.popularity / 20) + Math.round(item.relevance / 25));
        const score = keywordHits * 10 + categoryBoost + recencyScore + engagementBoost;

        return { item, score, ageHours };
      })
      .filter(({ item, score, ageHours }) => {
        if (ageHours > 72) return false;
        if (item.id === featured?.id) return false;
        if (secondaries.some((news) => news.id === item.id)) return false;
        const dedupeKey = normalizeFilterValue(item.title);
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return score >= 24;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) => item);
  }, [featured?.id, prioritizedNews, secondaries]);

  const liveUpdates = useMemo(
    () =>
      importantUpdates.map((item) => ({
        id: item.id,
        publishedAt: item.publicationDate,
        text: toLiveUpdateText(item.title, item.summary, language),
      })),
    [importantUpdates, language]
  );

  const importantUpdateIds = useMemo(() => new Set(importantUpdates.map((item) => item.id)), [importantUpdates]);

  const secondaryGridNews = importantUpdates.length > 0 ? secondaries.slice(0, 2) : secondaries;
  const compactList = useMemo(
    () => prioritizedNews.slice(5).filter((item) => !importantUpdateIds.has(item.id)),
    [importantUpdateIds, prioritizedNews]
  );
  const newspaperBlocks = useMemo(() => {
    const blocks: Array<{
      id: string;
      lead: PersonalizedNewsItem;
      sideA: PersonalizedNewsItem[];
      sideB: PersonalizedNewsItem[];
      leadPosition: 'center' | 'left' | 'right';
    }> = [];

    for (let i = 0; i < compactList.length; i += 5) {
      const chunk = compactList.slice(i, i + 5);
      if (!chunk.length) break;

      const lead = chunk[0];
      if (!lead) break;

      const positionCycle = blocks.length % 3;
      const leadPosition =
        positionCycle === 0 ? 'center' : positionCycle === 1 ? 'left' : 'right';

      blocks.push({
        id: `${lead.id}-${i}`,
        lead,
        sideA: chunk.slice(1, 3),
        sideB: chunk.slice(3, 5),
        leadPosition,
      });
    }

    return blocks;
  }, [compactList]);

  const openPublisherProfile = (sourceName: string) => {
    const publisherId = getPublisherIdFromSourceName(sourceName);
    router.push(`/publisherprofile?id=${encodeURIComponent(publisherId)}` as any);
  };

  const openArticlePreview = (article: PersonalizedNewsItem) => {
    setPreviewItem({
      id: article.id,
      title: article.title,
      summary: article.summary,
      content: article.content,
      sourceName: article.source,
      imageUrl: article.imageUrl,
      publishedAt: formatDate(article.publicationDate, dateLocale),
      url: article.url,
      category: article.category,
    });
  };

  // ── Filtre paneli (hem sağ kolonda hem mobil üstte kullanılır) ──────────
  const activeFilterCount = [
    selectedCategory !== null,
    selectedSource !== 'all',
    langFilter !== 'all',
    activePeriod !== 'daily',
    sortKey !== 'newest',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedSource('all');
    setLangFilter(language);
    setActivePeriod('daily');
    setSortKey('newest');
  };

  const FilterPanel = () => (
    <View style={s(colors).filterPanel}>
      {/* Başlık + aktif filtre sayısı + temizle */}
      <View style={s(colors).filterPanelHeader}>
        <Text style={s(colors).filterPanelTitle}>{t.filters}</Text>
        {activeFilterCount > 0 && (
          <Pressable style={s(colors).resetBtn} onPress={resetFilters}>
            <View style={s(colors).resetBadge}>
              <Text style={s(colors).resetBadgeNum}>{activeFilterCount}</Text>
            </View>
            <Text style={s(colors).resetBtnText}>{t.clear}</Text>
          </Pressable>
        )}
      </View>

      {/* Dönem */}
      <Text style={s(colors).filterLabel}>{t.period}</Text>
      <View style={s(colors).periodRow}>
        {(['daily', 'weekly'] as PeriodFilter[]).map((p) => (
          <Pressable
            key={p}
            style={[s(colors).periodBtn, activePeriod === p && s(colors).periodBtnActive]}
            onPress={() => setActivePeriod(p)}
          >
            <Text style={[s(colors).periodBtnText, activePeriod === p && s(colors).periodBtnTextActive]}>
              {p === 'daily' ? `📅 ${t.daily}` : `🗓 ${t.weekly}`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Dil */}
      <Text style={s(colors).filterLabel}>{t.lang}</Text>
      {(() => {
        const langOpts = [
          { key: 'all' as LangFilter, flag: '🌐', label: t.all },
          { key: 'tr' as LangFilter, flag: '🇹🇷', label: 'TR' },
          { key: 'en' as LangFilter, flag: '🇬🇧', label: 'EN' },
          { key: 'de' as LangFilter, flag: '🇩🇪', label: 'DE' },
        ];
        return (
          <View style={s(colors).segmentedCtrl}>
            {langOpts.map((opt, idx) => (
              <Pressable
                key={opt.key}
                style={[
                  s(colors).segment,
                  idx < langOpts.length - 1 && s(colors).segmentBorder,
                  langFilter === opt.key && s(colors).segmentActive,
                ]}
                onPress={() => setLangFilter(opt.key)}
              >
                <Text style={s(colors).segmentFlag}>{opt.flag}</Text>
                <Text style={[s(colors).segmentText, langFilter === opt.key && s(colors).segmentTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })()}

      {/* Sıralama */}
      <Text style={s(colors).filterLabel}>{t.sorting}</Text>
      <View style={s(colors).chipWrap}>
        {([
          { key: 'newest' as const, label: `🕐 ${t.newest}` },
          { key: 'popularity' as const, label: `🔥 ${t.popular}` },
          { key: 'relevance' as const, label: `⭐ ${t.related}` },
        ]).map((opt) => (
          <Pressable
            key={opt.key}
            style={[s(colors).filterChip, sortKey === opt.key && s(colors).filterChipActive]}
            onPress={() => setSortKey(opt.key)}
          >
            <Text style={[s(colors).filterChipText, sortKey === opt.key && s(colors).filterChipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Kategori — sayılarla */}
      <Text style={s(colors).filterLabel}>{t.category}</Text>
      <View style={s(colors).chipWrap}>
        <Pressable
          style={[s(colors).filterChip, selectedCategory === null && s(colors).filterChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[s(colors).filterChipText, selectedCategory === null && s(colors).filterChipTextActive]}>
            {t.all} {apiNews.length > 0 && <Text style={s(colors).filterChipCount}>({apiNews.length})</Text>}
          </Text>
        </Pressable>
        {categoryOptions.map((cat) => (
          <Pressable
            key={cat}
            style={[s(colors).filterChip, selectedCategory === cat && s(colors).filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[s(colors).filterChipText, selectedCategory === cat && s(colors).filterChipTextActive]}>
              {cat}{categoryCounts[cat] ? <Text style={s(colors).filterChipCount}> ({categoryCounts[cat]})</Text> : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Kaynak */}
      <Text style={s(colors).filterLabel}>{t.source}</Text>
      <View style={s(colors).chipWrap}>
        <Pressable
          style={[s(colors).filterChip, selectedSource === 'all' && s(colors).filterChipActive]}
          onPress={() => setSelectedSource('all')}
        >
          <Text style={[s(colors).filterChipText, selectedSource === 'all' && s(colors).filterChipTextActive]}>
            {t.all}
          </Text>
        </Pressable>
        {sourceOptions.map((src) => (
          <Pressable
            key={src}
            style={[s(colors).filterChip, selectedSource === src && s(colors).filterChipActive]}
            onPress={() => setSelectedSource(src)}
          >
            <Text style={[s(colors).filterChipText, selectedSource === src && s(colors).filterChipTextActive]}>
              {src}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sonuç sayısı */}
      <View style={s(colors).filterResultRow}>
        <Text style={s(colors).filterResultText}>
          {sortedNews.length} {t.showing}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={[s(colors).container, { backgroundColor: pageBackground }]} contentContainerStyle={s(colors).content}>

      {/* ── Gazete başlığı ─────────────────────────────────────────── */}
      <View style={s(colors).masthead}>
        {/* Çift çizgi — üst */}
        <View style={s(colors).mastheadLineThick} />
        <View style={s(colors).mastheadLineThin} />

        {/* Meta satır: baskı bilgisi + tarih */}
        <View style={s(colors).mastheadMeta}>
          <Text style={s(colors).mastheadMetaText}>{t.print}</Text>
          <Text style={s(colors).mastheadMetaDot}>◆</Text>
          <Text style={s(colors).mastheadMetaText}>
            {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Text style={s(colors).mastheadMetaDot}>◆</Text>
          <Text style={s(colors).mastheadMetaText}>{apiNews.length} {t.showing.toUpperCase()}</Text>
        </View>

        {/* Ana başlık */}
        <Text style={s(colors).mastheadTitle}>{t.newspaper}</Text>
        <Text style={s(colors).mastheadSlogan}>{t.slogan}</Text>

        {/* Çift çizgi — alt */}
        <View style={s(colors).mastheadLineThin} />
        <View style={s(colors).mastheadLineThick} />

        {/* Günün Konusu şeridi */}
        {gununKonusu && (
          <View style={s(colors).gununKonusuStrip}>
            <View style={s(colors).gununKonusuStripBadge}>
              <Text style={s(colors).gununKonusuStripBadgeText}>{t.topic}</Text>
            </View>
            <View style={s(colors).gununKonusuStripBody}>
              <Text style={s(colors).gununKonusuStripCat}>{gununKonusu.category.toUpperCase()} · {gununKonusu.count} haber</Text>
              {gununKonusu.article && (
                <Text style={s(colors).gununKonusuStripHeadline} numberOfLines={2}>
                  {gununKonusu.article.title}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Son Dakika Kayan Seridi ─────────────────────────────────── */}
      {tickerItems.length > 0 && (
        <View style={s(colors).ticker}>
          {/* Sol: SON DAKİKA rozeti */}
          <View style={s(colors).tickerBadge}>
            <View style={s(colors).tickerLiveDot} />
            <Text style={s(colors).tickerBadgeText}>{t.breaking}</Text>
          </View>
          {/* Dikey ayırıcı */}
          <View style={s(colors).tickerDivider} />
          {/* Kayan metin alanı */}
          <View style={s(colors).tickerTrack}>
            <Animated.View style={[s(colors).tickerInner, { transform: [{ translateX: tickerX }] }]}>
              {[...tickerItems, ...tickerItems].map((title, i) => (
                <View key={i} style={s(colors).tickerItemWrap}>
                  <Text style={s(colors).tickerItem}>{title}</Text>
                  <Text style={s(colors).tickerDot}>  ◆  </Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>
      )}

      {/* ── Mobilde filtreler üstte ─────────────────────────────────── */}
      {!isWeb && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(colors).mobileFilterBar}>
          {(['daily', 'weekly'] as PeriodFilter[]).map((p) => (
            <Pressable
              key={p}
              style={[s(colors).mobileChip, activePeriod === p && s(colors).mobileChipActive]}
              onPress={() => setActivePeriod(p)}
            >
              <Text style={[s(colors).mobileChipText, activePeriod === p && s(colors).mobileChipTextActive]}>
                {p === 'daily' ? t.daily : t.weekly}
              </Text>
            </Pressable>
          ))}
          <View style={s(colors).mobileChipDivider} />
          <Pressable
            style={[s(colors).mobileChip, selectedCategory === null && s(colors).mobileChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[s(colors).mobileChipText, selectedCategory === null && s(colors).mobileChipTextActive]}>
              {t.all}
            </Text>
          </Pressable>
          {categoryOptions.map((cat) => (
            <Pressable
              key={cat}
              style={[s(colors).mobileChip, selectedCategory === cat && s(colors).mobileChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[s(colors).mobileChipText, selectedCategory === cat && s(colors).mobileChipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── Ana içerik satırı ──────────────────────────────────────── */}
      <View style={[s(colors).boardRow, isWeb && s(colors).boardRowWeb]}>

        {/* ── Orta kolon: haberler ──────────────────────────────────── */}
        <View style={[s(colors).mainCol, isWeb && s(colors).mainColWeb]}>

          {newsLoading && (
            <View style={s(colors).loadingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={s(colors).loadingText}>{t.loading}</Text>
            </View>
          )}

          {/* Manşet / Öne çıkan haber */}
          {featured ? (
            <View style={s(colors).featured}>
              {featured.imageUrl ? (
                <Image source={{ uri: featured.imageUrl }} style={s(colors).featuredImage} resizeMode="cover" />
              ) : (
                <View style={s(colors).featuredImagePlaceholder}>
                  <Text style={s(colors).featuredImagePlaceholderText}>{featured.category}</Text>
                </View>
              )}
              <View style={s(colors).featuredBody}>
                <Text style={s(colors).featuredCategory}>{featured.category.toUpperCase()}</Text>
                <Pressable onPress={() => openArticlePreview(featured)}>
                  <Text style={s(colors).featuredHeadlineLink}>{featured.title}</Text>
                </Pressable>
                <Text style={s(colors).featuredLead}>{featured.summary}</Text>
                <View style={s(colors).byline}>
                  <Pressable onPress={() => openPublisherProfile(featured.source)}>
                    <Text style={s(colors).bylineSourceLink}>{featured.source}</Text>
                  </Pressable>
                  <Text style={s(colors).bylineDot}>·</Text>
                  <Text style={s(colors).bylineDate}>{formatDate(featured.publicationDate, dateLocale)}</Text>
                  <Text style={s(colors).bylineDot}>·</Text>
                  <Text style={s(colors).bylineMeta}>♥</Text>
                  <Text style={s(colors).bylineMetaNumber}>{featured.likes}</Text>
                  <Text style={s(colors).bylineMeta}>💬</Text>
                  <Text style={s(colors).bylineMetaNumber}>{featured.comments}</Text>
                </View>
              </View>
            </View>
          ) : !newsLoading ? (
            <View style={s(colors).emptyBox}>
              <Text style={s(colors).emptyText}>{t.noNews}</Text>
            </View>
          ) : null}

          {/* Kesme çizgisi */}
          {(secondaryGridNews.length > 0 || importantUpdates.length > 0) && <View style={s(colors).rule} />}

          {/* 2'li grid: ikincil haberler */}
          {(secondaryGridNews.length > 0 || importantUpdates.length > 0) && (
            <View style={s(colors).grid}>
              {secondaryGridNews.map((item) => (
                <View key={item.id} style={s(colors).gridCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={s(colors).gridImage} resizeMode="cover" />
                  ) : (
                    <View style={s(colors).gridImagePlaceholder}>
                      <Text style={s(colors).gridImagePlaceholderText}>{item.category.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={s(colors).gridBody}>
                    <Text style={s(colors).gridCategory}>{item.category.toUpperCase()}</Text>
                    <Pressable onPress={() => openArticlePreview(item)}>
                      <Text style={s(colors).gridHeadlineLink} numberOfLines={3}>{item.title}</Text>
                    </Pressable>
                    <Text style={s(colors).gridSummary} numberOfLines={2}>{item.summary}</Text>
                    <View style={s(colors).gridBylineRow}>
                      <Pressable onPress={() => openPublisherProfile(item.source)}>
                        <Text style={s(colors).gridBylineSource}>{item.source}</Text>
                      </Pressable>
                      <Text style={s(colors).gridBylineDot}>·</Text>
                      <Text style={s(colors).gridBylineDate}>{formatDate(item.publicationDate, dateLocale)}</Text>
                      <Text style={s(colors).gridBylineDot}>·</Text>
                      <Text style={s(colors).gridBylineMeta}>♥</Text>
                      <Text style={s(colors).gridBylineMetaNumber}>{item.likes}</Text>
                      <Text style={s(colors).gridBylineMeta}>💬</Text>
                      <Text style={s(colors).gridBylineMetaNumber}>{item.comments}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {importantUpdates.length > 0 && (
                <View style={[s(colors).gridCard, s(colors).importantCard]}>
                  <View style={s(colors).importantHeader}>
                    <View style={s(colors).importantLiveBadge}>
                      <View style={s(colors).importantLiveDot} />
                      <Text style={s(colors).importantLiveText}>{t.liveNow}</Text>
                    </View>
                    <Text style={s(colors).importantTitle}>{t.importantUpdates}</Text>
                  </View>

                  <View style={s(colors).importantList}>
                    {liveUpdates.map((item, idx) => (
                      <View key={item.id} style={[s(colors).importantItem, idx > 0 && s(colors).importantItemRule]}>
                        <View style={s(colors).importantLineRow}>
                          <View style={s(colors).importantItemDot} />
                          <Text style={s(colors).importantTime}>{formatRelativeTime(item.publishedAt, language, liveNowTs)}</Text>
                          <Text style={s(colors).importantMetaDot}>:</Text>
                          <Text style={s(colors).importantItemHeadline} numberOfLines={3}>
                            {item.text}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Kesme çizgisi */}
          {compactList.length > 0 && <View style={s(colors).rule} />}

          {/* Newspaper akışı: tüm haberler için döngüsel büyük kolon düzeni */}
          {newspaperBlocks.map((block, blockIndex) => {
            const leadOnLeft = block.leadPosition === 'left';
            const leadOnCenter = block.leadPosition === 'center';
            const leadOnRight = block.leadPosition === 'right';

            return (
              <View key={block.id} style={s(colors).newspaperSection}>
                <View style={[s(colors).newspaperTopRow, !isWeb && s(colors).newspaperTopRowMobile]}>
                  {/* Sol kolon */}
                  {leadOnLeft ? (
                    <View style={s(colors).newspaperCenterCol}>
                      {block.lead.imageUrl ? (
                        <Image source={{ uri: block.lead.imageUrl }} style={s(colors).newspaperLeadImage} resizeMode="cover" />
                      ) : (
                        <View style={s(colors).newspaperLeadImagePlaceholder}>
                          <Text style={s(colors).newspaperLeadImagePlaceholderText}>{block.lead.category.toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={s(colors).newspaperLeadBody}>
                        <Text style={s(colors).newspaperCategory}>{block.lead.category.toUpperCase()}</Text>
                        <Pressable onPress={() => openArticlePreview(block.lead)}>
                          <Text style={[s(colors).newspaperLeadHeadlineLink, !isWeb && s(colors).newspaperLeadHeadlineLinkMobile]} numberOfLines={3}>
                            {block.lead.title}
                          </Text>
                        </Pressable>
                        <Text style={s(colors).newspaperLeadSummary} numberOfLines={4}>{block.lead.summary}</Text>
                        <View style={s(colors).newspaperBylineRow}>
                          <Pressable onPress={() => openPublisherProfile(block.lead.source)}>
                            <Text style={s(colors).newspaperBylineSource}>{block.lead.source}</Text>
                          </Pressable>
                          <Text style={s(colors).newspaperBylineDot}>·</Text>
                          <Text style={s(colors).newspaperBylineDate}>{formatDate(block.lead.publicationDate, dateLocale)}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[s(colors).newspaperSideCol, !isWeb && s(colors).newspaperSideColMobile, isWeb && s(colors).newspaperSideColDivider]}>
                      {block.sideA.map((item, i) => (
                        <View key={item.id} style={s(colors).newspaperSideItem}>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={s(colors).newspaperSideImage} resizeMode="cover" />
                          ) : (
                            <View style={s(colors).newspaperSideImagePlaceholder}>
                              <Text style={s(colors).newspaperSideImagePlaceholderText}>{item.category.toUpperCase()}</Text>
                            </View>
                          )}
                          <Pressable onPress={() => openArticlePreview(item)}>
                            <Text style={s(colors).newspaperSideHeadlineLink} numberOfLines={3}>{item.title}</Text>
                          </Pressable>
                          <Text style={s(colors).newspaperSideSummary} numberOfLines={2}>{item.summary}</Text>
                          <View style={s(colors).newspaperBylineRow}>
                            <Pressable onPress={() => openPublisherProfile(item.source)}>
                              <Text style={s(colors).newspaperBylineSource}>{item.source}</Text>
                            </Pressable>
                            <Text style={s(colors).newspaperBylineDot}>·</Text>
                            <Text style={s(colors).newspaperBylineDate}>{formatDate(item.publicationDate, dateLocale)}</Text>
                          </View>
                          {i < block.sideA.length - 1 && <View style={s(colors).newspaperItemRule} />}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Orta kolon */}
                  {leadOnCenter ? (
                    <View style={s(colors).newspaperCenterCol}>
                      {block.lead.imageUrl ? (
                        <Image source={{ uri: block.lead.imageUrl }} style={s(colors).newspaperLeadImage} resizeMode="cover" />
                      ) : (
                        <View style={s(colors).newspaperLeadImagePlaceholder}>
                          <Text style={s(colors).newspaperLeadImagePlaceholderText}>{block.lead.category.toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={s(colors).newspaperLeadBody}>
                        <Text style={s(colors).newspaperCategory}>{block.lead.category.toUpperCase()}</Text>
                        <Pressable onPress={() => openArticlePreview(block.lead)}>
                          <Text style={[s(colors).newspaperLeadHeadlineLink, !isWeb && s(colors).newspaperLeadHeadlineLinkMobile]} numberOfLines={3}>
                            {block.lead.title}
                          </Text>
                        </Pressable>
                        <Text style={s(colors).newspaperLeadSummary} numberOfLines={4}>{block.lead.summary}</Text>
                        <View style={s(colors).newspaperBylineRow}>
                          <Pressable onPress={() => openPublisherProfile(block.lead.source)}>
                            <Text style={s(colors).newspaperBylineSource}>{block.lead.source}</Text>
                          </Pressable>
                          <Text style={s(colors).newspaperBylineDot}>·</Text>
                          <Text style={s(colors).newspaperBylineDate}>{formatDate(block.lead.publicationDate, dateLocale)}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[s(colors).newspaperSideCol, !isWeb && s(colors).newspaperSideColMobile, isWeb && s(colors).newspaperSideColDivider, isWeb && s(colors).newspaperSideColLeftDivider]}>
                      {(leadOnLeft ? block.sideA : block.sideB).map((item, i) => (
                        <View key={item.id} style={s(colors).newspaperSideItem}>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={s(colors).newspaperSideImage} resizeMode="cover" />
                          ) : (
                            <View style={s(colors).newspaperSideImagePlaceholder}>
                              <Text style={s(colors).newspaperSideImagePlaceholderText}>{item.category.toUpperCase()}</Text>
                            </View>
                          )}
                          <Pressable onPress={() => openArticlePreview(item)}>
                            <Text style={s(colors).newspaperSideHeadlineLink} numberOfLines={3}>{item.title}</Text>
                          </Pressable>
                          <Text style={s(colors).newspaperSideSummary} numberOfLines={2}>{item.summary}</Text>
                          <View style={s(colors).newspaperBylineRow}>
                            <Pressable onPress={() => openPublisherProfile(item.source)}>
                              <Text style={s(colors).newspaperBylineSource}>{item.source}</Text>
                            </Pressable>
                            <Text style={s(colors).newspaperBylineDot}>·</Text>
                            <Text style={s(colors).newspaperBylineDate}>{formatDate(item.publicationDate, dateLocale)}</Text>
                          </View>
                          {i < (leadOnLeft ? block.sideA : block.sideB).length - 1 && <View style={s(colors).newspaperItemRule} />}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Sağ kolon */}
                  {leadOnRight ? (
                    <View style={s(colors).newspaperCenterCol}>
                      {block.lead.imageUrl ? (
                        <Image source={{ uri: block.lead.imageUrl }} style={s(colors).newspaperLeadImage} resizeMode="cover" />
                      ) : (
                        <View style={s(colors).newspaperLeadImagePlaceholder}>
                          <Text style={s(colors).newspaperLeadImagePlaceholderText}>{block.lead.category.toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={s(colors).newspaperLeadBody}>
                        <Text style={s(colors).newspaperCategory}>{block.lead.category.toUpperCase()}</Text>
                        <Pressable onPress={() => openArticlePreview(block.lead)}>
                          <Text style={[s(colors).newspaperLeadHeadlineLink, !isWeb && s(colors).newspaperLeadHeadlineLinkMobile]} numberOfLines={3}>
                            {block.lead.title}
                          </Text>
                        </Pressable>
                        <Text style={s(colors).newspaperLeadSummary} numberOfLines={4}>{block.lead.summary}</Text>
                        <View style={s(colors).newspaperBylineRow}>
                          <Pressable onPress={() => openPublisherProfile(block.lead.source)}>
                            <Text style={s(colors).newspaperBylineSource}>{block.lead.source}</Text>
                          </Pressable>
                          <Text style={s(colors).newspaperBylineDot}>·</Text>
                          <Text style={s(colors).newspaperBylineDate}>{formatDate(block.lead.publicationDate, dateLocale)}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[s(colors).newspaperSideCol, !isWeb && s(colors).newspaperSideColMobile, isWeb && s(colors).newspaperSideColLeftDivider]}>
                      {block.sideB.map((item, i) => (
                        <View key={item.id} style={s(colors).newspaperSideItem}>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={s(colors).newspaperSideImage} resizeMode="cover" />
                          ) : (
                            <View style={s(colors).newspaperSideImagePlaceholder}>
                              <Text style={s(colors).newspaperSideImagePlaceholderText}>{item.category.toUpperCase()}</Text>
                            </View>
                          )}
                          <Pressable onPress={() => openArticlePreview(item)}>
                            <Text style={s(colors).newspaperSideHeadlineLink} numberOfLines={3}>{item.title}</Text>
                          </Pressable>
                          <Text style={s(colors).newspaperSideSummary} numberOfLines={2}>{item.summary}</Text>
                          <View style={s(colors).newspaperBylineRow}>
                            <Pressable onPress={() => openPublisherProfile(item.source)}>
                              <Text style={s(colors).newspaperBylineSource}>{item.source}</Text>
                            </Pressable>
                            <Text style={s(colors).newspaperBylineDot}>·</Text>
                            <Text style={s(colors).newspaperBylineDate}>{formatDate(item.publicationDate, dateLocale)}</Text>
                          </View>
                          {i < block.sideB.length - 1 && <View style={s(colors).newspaperItemRule} />}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {blockIndex < newspaperBlocks.length - 1 && <View style={s(colors).newspaperBlockRule} />}
              </View>
            );
          })}
        </View>

        {/* ── Sağ kolon (sadece web) ────────────────────────────────── */}
        {isWeb && (
          <View style={s(colors).rightCol}>

            {/* Filtreler */}
            <FilterPanel />

            {/* Takip edilen kaynaklar */}
            <View style={s(colors).sidePanel}>
              <View style={s(colors).sidePanelHeader}>
                <Text style={s(colors).sidePanelTitle}>{t.followed}</Text>
                <Text style={s(colors).sidePanelCount}>
                  {filteredFollowedSources.length}/{followedSources.length}
                </Text>
              </View>

              <Text style={s(colors).filterLabel}>{t.country}</Text>
              <View style={s(colors).chipWrap}>
                {(['all', 'Turkiye', 'Global'] as CountryFilter[]).map((opt) => (
                  <Pressable
                    key={opt}
                    style={[s(colors).filterChip, countryFilter === opt && s(colors).filterChipActive]}
                    onPress={() => setCountryFilter(opt)}
                  >
                    <Text style={[s(colors).filterChipText, countryFilter === opt && s(colors).filterChipTextActive]}>
                      {opt === 'all' ? t.all : opt === 'Turkiye' ? (language === 'en' ? 'Turkey' : language === 'de' ? 'Turkei' : 'Turkiye') : 'Global'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s(colors).filterLabel}>{t.language}</Text>
              <View style={s(colors).chipWrap}>
                {(['all', 'Turkce', 'Ingilizce'] as LanguageFilter[]).map((opt) => (
                  <Pressable
                    key={opt}
                    style={[s(colors).filterChip, languageFilter === opt && s(colors).filterChipActive]}
                    onPress={() => setLanguageFilter(opt)}
                  >
                    <Text style={[s(colors).filterChipText, languageFilter === opt && s(colors).filterChipTextActive]}>
                      {opt === 'all' ? t.all : opt === 'Turkce' ? (language === 'en' ? 'Turkish' : language === 'de' ? 'Turkisch' : 'Turkce') : language === 'de' ? 'Englisch' : 'English'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={s(colors).sourceList}>
                {filteredFollowedSources.length ? filteredFollowedSources.map((src) => {
                  const meta = getSourceMeta(src);
                  const logoUrl = sourceLogoMap[src];
                  return (
                    <Pressable key={src} style={s(colors).sourceRow} onPress={() => openPublisherProfile(src)}>
                      <View style={s(colors).sourceAvatar}>
                        {logoUrl ? (
                          <Image source={{ uri: logoUrl }} style={s(colors).sourceAvatarImage} resizeMode="cover" />
                        ) : (
                          <Text style={s(colors).sourceAvatarText}>{src.charAt(0).toUpperCase()}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s(colors).sourceNameLink}>{src}</Text>
                        <Text style={s(colors).sourceMeta}>{meta.country} · {meta.language}</Text>
                      </View>
                    </Pressable>
                  );
                }) : (
                  <Text style={s(colors).emptyText}>{t.noSource}</Text>
                )}
              </View>
            </View>

            {/* Piyasalar */}
            <View style={s(colors).sidePanel}>
              <View style={s(colors).sidePanelHeader}>
                <Text style={s(colors).sidePanelTitle}>{t.markets}</Text>
              </View>
              {MARKET_WATCH.map((item) => (
                <View key={item.id} style={s(colors).marketRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s(colors).marketLabel}>{item.label}</Text>
                    <Text style={s(colors).marketKind}>{item.kind}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s(colors).marketValue}>{item.value}</Text>
                    <Text style={[s(colors).marketChange, { color: item.isPositive ? colors.success : colors.error }]}>
                      {item.change}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

          </View>
        )}
      </View>
      <NewsQuickPreviewModal
        visible={!!previewItem}
        item={previewItem}
        colors={colors}
        onClose={() => setPreviewItem(null)}
        onReadMorePress={(item) => {
          setPreviewItem(null);
          router.push({
            pathname: '/news/[id]',
            params: {
              id: item.id,
              title: item.title,
              summary: item.summary,
              content: item.content,
              imageUrl: item.imageUrl,
              source: item.sourceName,
              publishedAt: item.publishedAt,
              category: item.category,
            },
          });
        }}
        onPublisherPress={(sourceName) => {
          setPreviewItem(null);
          openPublisherProfile(sourceName);
        }}
      />
    </ScrollView>
  );
}

const s = (colors: any) => StyleSheet.create({
  // ── Sayfa ──────────────────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },

  // ── Masthead (Gazete başlığı) ──────────────────────────────────────────
  masthead: { alignItems: 'center', gap: 4, marginBottom: Spacing.md },
  mastheadLineThick: { width: '100%', height: 3, backgroundColor: colors.accent },
  mastheadLineThin: { width: '100%', height: 1, backgroundColor: colors.accent, opacity: 0.5 },
  mastheadMeta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    width: '100%', justifyContent: 'center', paddingVertical: 3,
  },
  mastheadMetaText: {
    fontSize: 9, color: colors.textMuted,
    fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase',
  },
  mastheadMetaDot: { fontSize: 6, color: colors.accent, opacity: 0.6 },
  mastheadTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  mastheadSlogan: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 2,
  },
  mastheadDate: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  mastheadEdition: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },

  // ── Mobil filtre çubuğu ───────────────────────────────────────────────
  mobileFilterBar: { flexDirection: 'row', gap: Spacing.xs, paddingBottom: Spacing.sm, paddingRight: Spacing.lg },
  mobileChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: colors.surface,
  },
  mobileChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  mobileChipText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  mobileChipTextActive: { color: colors.white },
  mobileChipDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 4 },

  // ── Ana layout ────────────────────────────────────────────────────────
  boardRow: { width: '100%' },
  boardRowWeb: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.lg },
  mainCol: { width: '100%', gap: 0 },
  mainColWeb: { flex: 1, minWidth: 0 },

  // ── Loading ───────────────────────────────────────────────────────────
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  loadingText: { color: colors.textMuted, fontSize: Typography.fontSize.sm },

  // ── Manşet (Featured) ─────────────────────────────────────────────────
  featured: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.lg, overflow: 'hidden',
    backgroundColor: colors.surface, marginBottom: Spacing.md,
  },
  featuredImage: { width: '100%', height: 240 },
  featuredImagePlaceholder: {
    width: '100%', height: 180,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  featuredImagePlaceholderText: {
    fontSize: Typography.fontSize.xl, color: colors.textMuted,
    fontWeight: Typography.fontWeight.bold, letterSpacing: 2,
    textTransform: 'uppercase',
  },
  featuredBody: { padding: Spacing.lg, gap: Spacing.sm },
  featuredCategory: {
    fontSize: Typography.fontSize.xs, color: colors.accent,
    fontWeight: '700', letterSpacing: 2,
  },
  featuredHeadline: {
    fontSize: 24, fontWeight: '700',
    color: colors.textPrimary, lineHeight: 32,
  },
  featuredHeadlineLink: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 32,
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  featuredLead: {
    fontSize: Typography.fontSize.base, color: colors.textSecondary,
    lineHeight: 22,
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
  bylineSource: { fontSize: Typography.fontSize.sm, color: colors.textMuted, fontWeight: Typography.fontWeight.bold },
  bylineSourceLink: {
    fontSize: Typography.fontSize.sm,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  bylineDot: { color: colors.textMuted, fontSize: Typography.fontSize.sm },
  bylineDate: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
  bylineMeta: { fontSize: Typography.fontSize.md, color: colors.textMuted },
  bylineMetaNumber: { fontSize: Typography.fontSize.sm, color: colors.textMuted },

  // ── Kesme çizgileri ───────────────────────────────────────────────────
  rule: { height: 2, backgroundColor: colors.accent, marginVertical: Spacing.md },
  thinRule: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: Spacing.sm },

  // ── 2'li Grid ─────────────────────────────────────────────────────────
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.md },
  gridCard: {
    flex: 1, minWidth: 160,
    borderWidth: 1, borderColor: colors.borderSubtle,
    borderRadius: Radius.lg, overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gridImage: { width: '100%', height: 120 },
  gridImagePlaceholder: {
    width: '100%', height: 90,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  gridImagePlaceholderText: {
    fontSize: Typography.fontSize.xl, color: colors.accentLight,
    fontWeight: '700',
  },
  gridBody: { padding: Spacing.md, gap: 4 },
  gridCategory: {
    fontSize: Typography.fontSize.xs, color: colors.accent,
    fontWeight: '700', letterSpacing: 1.5,
  },
  gridHeadline: {
    fontSize: Typography.fontSize.md, fontWeight: '700',
    color: colors.textPrimary, lineHeight: 22,
  },
  gridHeadlineLink: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  gridSummary: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  gridBylineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
  gridBylineSource: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  gridBylineDot: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
  gridBylineDate: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
  gridBylineMeta: { fontSize: Typography.fontSize.md, color: colors.textMuted },
  gridBylineMetaNumber: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
  importantCard: {
    flexGrow: 1.4,
    minWidth: 300,
    borderColor: colors.error,
    borderWidth: 1.5,
    padding: Spacing.md,
    justifyContent: 'flex-start',
    gap: Spacing.sm,
  },
  importantHeader: {
    gap: 6,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  importantLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  importantLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  importantLiveText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  importantTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  importantList: {
    gap: Spacing.xs,
  },
  importantItem: {
    paddingVertical: 6,
  },
  importantItemRule: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: Spacing.sm,
  },
  importantItemHeadline: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
    fontWeight: '600',
    flex: 1,
  },
  importantLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  importantItemDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
    backgroundColor: colors.error,
    flexShrink: 0,
  },
  importantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  importantSource: {
    color: colors.accent,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  importantMetaDot: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.xs,
  },
  importantTime: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },

  // ── Kompakt liste ─────────────────────────────────────────────────────
  newspaperSection: {
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  newspaperTopRow: {
    flexDirection: 'row',
  },
  newspaperTopRowMobile: {
    flexDirection: 'column',
  },
  newspaperSideCol: {
    width: '26%',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  newspaperSideColMobile: {
    width: '100%',
  },
  newspaperSideColDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
  },
  newspaperSideColLeftDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSubtle,
  },
  newspaperSideItem: {
    gap: 4,
  },
  newspaperSideImage: {
    width: '100%',
    height: 130,
    borderRadius: Radius.sm,
  },
  newspaperSideImagePlaceholder: {
    width: '100%',
    height: 130,
    borderRadius: Radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newspaperSideImagePlaceholderText: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.xs,
    letterSpacing: 1,
    fontWeight: Typography.fontWeight.bold,
  },
  newspaperSideHeadlineLink: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  newspaperSideSummary: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  newspaperCenterCol: {
    flex: 1,
  },
  newspaperLeadImage: {
    width: '100%',
    height: 360,
  },
  newspaperLeadImagePlaceholder: {
    width: '100%',
    height: 360,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newspaperLeadImagePlaceholderText: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
    letterSpacing: 1.2,
    fontWeight: Typography.fontWeight.bold,
  },
  newspaperLeadBody: {
    padding: Spacing.md,
    gap: 6,
  },
  newspaperLeadHeadlineLink: {
    fontSize: 52,
    lineHeight: 58,
    color: colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  newspaperLeadHeadlineLinkMobile: {
    fontSize: 34,
    lineHeight: 40,
  },
  newspaperLeadSummary: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: 23,
  },
  newspaperRightItem: {
    gap: 6,
  },
  newspaperRightThumb: {
    width: '100%',
    height: 110,
    borderRadius: Radius.sm,
  },
  newspaperRightThumbPlaceholder: {
    width: '100%',
    height: 110,
    borderRadius: Radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newspaperRightThumbPlaceholderText: {
    color: colors.accent,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  newspaperRightBody: {
    gap: 4,
  },
  newspaperRightHeadlineLink: {
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  newspaperRightSummary: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  newspaperBottomGrid: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  newspaperBottomGridMobile: {
    flexDirection: 'column',
  },
  newspaperBottomCard: {
    width: '49%',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  newspaperBottomCardMobile: {
    width: '100%',
  },
  newspaperBottomImage: {
    width: '100%',
    height: 140,
  },
  newspaperBottomImagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newspaperBottomBody: {
    padding: Spacing.sm,
    gap: 4,
  },
  newspaperBottomImagePlaceholderText: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  newspaperBottomHeadlineLink: {
    fontSize: Typography.fontSize.md,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  newspaperBottomSummary: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  newspaperCategory: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  newspaperBylineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  newspaperBylineSource: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  newspaperBylineDot: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
  },
  newspaperBylineDate: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
  },
  newspaperItemRule: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: Spacing.sm,
  },
  newspaperBlockRule: {
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.3,
  },

  listCard: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
  listBody: { flex: 1, gap: 4 },
  listCategory: {
    fontSize: Typography.fontSize.xs, color: colors.accent,
    fontWeight: '700', letterSpacing: 1.5,
  },
  listHeadline: {
    fontSize: Typography.fontSize.md, fontWeight: '700',
    color: colors.textPrimary, lineHeight: 21,
  },
  listHeadlineLink: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 21,
    textDecorationLine: 'underline',
    textDecorationColor: colors.accent,
  },
  listSummary: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  listBylineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  listBylineSource: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  listBylineDot: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
  listBylineDate: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
  listBylineMeta: { fontSize: Typography.fontSize.md, color: colors.textMuted },
  listBylineMetaNumber: { fontSize: Typography.fontSize.sm, color: colors.textMuted },
  listThumb: {
    width: 88, height: 72,
    borderRadius: Radius.md, flexShrink: 0,
  },

  // ── Sağ kolon ─────────────────────────────────────────────────────────
  rightCol: { width: 290, gap: Spacing.md },

  // ── Filtre paneli ─────────────────────────────────────────────────────
  filterPanel: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.lg, padding: Spacing.md,
    backgroundColor: colors.surface, gap: Spacing.sm,
  },
  filterPanelTitle: {
    fontSize: Typography.fontSize.sm, fontWeight: '700',
    color: colors.accent, textTransform: 'uppercase',
    letterSpacing: 1.5, borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle, paddingBottom: Spacing.xs,
  },
  filterLabel: {
    fontSize: Typography.fontSize.xs, color: colors.textMuted,
    fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1,
    marginTop: Spacing.xs,
  },
  periodRow: { flexDirection: 'row', gap: Spacing.xs },
  periodBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.md, paddingVertical: 8,
    alignItems: 'center', backgroundColor: colors.background,
  },
  periodBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  periodBtnText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  periodBtnTextActive: { color: colors.white },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  filterChip: {
    borderWidth: 1, borderColor: colors.borderSubtle,
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm,
    paddingVertical: 5, backgroundColor: colors.background,
  },
  filterChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterChipText: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, fontWeight: Typography.fontWeight.medium },
  filterChipTextActive: { color: colors.white },

  // ── Yan panel (kaynaklar, piyasalar) ──────────────────────────────────
  sidePanel: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: Radius.lg, padding: Spacing.md,
    backgroundColor: colors.surface, gap: Spacing.sm,
  },
  sidePanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sidePanelTitle: {
    fontSize: Typography.fontSize.sm, fontWeight: '700',
    color: colors.accent, textTransform: 'uppercase', letterSpacing: 1.5,
  },
  sidePanelCount: { fontSize: Typography.fontSize.xs, color: colors.textMuted },
  sourceList: { gap: Spacing.xs },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  sourceAvatar: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  sourceAvatarImage: { width: '100%', height: '100%' },
  sourceAvatarText: { color: colors.white, fontWeight: '700', fontSize: Typography.fontSize.sm },
  sourceName: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  sourceNameLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  sourceMeta: { fontSize: Typography.fontSize.xs, color: colors.textMuted },

  // ── Piyasalar ─────────────────────────────────────────────────────────
  marketRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  marketLabel: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  marketKind: { fontSize: Typography.fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  marketValue: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  marketChange: { fontSize: Typography.fontSize.xs, fontWeight: '700' },

  // ── Boş durum ─────────────────────────────────────────────────────────
  emptyBox: {
    borderWidth: 1, borderColor: colors.borderSubtle,
    borderRadius: Radius.lg, padding: Spacing.lg,
    backgroundColor: colors.surface, minHeight: 120,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: Typography.fontSize.base, textAlign: 'center' },

  // ── Günün Konusu Şeridi ────────────────────────────────────────────────
  gununKonusuStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    backgroundColor: colors.surfaceHigh,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: 2,
  },
  gununKonusuStripBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 68,
  },
  gununKonusuStripBadgeText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  gununKonusuStripBody: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    justifyContent: 'center',
    gap: 2,
  },
  gununKonusuStripCat: {
    fontSize: 9,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  gununKonusuStripHeadline: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ── Son Dakika Ticker ─────────────────────────────────────────────────
  ticker: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#1a1a2e',
    borderRadius: Radius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    height: 44,
    borderWidth: 1,
    borderColor: colors.error,
  },
  tickerBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  tickerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    opacity: 0.9,
  },
  tickerBadgeText: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tickerDivider: {
    width: 1,
    backgroundColor: colors.error,
    opacity: 0.5,
  },
  tickerTrack: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 9000,
  },
  tickerItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingLeft: Spacing.md,
  },
  tickerItem: {
    color: '#e8e8f0',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    flexShrink: 0,
  },
  tickerDot: {
    color: colors.error,
    fontSize: Typography.fontSize.xs,
    flexShrink: 0,
  },

  // ── Filtre paneli güncellemeleri ──────────────────────────────────────
  filterPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: Spacing.xs,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBadgeNum: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  resetBtnText: {
    fontSize: Typography.fontSize.xs,
    color: colors.error,
    fontWeight: '700',
  },
  // ── Dil segmented control ─────────────────────────────────────────────
  segmentedCtrl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 2,
  },
  segmentBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentFlag: {
    fontSize: 15,
  },
  segmentText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: colors.white,
  },

  filterChipCount: {
    fontSize: Typography.fontSize.xs,
    opacity: 0.7,
  },
  filterResultRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: Spacing.xs,
    marginTop: Spacing.xs,
  },
  filterResultText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

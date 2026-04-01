import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useApiNews } from '@/hooks/useNews';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { fetchArticleFullContent, fetchSimilarArticlesFromDb, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';

function stripHtml(value: string): string {
  const cleaned = value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Keep paragraph spacing, but collapse single newlines inside a paragraph.
  return cleaned
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/[ ]{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function unwrapImageUrl(input: string): string {
  try {
    const parsed = new URL(input);
    if (parsed.pathname.includes('/api/proxy/image')) {
      const original = parsed.searchParams.get('url');
      if (original) return decodeURIComponent(original);
    }
  } catch {
    // Keep original value when URL parsing fails.
  }
  return input;
}

function imageFingerprint(input: string): string {
  const raw = unwrapImageUrl(input);

  try {
    const parsed = new URL(raw);
    const pathname = parsed.pathname.toLowerCase();
    const file = pathname.split('/').pop() ?? pathname;
    const noExt = file.replace(/\.[a-z0-9]+$/i, '');
    const normalized = noExt
      .replace(/(\d{2,4})x(\d{2,4})/g, '')
      .replace(/[_-](\d{2,4})$/g, '')
      .replace(/[_-](small|medium|large|thumb|thumbnail|preview)$/g, '')
      .replace(/[^a-z0-9]/g, '');

    if (normalized.length >= 8) return normalized;

    const longToken = pathname.match(/[a-f0-9]{16,}|[0-9a-f]{8}-[0-9a-f-]{18,}/i)?.[0];
    if (longToken) return longToken;

    return pathname.replace(/[^a-z0-9]/g, '').slice(-32);
  } catch {
    return raw.replace(/[^a-z0-9]/gi, '').slice(-32);
  }
}

function imageQualityScore(input: string): number {
  const raw = unwrapImageUrl(input);
  const lower = raw.toLowerCase();
  let score = 0;

  const dimMatches = [...lower.matchAll(/(\d{2,4})x(\d{2,4})/g)];
  dimMatches.forEach((m) => {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (Number.isFinite(w) && Number.isFinite(h)) score = Math.max(score, w * h);
  });

  const sizeMatches = [...lower.matchAll(/\/(\d{2,4})\//g)].map((m) => Number(m[1]));
  sizeMatches.forEach((n) => {
    if (Number.isFinite(n)) score = Math.max(score, n * n);
  });

  if (lower.includes('/0x0/')) score += 1_500_000;
  if (lower.includes('/1024/')) score += 1_000_000;
  if (lower.includes('/770x0/')) score += 800_000;
  if (lower.includes('/620x350/')) score += 200_000;

  return score;
}

function textToParagraphs(value: string): string[] {
  return value
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function findSafeCutIndex(text: string, maxChars: number): number {
  if (text.length <= maxChars) return text.length;
  const probe = text.slice(0, maxChars);
  const punctuationCut = Math.max(
    probe.lastIndexOf('. '),
    probe.lastIndexOf('! '),
    probe.lastIndexOf('? '),
    probe.lastIndexOf('\n\n')
  );
  if (punctuationCut > Math.floor(maxChars * 0.65)) return punctuationCut + 1;

  const whitespaceCut = probe.lastIndexOf(' ');
  if (whitespaceCut > Math.floor(maxChars * 0.7)) return whitespaceCut;

  return maxChars;
}

function resolveSourceDomainFromName(sourceName: string): string | undefined {
  const sourceDomains: Record<string, string> = {
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

  return sourceDomains[sourceName.toLocaleLowerCase('tr-TR').trim()];
}

function buildPublisherLogoUrl(sourceName: string, sourceUrl?: string): string | undefined {
  try {
    if (sourceUrl) {
      const origin = new URL(sourceUrl).origin;
      return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(origin)}`;
    }
  } catch {
    // Fall through to source-name domain mapping.
  }

  const domain = resolveSourceDomainFromName(sourceName);
  if (!domain) return undefined;
  return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`;
}

// ─── Benzer Haber Skorlama ───────────────────────────────────────────────────
type ArticleLike = { id: string; category?: string; title: string; language: string; description: string; source: { name: string }; publishedAt: string; imageUrl?: string; similarityScore?: number };

function getSimilarArticles(
  currentId: string,
  currentCategory: string,
  currentTitle: string,
  currentLanguage: string | undefined,
  allArticles: ArticleLike[],
  count = 8
): ArticleLike[] {
  const titleWords = currentTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4);

  return allArticles
    .filter((a) => a.id !== currentId)
    .map((a) => {
      let wordMatches = 0;
      const aWords = a.title.toLowerCase().split(/\s+/);
      titleWords.forEach((w) => { if (aWords.some((aw) => aw.startsWith(w) || w.startsWith(aw))) wordMatches += 1; });
      return { article: a, score: wordMatches * 10 };
    })
    .filter((s) => s.score >= 20)
    .sort((a, b) => b.score - a.score || new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime())
    .slice(0, count)
    .map((s) => s.article);
}

// ─── Yatay Öneri Kartı ───────────────────────────────────────────────────────
function RelatedArticleCard({ article, onPress, colors }: { article: ArticleLike; onPress: () => void; colors: any }) {
  const cat = mapToContentCategory(article.category, article.title, article.description);
  const diff = Date.now() - new Date(article.publishedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const timeLabel = mins < 60 ? `${mins}dk` : mins < 1440 ? `${Math.floor(mins / 60)}sa` : `${Math.floor(mins / 1440)}g`;
  const imgUrl = article.imageUrl ? proxyImageUrl(article.imageUrl) : undefined;

  return (
    <Pressable
      style={({ pressed }) => [
        relatedStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        pressed && { opacity: 0.82 },
      ]}
      onPress={onPress}
    >
      {imgUrl ? (
        <Image source={{ uri: imgUrl }} style={relatedStyles.thumb} resizeMode="cover" />
      ) : (
        <View style={[relatedStyles.thumbPlaceholder, { backgroundColor: colors.surfaceInput }]}>
          <Text style={relatedStyles.thumbEmoji}>📰</Text>
        </View>
      )}
      
      {article.similarityScore ? (
        <View style={[relatedStyles.similarityBadge, { backgroundColor: 'rgba(20,83,45,0.85)' }]}>
          <Text style={relatedStyles.similarityText}>
            %{Math.round(article.similarityScore * 100)} AYNI
          </Text>
        </View>
      ) : null}

      <View style={relatedStyles.cardBody}>
        <View style={[relatedStyles.catBadge, { backgroundColor: colors.accent + '1A' }]}>
          <Text style={[relatedStyles.catText, { color: colors.accent }]}>{cat}</Text>
        </View>
        <Text style={[relatedStyles.cardTitle, { color: colors.textPrimary }]} numberOfLines={3}>
          {article.title}
        </Text>
        <Text style={[relatedStyles.cardMeta, { color: colors.textMuted }]}>
          {article.source.name} · {timeLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const relatedStyles = StyleSheet.create({
  card:             { width: 200, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  thumb:            { width: '100%', height: 112 },
  thumbPlaceholder: { width: '100%', height: 112, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji:       { fontSize: 24 },
  similarityBadge:  { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, zIndex: 10, backdropFilter: 'blur(4px)' },
  similarityText:   { color: '#5EEAD4', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardBody:         { padding: Spacing.sm, gap: 5 },
  catBadge:         { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  catText:          { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  cardTitle:        { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cardMeta:         { fontSize: 11 },
});

export default function NewsDetailPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { articles } = useApiNews();
  const { savedIds, toggleSaved } = useBookmarks();
  const isWeb = Platform.OS === 'web';
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<string, number>>({});
  const [leftHoverEdge, setLeftHoverEdge] = useState<'left' | 'right' | null>(null);
  const [rightHoverEdge, setRightHoverEdge] = useState<'left' | 'right' | null>(null);
  const [leftCarouselIndex, setLeftCarouselIndex] = useState(0);
  const [rightCarouselIndex, setRightCarouselIndex] = useState(0);
  const [leftSlotWidth, setLeftSlotWidth] = useState(0);
  const [rightSlotWidth, setRightSlotWidth] = useState(0);
  const [leftSlotHeight, setLeftSlotHeight] = useState(0);
  const [rightSlotHeight, setRightSlotHeight] = useState(0);
  const leftCarouselRef = useRef<ScrollView | null>(null);
  const rightCarouselRef = useRef<ScrollView | null>(null);
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    summary?: string;
    content?: string;
    imageUrl?: string;
    source?: string;
    publishedAt?: string;
    category?: string;
  }>();

  if (!params.id || !params.title) {
    return (
      <View style={styles(colors).centerWrap}>
        <Text style={styles(colors).errorTitle}>Haber acilamadi</Text>
        <Text style={styles(colors).statusText}>Haber verisi bulunamadi.</Text>
      </View>
    );
  }

  const articleFromCache = articles.find((item: { id: string }) => item.id === params.id);

  useEffect(() => {
    let active = true;
    setLoadingContent(true);
    fetchArticleFullContent(params.id)
      .then((data) => {
        if (active) {
          setFullContent(data.content);
          setExtraImages(Array.isArray(data.images) ? data.images : []);
        }
      })
      .catch(() => {
        if (active) {
          setFullContent(null);
          setExtraImages([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingContent(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  const resolvedTitle = articleFromCache?.title ?? params.title;
  const resolvedSummary = articleFromCache?.description ?? params.summary ?? '';
  const rawContent = fullContent ?? articleFromCache?.content ?? params.content ?? resolvedSummary;
  const body = stripHtml(rawContent);
  const category = mapToContentCategory(
    articleFromCache?.category ?? params.category,
    resolvedTitle,
    resolvedSummary
  );
  const sourceName = articleFromCache?.source?.name ?? params.source ?? 'Kaynak bilinmiyor';
  const sourceUrl = articleFromCache?.source?.url;
  const currentLanguage = articleFromCache?.language;

  const [exactMatches, setExactMatches] = useState<ArticleLike[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<ArticleLike[]>([]);

  useEffect(() => {
    let active = true;
    if (!params.id) return;

    const fallbackSimilar = getSimilarArticles(params.id, category, resolvedTitle ?? '', currentLanguage, articles as ArticleLike[]);
    setRelatedArticles(fallbackSimilar);

    fetchSimilarArticlesFromDb(params.id)
      .then((dbSimilar) => {
        if (!active) return;
        if (dbSimilar && dbSimilar.length > 0) {
          setExactMatches(dbSimilar);
        }
      })
      .catch((err) => {
        // ignore
      });

    return () => {
      active = false;
    };
  }, [params.id, category, resolvedTitle, currentLanguage, articles]);
  const publisherLogoUrl = useMemo(
    () => buildPublisherLogoUrl(sourceName, sourceUrl),
    [sourceName, sourceUrl]
  );
  const publishedLabel = articleFromCache?.publishedAt
    ? new Date(articleFromCache.publishedAt).toLocaleDateString('tr-TR')
    : params.publishedAt ?? 'Tarih yok';
  const imageUrl = articleFromCache?.imageUrl ? proxyImageUrl(articleFromCache.imageUrl) : params.imageUrl;
  const proxiedExtraImages = useMemo(
    () => extraImages.map((img) => proxyImageUrl(img) ?? img),
    [extraImages]
  );
  const galleryImages = useMemo(() => {
    const all = [imageUrl, ...proxiedExtraImages].filter(Boolean) as string[];
    const bestByFingerprint = new Map<string, { url: string; score: number; order: number }>();

    all.forEach((img, index) => {
      const key = imageFingerprint(img);
      const score = imageQualityScore(img);
      const current = bestByFingerprint.get(key);

      if (!current || score > current.score) {
        bestByFingerprint.set(key, { url: img, score, order: index });
      }
    });

    return [...bestByFingerprint.values()]
      .sort((a, b) => a.order - b.order)
      .map((item) => item.url);
  }, [imageUrl, proxiedExtraImages]);
  const mainImage = useMemo(() => {
    if (!galleryImages.length) return undefined;
    return [...galleryImages].sort((a, b) => imageQualityScore(b) - imageQualityScore(a))[0];
  }, [galleryImages]);

  const secondaryImages = useMemo(
    () => galleryImages.filter((img) => img !== mainImage),
    [galleryImages, mainImage]
  );
  useEffect(() => {
    const targets = [mainImage, ...secondaryImages].filter(Boolean) as string[];
    if (!targets.length) return;

    targets.forEach((url) => {
      if (imageAspectRatios[url]) return;

      Image.getSize(
        url,
        (width, height) => {
          if (!width || !height) return;
          setImageAspectRatios((prev) => {
            if (prev[url]) return prev;
            return { ...prev, [url]: width / height };
          });
        },
        () => {
          setImageAspectRatios((prev) => {
            if (prev[url]) return prev;
            return { ...prev, [url]: 4 / 3 };
          });
        }
      );
    });
  }, [mainImage, secondaryImages, imageAspectRatios]);

  const mainImageAspectRatio = mainImage ? imageAspectRatios[mainImage] ?? 4 / 3 : 4 / 3;
  const paragraphs = useMemo(
    () => body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    [body]
  );
  const articleImages = useMemo(
    () => (mainImage ? [mainImage, ...secondaryImages] : [...secondaryImages]),
    [mainImage, secondaryImages]
  );
  const halfImageIndex = Math.ceil(articleImages.length / 2);
  const firstHalfImages = useMemo(() => articleImages.slice(0, halfImageIndex), [articleImages, halfImageIndex]);
  const secondHalfImages = useMemo(() => articleImages.slice(halfImageIndex), [articleImages, halfImageIndex]);
  const hasRightImageSlot = secondHalfImages.length > 0;
  const TOP_TEXT_BUDGET = Math.max(860, Math.floor((leftSlotHeight || 320) * 3.35));
  const BOTTOM_TEXT_BUDGET = Math.max(860, Math.floor((rightSlotHeight || 320) * 3.35));
  const fullText = useMemo(() => paragraphs.join('\n\n'), [paragraphs]);
  const topCutIndex = useMemo(() => findSafeCutIndex(fullText, TOP_TEXT_BUDGET), [fullText, TOP_TEXT_BUDGET]);
  const topText = useMemo(() => fullText.slice(0, topCutIndex).trim(), [fullText, topCutIndex]);
  const consumedTop = topCutIndex;
  const bottomCutIndex = useMemo(() => {
    if (!hasRightImageSlot) return fullText.length;
    const remaining = fullText.slice(consumedTop);
    return consumedTop + findSafeCutIndex(remaining, BOTTOM_TEXT_BUDGET);
  }, [hasRightImageSlot, fullText, consumedTop, BOTTOM_TEXT_BUDGET]);
  const bottomText = useMemo(() => {
    if (!hasRightImageSlot) return fullText.slice(consumedTop).trim();
    return fullText.slice(consumedTop, bottomCutIndex).trim();
  }, [fullText, consumedTop, bottomCutIndex, hasRightImageSlot]);
  const consumedBottom = bottomCutIndex;
  const trailingText = useMemo(
    () => (hasRightImageSlot ? fullText.slice(consumedBottom).trim() : ''),
    [fullText, consumedBottom, hasRightImageSlot]
  );
  const topParagraphs = useMemo(() => textToParagraphs(topText), [topText]);
  const bottomParagraphs = useMemo(() => textToParagraphs(bottomText), [bottomText]);
  const trailingParagraphs = useMemo(() => textToParagraphs(trailingText), [trailingText]);

  const openPublisherProfile = () => {
    const publisherId = getPublisherIdFromSourceName(sourceName);
    router.push(`/publisherprofile?id=${encodeURIComponent(publisherId)}` as any);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${resolvedTitle}\n\n${sourceUrl || 'Smart Newspaper'}`,
        url: sourceUrl,
        title: resolvedTitle,
      });
    } catch (error) {
      // Sessiz şekilde hata geç
    }
  };

  const isSaved = savedIds.includes(params.id || '');

  const handleToggleSave = () => {
    if (params.id) {
      toggleSaved(params.id);
    }
  };

  const onLeftMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = leftSlotWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setLeftCarouselIndex(nextIndex);
  };

  const onRightMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = rightSlotWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setRightCarouselIndex(nextIndex);
  };

  const onLeftScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = leftSlotWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex !== leftCarouselIndex) setLeftCarouselIndex(nextIndex);
  };

  const onRightScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = rightSlotWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex !== rightCarouselIndex) setRightCarouselIndex(nextIndex);
  };

  const scrollLeftCarouselTo = (index: number) => {
    if (!leftCarouselRef.current || !leftSlotWidth) return;
    const bounded = Math.max(0, Math.min(index, firstHalfImages.length - 1));
    leftCarouselRef.current.scrollTo({ x: bounded * leftSlotWidth, animated: true });
    setLeftCarouselIndex(bounded);
  };

  const scrollRightCarouselTo = (index: number) => {
    if (!rightCarouselRef.current || !rightSlotWidth) return;
    const bounded = Math.max(0, Math.min(index, secondHalfImages.length - 1));
    rightCarouselRef.current.scrollTo({ x: bounded * rightSlotWidth, animated: true });
    setRightCarouselIndex(bounded);
  };

  const leftImageHeight = leftSlotHeight > 18 ? leftSlotHeight - 18 : leftSlotHeight;
  const rightImageHeight = rightSlotHeight > 18 ? rightSlotHeight - 18 : rightSlotHeight;

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).category}>{category.toUpperCase()}</Text>
      <Text style={styles(colors).title}>{resolvedTitle}</Text>

      <View style={styles(colors).metaWrap}>
        <Text style={styles(colors).metaText}>{sourceName}</Text>
        <Text style={styles(colors).metaDot}>•</Text>
        <Text style={styles(colors).metaText}>{publishedLabel}</Text>
      </View>

      <Pressable style={styles(colors).publisherCard} onPress={openPublisherProfile}>
        <View style={styles(colors).publisherLogo}>
          {publisherLogoUrl ? (
            <Image source={{ uri: publisherLogoUrl }} style={styles(colors).publisherLogoImage} resizeMode="cover" />
          ) : (
            <Text style={styles(colors).publisherLogoText}>{sourceName.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).publisherLabel}>Publisher</Text>
          <Text style={styles(colors).publisherName}>{sourceName}</Text>
        </View>
        <Text style={styles(colors).publisherCta}>Profili Gor</Text>
      </Pressable>

      <View style={styles(colors).actionBar}>
        <Pressable
          style={({ pressed }) => [
            styles(colors).actionButton,
            { backgroundColor: isSaved ? colors.accent + '1A' : colors.surfaceInput },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleToggleSave}
        >
          <Text style={[styles(colors).actionButtonLabel, { color: isSaved ? colors.accent : colors.textPrimary }]}>
            {isSaved ? 'Kaydedildi' : 'Kaydet'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles(colors).actionButton,
            { backgroundColor: colors.surfaceInput },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleShare}
        >
          <Text style={[styles(colors).actionButtonLabel, { color: colors.textPrimary }]}>Paylas</Text>
        </Pressable>
      </View>

      <View style={[styles(colors).detailLayout, isWeb ? styles(colors).detailLayoutWeb : null]}>
        <View style={styles(colors).bodyCol}>
          <View style={styles(colors).bodyCard}>
            {loadingContent ? (
              <View style={styles(colors).loadingWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles(colors).statusText}>Kaynak icerigi yukleniyor...</Text>
              </View>
            ) : paragraphs.length ? (
              isWeb ? (
                <>
                  <View style={styles(colors).webFlowRow}>
                    <View style={[styles(colors).imageSlot, styles(colors).imageSlotLeft]}>
                      <View
                        style={styles(colors).imageSlotViewport}
                        onLayout={(event) => {
                          setLeftSlotWidth(event.nativeEvent.layout.width);
                          setLeftSlotHeight(event.nativeEvent.layout.height);
                        }}
                      >
                      <ScrollView
                        ref={leftCarouselRef}
                        horizontal
                        pagingEnabled
                        style={styles(colors).imageSlotScroller}
                        contentContainerStyle={styles(colors).imageSlotContent}
                        showsHorizontalScrollIndicator
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                        onMomentumScrollEnd={onLeftMomentumEnd}
                        onScroll={onLeftScroll}
                        scrollEventThrottle={16}
                      >
                        {firstHalfImages.map((img, idx) => (
                          <Image
                            key={`first-half-${idx}`}
                            source={{ uri: img }}
                            style={[
                              styles(colors).slotImage,
                              { width: leftSlotWidth || '100%', height: leftImageHeight || '100%' },
                            ]}
                            resizeMode="contain"
                          />
                        ))}
                      </ScrollView>
                        {!!firstHalfImages.length && (
                          <View style={styles(colors).dotsRow}>
                            {firstHalfImages.map((_, idx) => (
                              <Pressable
                                key={`left-dot-${idx}`}
                                onPress={() => scrollLeftCarouselTo(idx)}
                                style={[
                                  styles(colors).dot,
                                  idx === leftCarouselIndex && styles(colors).dotActive,
                                ]}
                              />
                            ))}
                          </View>
                        )}
                      </View>

                      {isWeb && firstHalfImages.length > 1 && (
                        <>
                          <Pressable
                            style={[styles(colors).edgeHoverZone, styles(colors).edgeHoverZoneLeft]}
                            onHoverIn={() => setLeftHoverEdge('left')}
                            onHoverOut={() => setLeftHoverEdge(null)}
                            onPress={() => scrollLeftCarouselTo(leftCarouselIndex - 1)}
                          >
                            <Text
                              style={[
                                styles(colors).edgeArrowText,
                                leftHoverEdge === 'left' ? styles(colors).edgeArrowVisible : styles(colors).edgeArrowHidden,
                              ]}
                            >
                              ‹
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[styles(colors).edgeHoverZone, styles(colors).edgeHoverZoneRight]}
                            onHoverIn={() => setLeftHoverEdge('right')}
                            onHoverOut={() => setLeftHoverEdge(null)}
                            onPress={() => scrollLeftCarouselTo(leftCarouselIndex + 1)}
                          >
                            <Text
                              style={[
                                styles(colors).edgeArrowText,
                                leftHoverEdge === 'right' ? styles(colors).edgeArrowVisible : styles(colors).edgeArrowHidden,
                              ]}
                            >
                              ›
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>

                    <View style={styles(colors).sideTextSlot}>
                      <View style={styles(colors).sideTextContent}>
                        {topParagraphs.map((paragraph, idx) => (
                          <Text key={`top-p-${idx}`} style={styles(colors).bodyText}>{paragraph}</Text>
                        ))}
                      </View>
                    </View>
                  </View>

                  {hasRightImageSlot ? (
                    <View style={styles(colors).webFlowRow}>
                      <View style={styles(colors).sideTextSlot}>
                        <View style={styles(colors).sideTextContent}>
                          {bottomParagraphs.map((paragraph, idx) => (
                            <Text key={`bottom-p-${idx}`} style={styles(colors).bodyText}>{paragraph}</Text>
                          ))}
                        </View>
                      </View>

                      <View style={[styles(colors).imageSlot, styles(colors).imageSlotRight]}>
                        <View
                          style={styles(colors).imageSlotViewport}
                          onLayout={(event) => {
                            setRightSlotWidth(event.nativeEvent.layout.width);
                            setRightSlotHeight(event.nativeEvent.layout.height);
                          }}
                        >
                        <ScrollView
                          ref={rightCarouselRef}
                          horizontal
                          pagingEnabled
                          style={styles(colors).imageSlotScroller}
                          contentContainerStyle={styles(colors).imageSlotContent}
                          showsHorizontalScrollIndicator
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled
                          onMomentumScrollEnd={onRightMomentumEnd}
                          onScroll={onRightScroll}
                          scrollEventThrottle={16}
                        >
                          {secondHalfImages.map((img, idx) => (
                            <Image
                              key={`second-half-${idx}`}
                              source={{ uri: img }}
                              style={[
                                styles(colors).slotImage,
                                { width: rightSlotWidth || '100%', height: rightImageHeight || '100%' },
                              ]}
                              resizeMode="contain"
                            />
                          ))}
                        </ScrollView>
                          {!!secondHalfImages.length && (
                            <View style={styles(colors).dotsRow}>
                              {secondHalfImages.map((_, idx) => (
                                <Pressable
                                  key={`right-dot-${idx}`}
                                  onPress={() => scrollRightCarouselTo(idx)}
                                  style={[
                                    styles(colors).dot,
                                    idx === rightCarouselIndex && styles(colors).dotActive,
                                  ]}
                                />
                              ))}
                            </View>
                          )}
                        </View>

                        {isWeb && secondHalfImages.length > 1 && (
                          <>
                            <Pressable
                              style={[styles(colors).edgeHoverZone, styles(colors).edgeHoverZoneLeft]}
                              onHoverIn={() => setRightHoverEdge('left')}
                              onHoverOut={() => setRightHoverEdge(null)}
                              onPress={() => scrollRightCarouselTo(rightCarouselIndex - 1)}
                            >
                              <Text
                                style={[
                                  styles(colors).edgeArrowText,
                                  rightHoverEdge === 'left' ? styles(colors).edgeArrowVisible : styles(colors).edgeArrowHidden,
                                ]}
                              >
                                ‹
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles(colors).edgeHoverZone, styles(colors).edgeHoverZoneRight]}
                              onHoverIn={() => setRightHoverEdge('right')}
                              onHoverOut={() => setRightHoverEdge(null)}
                              onPress={() => scrollRightCarouselTo(rightCarouselIndex + 1)}
                            >
                              <Text
                                style={[
                                  styles(colors).edgeArrowText,
                                  rightHoverEdge === 'right' ? styles(colors).edgeArrowVisible : styles(colors).edgeArrowHidden,
                                ]}
                              >
                                ›
                              </Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={styles(colors).inlineTextOnly}>
                      {bottomParagraphs.map((paragraph, idx) => (
                        <Text key={`bottom-full-p-${idx}`} style={styles(colors).bodyText}>{paragraph}</Text>
                      ))}
                    </View>
                  )}

                  {!!trailingParagraphs.length && hasRightImageSlot && (
                    <View style={styles(colors).inlineTextOnly}>
                      {trailingParagraphs.map((paragraph, idx) => (
                        <Text key={`trail-p-${idx}`} style={styles(colors).bodyText}>{paragraph}</Text>
                      ))}
                    </View>
                  )}

                </>
              ) : (
                paragraphs.map((paragraph, idx) => (
                  <Text key={`p-${idx}`} style={styles(colors).bodyText}>{paragraph}</Text>
                ))
              )
            ) : (
              <Text style={styles(colors).bodyText}>{body}</Text>
            )}
          </View>
        </View>

        {!isWeb && (
        <View style={[styles(colors).mediaCol, isWeb ? styles(colors).mediaColWeb : null]}>
          {mainImage ? (
            <Image
              source={{ uri: mainImage }}
              style={[styles(colors).heroImage, { aspectRatio: mainImageAspectRatio }]}
              resizeMode="contain"
            />
          ) : (
            <View style={styles(colors).heroPlaceholder}>
              <Text style={styles(colors).heroPlaceholderText}>{category.toUpperCase()}</Text>
            </View>
          )}

          {secondaryImages.length ? (
            <View style={styles(colors).galleryWrap}>
              {secondaryImages.map((img, idx) => (
                <Image
                  key={`img-${idx}`}
                  source={{ uri: img }}
                  style={[
                    styles(colors).galleryImage,
                    { aspectRatio: imageAspectRatios[img] ?? 4 / 3 },
                    idx % 2 === 0 ? styles(colors).galleryImageLeft : styles(colors).galleryImageRight,
                  ]}
                  resizeMode="contain"
                />
              ))}
            </View>
          ) : null}
        </View>
        )}

        {isWeb && exactMatches.length > 0 && (
          <View style={[styles(colors).mediaCol, styles(colors).mediaColWeb]}>
            <View style={styles(colors).relatedHeader}>
              <View style={[styles(colors).relatedDot, { backgroundColor: colors.accent }]} />
              <Text style={styles(colors).relatedTitle}>FARKLI KAYNAKLARDA BU HABER</Text>
            </View>
            <View style={{ gap: 12, marginTop: 8 }}>
              {exactMatches.map((item) => (
                <RelatedArticleCard
                  key={`exact-web-${item.id}`}
                  article={item}
                  colors={colors}
                  onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {!isWeb && exactMatches.length > 0 && (
        <View style={styles(colors).relatedSection}>
          <View style={styles(colors).relatedHeader}>
            <View style={[styles(colors).relatedDot, { backgroundColor: colors.accent }]} />
            <Text style={styles(colors).relatedTitle}>Farklı Kaynaklarda Bu Haber</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).relatedList}>
            {exactMatches.map((item) => (
              <RelatedArticleCard
                key={`exact-mob-${item.id}`}
                article={item}
                colors={colors}
                onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {relatedArticles.length > 0 && (
        <View style={styles(colors).relatedSection}>
          <View style={styles(colors).relatedHeader}>
            <View style={[styles(colors).relatedDot, { backgroundColor: colors.accent }]} />
            <Text style={styles(colors).relatedTitle}>Benzer Haberler</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).relatedList}>
            {relatedArticles.map((item) => (
              <RelatedArticleCard
                key={`related-${item.id}`}
                article={item}
                colors={colors}
                onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
              />
            ))}
          </ScrollView>
        </View>
      )}

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
      padding: Spacing.lg,
      gap: Spacing.md,
      paddingBottom: Spacing.xxl,
    },
    centerWrap: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      padding: Spacing.lg,
    },
    statusText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      textAlign: 'center',
    },
    errorTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
    heroImage: {
      width: '100%',
      borderRadius: Radius.lg,
    },
    heroPlaceholder: {
      width: '100%',
      height: 220,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroPlaceholderText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
      letterSpacing: 1,
      fontWeight: Typography.fontWeight.bold,
    },
    category: {
      color: colors.accent,
      fontSize: Typography.fontSize.xs,
      letterSpacing: 1,
      fontWeight: Typography.fontWeight.bold,
    },
    title: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: 34,
      lineHeight: 40,
    },
    metaWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    metaDot: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
    publisherCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    publisherLogo: {
      width: 42,
      height: 42,
      borderRadius: Radius.full,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    publisherLogoImage: {
      width: '100%',
      height: '100%',
    },
    publisherLogoText: {
      color: colors.white,
      fontWeight: Typography.fontWeight.bold,
      fontSize: Typography.fontSize.xs,
    },
    publisherLabel: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    publisherName: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.bold,
    },
    publisherCta: {
      color: colors.accent,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    bodyCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    bodyText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 24,
    },
    inlineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    webFlowRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    inlineTextOnly: {
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    webTextCol: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.sm,
    },
    sideTextSlot: {
      flex: 1,
      minWidth: 0,
      height: 320,
      borderRadius: Radius.md,
      overflow: 'hidden',
    },
    sideTextContent: {
      gap: Spacing.sm,
      paddingRight: Spacing.xs,
    },
    imageSlot: {
      width: '42%',
      height: 320,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      position: 'relative',
    },
    imageSlotLeft: {
      alignSelf: 'flex-start',
      cursor: 'default' as any,
    },
    imageSlotRight: {
      alignSelf: 'flex-start',
      cursor: 'default' as any,
    },
    imageSlotViewport: {
      width: '100%',
      height: '100%',
    },
    imageSlotScroller: {
      width: '100%',
      height: '100%',
    },
    imageSlotContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 0,
      gap: 0,
    },
    slotImage: {
      height: '100%',
      borderRadius: Radius.sm,
    },
    dotsRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 6,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(255,255,255,0.55)',
    },
    dotActive: {
      width: 8,
      height: 8,
      backgroundColor: colors.accent,
    },
    carouselArrow: {
      position: 'absolute',
      top: '50%',
      marginTop: -18,
      width: 36,
      height: 36,
      borderRadius: Radius.full,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
    },
    carouselArrowLeft: {
      left: 8,
    },
    carouselArrowRight: {
      right: 8,
    },
    carouselArrowText: {
      color: '#fff',
      fontSize: 22,
      lineHeight: 24,
      fontWeight: Typography.fontWeight.bold,
    },
    edgeHoverZone: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 110,
      zIndex: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    edgeHoverZoneLeft: {
      left: 0,
    },
    edgeHoverZoneRight: {
      right: 0,
    },
    edgeArrowText: {
      fontSize: 44,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      userSelect: 'none' as any,
    },
    edgeArrowVisible: {
      opacity: 0.92,
    },
    edgeArrowHidden: {
      opacity: 0,
    },
    inlineTextCol: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.sm,
    },
    inlineImage: {
      width: '42%',
      borderRadius: Radius.md,
    },
    loadingWrap: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'center',
    },
    detailLayout: {
      flexDirection: 'column',
      gap: Spacing.md,
    },
    detailLayoutWeb: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bodyCol: {
      flex: 1,
      minWidth: 0,
    },
    mediaCol: {
      width: '100%',
      gap: Spacing.sm,
    },
    mediaColWeb: {
      width: 360,
      position: 'sticky' as any,
      top: 16,
    },
    galleryWrap: {
      gap: Spacing.sm,
    },
    galleryImage: {
      width: '74%',
      borderRadius: Radius.md,
      maxHeight: 320,
    },
    galleryImageLeft: {
      alignSelf: 'flex-start',
    },
    galleryImageRight: {
      alignSelf: 'flex-end',
    },
    relatedSection: {
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    relatedHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
    },
    relatedDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    relatedTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
      color: colors.textPrimary,
    },
    relatedList: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      paddingBottom: Spacing.sm,
    },
    actionBar: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
    },
    actionButtonText: {
      fontSize: 18,
    },
    actionButtonLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
  });

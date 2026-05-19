import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useApiNews } from '@/hooks/useNews';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import {
  ApiArticle,
  ArticleAiAnalysis,
  fetchArticleAiAnalysis,
  fetchArticleById,
  fetchArticleFullContent,
  fetchSimilarArticlesFromDb,
  mapToContentCategory,
  proxyImageUrl,
  recordArticleView,
} from '@/services/newsApi';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';
import {
  addArticleComment,
  ArticleComment,
  fetchArticleComments,
  fetchArticleInteractionSummary,
  toggleArticleLike,
} from '@/services/articleInteractions';

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

type UserProfile = {
  id: number;
  username: string;
  email: string;
};

type ConversationRecipient = {
  other_user_id: number;
  username: string;
  email: string;
  last_message_at?: string;
};

const ARTICLE_SHARE_PREFIX = 'SPN_ARTICLE_SHARE:';

const SIMILARITY_STOP_WORDS = new Set([
  'icin', 'için', 'olan', 'sonra', 'once', 'önce', 'gibi', 'daha', 'son',
  'haber', 'haberi', 'yeni', 'ile', 've', 'bir', 'bu', 'da', 'de', 'the',
  'and', 'for', 'with', 'from', 'that', 'this',
]);

function normalizeSourceNameForMatch(sourceName?: string): string {
  return String(sourceName ?? '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMatchWords(...values: string[]): string[] {
  const normalized = values
    .join(' ')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ığüşöçİĞÜŞÖÇ\s]/gi, ' ');

  return [...new Set(
    normalized
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !SIMILARITY_STOP_WORDS.has(word))
  )];
}

function getSimilarArticles(
  currentId: string,
  currentCategory: string,
  currentTitle: string,
  currentLanguage: string | undefined,
  allArticles: ArticleLike[],
  currentSourceName?: string,
  currentDescription = '',
  count = 10
): ArticleLike[] {
  const titleWords = getMatchWords(currentTitle, currentDescription);
  const currentSource = normalizeSourceNameForMatch(currentSourceName);

  return allArticles
    .filter((a) => a.id !== currentId && normalizeSourceNameForMatch(a.source?.name) !== currentSource)
    .map((a) => {
      let wordMatches = 0;
      const aWords = getMatchWords(a.title, a.description ?? '');
      titleWords.forEach((w) => { if (aWords.some((aw) => aw.startsWith(w) || w.startsWith(aw))) wordMatches += 1; });
      const categoryBoost = a.category === currentCategory ? 8 : 0;
      const languageBoost = currentLanguage && a.language === currentLanguage ? 4 : 0;
      const score = wordMatches * 10 + categoryBoost + languageBoost;
      return { article: a, score };
    })
    .filter((s) => s.score >= 24)
    .sort((a, b) => b.score - a.score || new Date(b.article.publishedAt).getTime() - new Date(a.article.publishedAt).getTime())
    .slice(0, count)
    .map((s) => s.article);
}

// ─── Yatay Öneri Kartı ───────────────────────────────────────────────────────
function RelatedArticleCard({ article, onPress, colors, isSidebar = false }: { article: ArticleLike; onPress: () => void; colors: any, isSidebar?: boolean }) {
  const cat = mapToContentCategory(article.category, article.title, article.description ?? '');
  const diff = Date.now() - new Date(article.publishedAt).getTime();
  const mins = Math.floor(diff / 60000);
  const timeLabel = mins < 60 ? `${mins}dk` : mins < 1440 ? `${Math.floor(mins / 60)}sa` : `${Math.floor(mins / 1440)}g`;
  const imgUrl = article.imageUrl ? proxyImageUrl(article.imageUrl) : undefined;

  return (
    <Pressable
      style={({ pressed }) => [
        relatedStyles.card,
        isSidebar && { width: '100%', maxWidth: 360, flexDirection: 'row', alignItems: 'center', height: 110 },
        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
        pressed && { opacity: 0.82 },
      ]}
      onPress={onPress}
    >
      {imgUrl ? (
        <Image source={{ uri: imgUrl }} style={[relatedStyles.thumb, isSidebar && { width: 110, height: 110 }]} resizeMode="cover" />
      ) : (
        <View style={[relatedStyles.thumbPlaceholder, isSidebar && { width: 110, height: 110 }, { backgroundColor: colors.surfaceInput }]}>
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

      <View style={[relatedStyles.cardBody, isSidebar && { flex: 1, padding: 12, gap: 6 }]}>
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
  card:             { width: 220, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden', position: 'relative' },
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
  const { articles, loading } = useApiNews();
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
  const [messagePanelVisible, setMessagePanelVisible] = useState(false);
  const [messageToken, setMessageToken] = useState<string>('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [recipientResults, setRecipientResults] = useState<UserProfile[]>([]);
  const [recentRecipients, setRecentRecipients] = useState<ConversationRecipient[]>([]);
  const [recipientSearching, setRecipientSearching] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sendingArticleTo, setSendingArticleTo] = useState<number | null>(null);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ArticleComment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ArticleAiAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const leftCarouselRef = useRef<ScrollView | null>(null);
  const rightCarouselRef = useRef<ScrollView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const commentSectionRef = useRef<View | null>(null);
  const commentInputRef = useRef<TextInput | null>(null);
  const [commentSectionY, setCommentSectionY] = useState(0);
  const relatedScrollRef = useRef<ScrollView | null>(null);
  const [relatedScrollX, setRelatedScrollX] = useState(0);
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

  useEffect(() => {
    const loadToken = async () => {
      try {
        const authModule = require('@/services/auth');
        const storedToken = await authModule.getToken?.();
        if (storedToken) {
          setMessageToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading message token:', error);
      }
    };

    loadToken();
  }, []);

  const loadInteractions = async () => {
    if (!params.id) return;

    try {
      setInteractionLoading(true);
      const [summary, loadedComments] = await Promise.all([
        fetchArticleInteractionSummary(params.id),
        fetchArticleComments(params.id),
      ]);
      setLikesCount(summary.likes_count);
      setCommentsCount(summary.comments_count);
      setLikedByMe(summary.liked_by_me);
      setComments(loadedComments);
    } catch (error) {
      console.error('Error loading article interactions:', error);
    } finally {
      setInteractionLoading(false);
    }
  };

  useEffect(() => {
    loadInteractions();
  }, [params.id]);

  // Read history tracking — kullanıcı bu makaleyi açtığında server'a haber ver.
  // Mount'ta initial view, unmount'ta final dwell_ms gönderir. UPSERT en uzun değeri tutar.
  useEffect(() => {
    if (!params.id || !messageToken) return;
    const t0 = Date.now();
    let firstReported = false;

    // Bounce-savar: en az 1.5 saniye sayfada kal, sonra "okudu" olarak işaretle.
    const initialTimer = setTimeout(() => {
      firstReported = true;
      void recordArticleView(params.id!, messageToken, { dwellMs: 0, sourceCtx: 'detail' });
    }, 1500);

    return () => {
      clearTimeout(initialTimer);
      if (firstReported) {
        const dwell = Date.now() - t0;
        void recordArticleView(params.id!, messageToken, { dwellMs: dwell, sourceCtx: 'detail' });
      }
    };
  }, [params.id, messageToken]);

  // Home feed önbelleği — kullanıcı feed'den geldiyse burada bulunur.
  const cacheHit = articles.find((item: { id: string }) => item.id === params.id);

  // "Aynı haber, farklı kaynaklar" widget'ından gelen tıklamalarda hedef makale
  // home feed'de olmayabilir ve URL'de title vs taşınmaz → API'den çek.
  const [remoteArticle, setRemoteArticle] = useState<ApiArticle | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    if (cacheHit || params.title) {
      // Önbellekte ya da URL'de yeterli veri var — remote fetch gereksiz.
      setRemoteArticle(null);
      setRemoteError(false);
      return;
    }
    let active = true;
    setRemoteLoading(true);
    setRemoteError(false);
    fetchArticleById(params.id)
      .then((a) => {
        if (active) setRemoteArticle(a);
      })
      .catch(() => {
        if (active) setRemoteError(true);
      })
      .finally(() => {
        if (active) setRemoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.id, cacheHit, params.title]);

  const articleFromCache = cacheHit ?? remoteArticle;

  if (params.id && !params.title && !articleFromCache && (loading || remoteLoading)) {
    return (
      <View style={styles(colors).centerWrap}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles(colors).statusText}>Haber yükleniyor...</Text>
      </View>
    );
  }

  if (!params.id || (!params.title && !articleFromCache)) {
    return (
      <View style={styles(colors).centerWrap}>
        <Text style={styles(colors).errorTitle}>Haber açılamadı</Text>
        <Text style={styles(colors).statusText}>
          {remoteError ? 'Sunucudan bu haber çekilemedi.' : 'Haber verisi bulunamadı.'}
        </Text>
      </View>
    );
  }

  useEffect(() => {
    let active = true;
    setLoadingContent(true);
    fetchArticleFullContent(params.id ?? '')
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

  const resolvedTitle = articleFromCache?.title ?? params.title ?? 'Haber detayı';
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
  const [loadingMatches, setLoadingMatches] = useState(false);

  useEffect(() => {
    let active = true;
    if (!params.id) return;

    const fallbackSimilar = getSimilarArticles(
      params.id,
      category,
      resolvedTitle ?? '',
      currentLanguage,
      articles as ArticleLike[],
      sourceName,
      resolvedSummary
    );
    setRelatedArticles(fallbackSimilar);
    setExactMatches([]);
    setLoadingMatches(true);

    fetchSimilarArticlesFromDb(params.id, 0.82)
      .then((dbSimilar) => {
        if (!active) return;
        if (dbSimilar && dbSimilar.length > 0) {
          setExactMatches(dbSimilar);
        }
      })
      .catch((err) => {
        // ignore
      })
      .finally(() => {
        if (active) {
          setLoadingMatches(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id, category, resolvedTitle, resolvedSummary, currentLanguage, sourceName, articles]);

  useEffect(() => {
    let active = true;
    if (!params.id) return;

    setAiAnalysis(null);
    setAiAnalysisError(null);
    setAiAnalysisLoading(true);

    fetchArticleAiAnalysis(params.id)
      .then((analysis) => {
        if (active) setAiAnalysis(analysis);
      })
      .catch(() => {
        if (active) setAiAnalysisError('AI analiz şu anda üretilemedi.');
      })
      .finally(() => {
        if (active) setAiAnalysisLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);
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
  const alternateSourceArticles = useMemo(() => {
    const seen = new Set<string>();
    const matches = exactMatches.filter((article) => {
      if (!article?.id || seen.has(article.id) || article.id === params.id) return false;
      if (normalizeSourceNameForMatch(article.source?.name) === normalizeSourceNameForMatch(sourceName)) return false;
      seen.add(article.id);
      return true;
    });

    return matches.slice(0, 10);
  }, [exactMatches, params.id, sourceName]);
  const generalRelatedArticles = useMemo(() => {
    const alternateIds = new Set(alternateSourceArticles.map((article) => article.id));
    return relatedArticles.filter((article) => !alternateIds.has(article.id));
  }, [alternateSourceArticles, relatedArticles]);

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

  const openSourceWebsite = () => {
    if (sourceUrl) {
      if (Platform.OS === 'web') {
        window.open(sourceUrl, '_blank');
      } else {
        Linking.openURL(sourceUrl).catch(() => {
          // Hata durumunda sessiz geç
        });
      }
    }
  };

  const openMessagePanel = () => {
    setMessagePanelVisible(true);
    setSendFeedback(null);
  };

  const loadRecentRecipients = async () => {
    if (!messageToken) return;

    try {
      setLoadingRecipients(true);
      const response = await fetch('http://localhost:3000/api/messages/conversations', {
        headers: {
          Authorization: `Bearer ${messageToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentRecipients(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading recent recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (messagePanelVisible && messageToken) {
      loadRecentRecipients();
    }
  }, [messagePanelVisible, messageToken]);

  const searchRecipients = async (query: string) => {
    const trimmed = query.trim();
    setRecipientQuery(query);
    setSendFeedback(null);

    if (!messageToken || trimmed.length < 2) {
      setRecipientResults([]);
      return;
    }

    try {
      setRecipientSearching(true);
      const response = await fetch(
        `http://localhost:3000/api/contacts/search?q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            Authorization: `Bearer ${messageToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecipientResults(data.users || []);
      } else {
        setRecipientResults([]);
      }
    } catch (error) {
      console.error('Error searching recipients:', error);
      setRecipientResults([]);
    } finally {
      setRecipientSearching(false);
    }
  };

  const sendArticleToUser = async (recipient: UserProfile | ConversationRecipient) => {
    if (!messageToken) {
      setSendFeedback('Mesaj göndermek için giriş yapmalısınız.');
      return;
    }

    const recipientId = 'id' in recipient ? recipient.id : recipient.other_user_id;

    const articleMessage = `${ARTICLE_SHARE_PREFIX}${JSON.stringify({
      id: params.id,
      title: resolvedTitle,
      summary: resolvedSummary,
      imageUrl: mainImage || imageUrl,
      source: sourceName,
      publishedAt: articleFromCache?.publishedAt ?? params.publishedAt,
      category,
      sourceUrl,
    })}`;

    try {
      setSendingArticleTo(recipientId);
      setSendFeedback(null);
      const response = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${messageToken}`,
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          content: articleMessage,
        }),
      });

      if (response.ok) {
        setSendFeedback(`${recipient.username} kullanıcısına gönderildi.`);
        setRecipientQuery('');
        setRecipientResults([]);
        loadRecentRecipients();
      } else {
        const data = await response.json().catch(() => null);
        setSendFeedback(data?.error || 'Haber gönderilemedi.');
      }
    } catch (error) {
      console.error('Error sending article:', error);
      setSendFeedback('Haber gönderilemedi.');
    } finally {
      setSendingArticleTo(null);
    }
  };

  const isSaved = savedIds.includes(params.id || '');

  const handleToggleSave = () => {
    if (params.id) {
      toggleSaved(params.id);
    }
  };

  const handleToggleLike = async () => {
    if (!params.id || likeLoading) return;

    setLikeError(null);
    if (!messageToken) {
      setLikeError('Beğenmek için giriş yapmalısınız.');
      setTimeout(() => setLikeError(null), 3000);
      return;
    }

    const previousLiked = likedByMe;
    const previousCount = likesCount;
    setLikedByMe(!previousLiked);
    setLikesCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));
    setLikeLoading(true);

    try {
      const result = await toggleArticleLike(params.id);
      setLikedByMe(result.liked);
      setLikesCount(result.likes_count);
    } catch (error) {
      console.error('Error toggling like:', error);
      setLikedByMe(previousLiked);
      setLikesCount(previousCount);
      setLikeError('Beğeni kaydedilemedi.');
      setTimeout(() => setLikeError(null), 3000);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleScrollToComments = () => {
    scrollViewRef.current?.scrollTo({ y: commentSectionY - 16, animated: true });
    setTimeout(() => commentInputRef.current?.focus(), 400);
  };

  const handleSubmitComment = async () => {
    if (!params.id || !commentText.trim()) return;

    try {
      setCommentSubmitting(true);
      setCommentError(null);
      const created = await addArticleComment(params.id, commentText, replyingTo?.id);
      setComments((current) => [...current, created]);
      setCommentsCount((current) => current + 1);
      setCommentText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error submitting comment:', error);
      setCommentError('Yorum eklenemedi. Giris yaptiginizdan emin olun.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const topLevelComments = useMemo(
    () => comments.filter((comment) => !comment.parent_id),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const grouped = new Map<number, ArticleComment[]>();
    comments.forEach((comment) => {
      if (!comment.parent_id) return;
      const existing = grouped.get(comment.parent_id) || [];
      existing.push(comment);
      grouped.set(comment.parent_id, existing);
    });
    return grouped;
  }, [comments]);

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

  const scrollRelated = (direction: 'left' | 'right') => {
    if (!relatedScrollRef.current) return;
    const targetX = direction === 'left' ? Math.max(0, relatedScrollX - 696) : relatedScrollX + 696;
    relatedScrollRef.current.scrollTo({ x: targetX, animated: true });
  };

  const leftImageHeight = leftSlotHeight > 18 ? leftSlotHeight - 18 : leftSlotHeight;
  const rightImageHeight = rightSlotHeight > 18 ? rightSlotHeight - 18 : rightSlotHeight;

  const renderAiAnalysisCard = () => (
    <View style={styles(colors).aiAnalysisCard}>
      <View style={styles(colors).aiAnalysisHeader}>
        <View style={styles(colors).aiAnalysisTitleWrap}>
          <View style={styles(colors).aiAnalysisIcon}>
            <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles(colors).aiAnalysisTitle}>AI Yorum ve Analiz</Text>
            <Text style={styles(colors).aiAnalysisSubtitle}>Haber metninden çıkarılan kısa değerlendirme</Text>
          </View>
        </View>
        {aiAnalysis?.available ? (
          <Text style={styles(colors).aiConfidenceBadge}>
            {aiAnalysis.confidence === 'high' ? 'GÜÇLÜ' : aiAnalysis.confidence === 'medium' ? 'ORTA' : 'DÜŞÜK'}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={styles(colors).aiAnalysisScroll}
        contentContainerStyle={styles(colors).aiAnalysisScrollContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {aiAnalysisLoading ? (
          <View style={styles(colors).aiAnalysisState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles(colors).statusText}>AI analiz hazırlanıyor...</Text>
          </View>
        ) : aiAnalysisError ? (
          <Text style={styles(colors).aiUnavailableText}>{aiAnalysisError}</Text>
        ) : aiAnalysis && !aiAnalysis.available ? (
          <Text style={styles(colors).aiUnavailableText}>
            {aiAnalysis.message || 'Bu haber için analiz üretmeye yetecek bağlam bulunamadı.'}
          </Text>
        ) : aiAnalysis ? (
          <View style={styles(colors).aiAnalysisBody}>
            <Text style={styles(colors).aiSummaryText}>{aiAnalysis.summary}</Text>

            {aiAnalysis.keyPoints.length > 0 ? (
              <View style={styles(colors).aiSection}>
                <Text style={styles(colors).aiSectionTitle}>Öne çıkanlar</Text>
                {aiAnalysis.keyPoints.map((point, index) => (
                  <View key={`ai-point-${index}`} style={styles(colors).aiBulletRow}>
                    <View style={styles(colors).aiBullet} />
                    <Text style={styles(colors).aiBulletText}>{point}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {!!aiAnalysis.context && (
              <View style={styles(colors).aiCallout}>
                <Text style={styles(colors).aiCalloutLabel}>Bağlam</Text>
                <Text style={styles(colors).aiCalloutText}>{aiAnalysis.context}</Text>
              </View>
            )}

            {aiAnalysis.perspectives.length > 0 ? (
              <View style={styles(colors).aiSection}>
                <Text style={styles(colors).aiSectionTitle}>Olası bakış açıları</Text>
                {aiAnalysis.perspectives.map((item, index) => (
                  <Text key={`ai-perspective-${index}`} style={styles(colors).aiMutedLine}>
                    {index + 1}. {item}
                  </Text>
                ))}
              </View>
            ) : null}

            {aiAnalysis.questions.length > 0 ? (
              <View style={styles(colors).aiSection}>
                <Text style={styles(colors).aiSectionTitle}>Okurken sorulacak sorular</Text>
                {aiAnalysis.questions.map((item, index) => (
                  <Text key={`ai-question-${index}`} style={styles(colors).aiMutedLine}>• {item}</Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles(colors).transferToChatButton,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/ai',
            params: {
              articleId: params.id ?? '',
              articleTitle: resolvedTitle,
              articleSummary: resolvedSummary,
              articleContent: body.slice(0, 6000),
              articleSource: sourceName,
              articleCategory: category,
              articlePublishedAt: publishedLabel,
              articleAiSummary: aiAnalysis?.summary ?? '',
              articleAiContext: aiAnalysis?.context ?? '',
            },
          } as any)
        }
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
        <Text style={styles(colors).transferToChatText}>Haberi Chat'e Taşı</Text>
      </Pressable>
    </View>
  );

  return (
    <ScrollView ref={scrollViewRef} style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <View style={styles(colors).articleHero}>
        {mainImage ? (
          <Image source={{ uri: mainImage }} style={styles(colors).articleHeroImage} resizeMode="cover" />
        ) : null}
        <View style={styles(colors).articleHeroScrim} />
        <View style={styles(colors).articleHeroContent}>
          <View style={styles(colors).articleHeroTop}>
            <Text style={styles(colors).articleBadge}>{category.toUpperCase()}</Text>
            <Text style={styles(colors).articleMetaLight}>{sourceName} • {publishedLabel}</Text>
          </View>
          <Text style={styles(colors).articleTitle}>{resolvedTitle}</Text>
          {!!resolvedSummary && (
            <Text style={styles(colors).articleSummary} numberOfLines={3}>{resolvedSummary}</Text>
          )}
        </View>
      </View>

      <View style={styles(colors).detailToolbar}>
        <Pressable style={styles(colors).publisherCard} onPress={openPublisherProfile}>
          <View style={styles(colors).publisherLogo}>
            {publisherLogoUrl ? (
              <Image source={{ uri: publisherLogoUrl }} style={styles(colors).publisherLogoImage} resizeMode="cover" />
            ) : (
              <Text style={styles(colors).publisherLogoText}>{sourceName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles(colors).publisherLabel}>Kaynak</Text>
            <Text style={styles(colors).publisherName}>{sourceName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={isSaved ? colors.accent : colors.textPrimary} />
            <Text style={[styles(colors).actionButtonLabel, { color: isSaved ? colors.accent : colors.textPrimary }]}>
              {isSaved ? 'Kaydedildi' : 'Kaydet'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles(colors).actionButton,
              { backgroundColor: likedByMe ? colors.accent + '1A' : colors.surfaceInput },
              pressed && { opacity: 0.7 },
              likeLoading && { opacity: 0.6 },
            ]}
            onPress={handleToggleLike}
            disabled={likeLoading}
          >
            {likeLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name={likedByMe ? 'heart' : 'heart-outline'} size={16} color={likedByMe ? colors.accent : colors.textPrimary} />
            )}
            <Text style={[styles(colors).actionButtonLabel, { color: likedByMe ? colors.accent : colors.textPrimary }]}>
              Beğen {likesCount > 0 ? likesCount : ''}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles(colors).actionButton,
              { backgroundColor: colors.surfaceInput },
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleScrollToComments}
          >
            <Ionicons name="chatbubble-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles(colors).actionButtonLabel, { color: colors.textPrimary }]}>
              Yorum {commentsCount > 0 ? commentsCount : ''}
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
            <Ionicons name="share-social-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles(colors).actionButtonLabel, { color: colors.textPrimary }]}>Paylaş</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles(colors).actionButton,
              { backgroundColor: colors.surfaceInput },
              pressed && { opacity: 0.7 },
            ]}
            onPress={openSourceWebsite}
          >
            <Ionicons name="open-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles(colors).actionButtonLabel, { color: colors.textPrimary }]}>Kaynakta</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles(colors).actionButton,
              { backgroundColor: colors.surfaceInput },
              pressed && { opacity: 0.7 },
            ]}
            onPress={openMessagePanel}
          >
            <Ionicons name="paper-plane-outline" size={16} color={colors.textPrimary} />
            <Text style={[styles(colors).actionButtonLabel, { color: colors.textPrimary }]}>Mesajla Gönder</Text>
          </Pressable>
        </View>
        {!!likeError && (
          <Text style={[styles(colors).actionButtonLabel, { color: colors.error, marginTop: 6, paddingHorizontal: 4 }]}>
            {likeError}
          </Text>
        )}
      </View>

      <Modal
        visible={messagePanelVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMessagePanelVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <Pressable style={styles(colors).modalBackdrop} onPress={() => setMessagePanelVisible(false)} />
          <View style={styles(colors).messagePanel}>
            <View style={styles(colors).messagePanelHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles(colors).messagePanelTitle}>Haberi Gönder</Text>
                <Text style={styles(colors).messagePanelSubtitle} numberOfLines={1}>{resolvedTitle}</Text>
              </View>
              <Pressable style={styles(colors).panelIconButton} onPress={() => setMessagePanelVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles(colors).recipientSearchBox}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles(colors).recipientSearchInput}
                placeholder="Kullanıcı ara..."
                placeholderTextColor={colors.textMuted}
                value={recipientQuery}
                onChangeText={searchRecipients}
                autoCapitalize="none"
              />
            </View>

            {!messageToken ? (
              <Text style={styles(colors).panelStatusText}>Haber göndermek için giriş yapmalısınız.</Text>
            ) : recipientSearching || loadingRecipients ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 18 }} />
            ) : recipientQuery.trim().length < 2 ? (
              <ScrollView style={styles(colors).recipientList} keyboardShouldPersistTaps="handled">
                {recentRecipients.length > 0 ? (
                  <>
                    <Text style={styles(colors).recipientSectionTitle}>Son sohbetler</Text>
                    {recentRecipients.map((recipient) => {
                      const recipientId = recipient.other_user_id;
                      return (
                        <Pressable
                          key={recipientId}
                          style={({ pressed }) => [
                            styles(colors).recipientRow,
                            pressed && { opacity: 0.75 },
                          ]}
                          onPress={() => sendArticleToUser(recipient)}
                          disabled={sendingArticleTo === recipientId}
                        >
                          <View style={styles(colors).recipientAvatar}>
                            <Text style={styles(colors).recipientAvatarText}>
                              {recipient.username[0]?.toUpperCase() || '?'}
                            </Text>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles(colors).recipientName}>{recipient.username}</Text>
                            <Text style={styles(colors).recipientEmail} numberOfLines={1}>{recipient.email}</Text>
                          </View>
                          {sendingArticleTo === recipientId ? (
                            <ActivityIndicator size="small" color={colors.accent} />
                          ) : (
                            <Ionicons name="send" size={18} color={colors.accent} />
                          )}
                        </Pressable>
                      );
                    })}
                  </>
                ) : (
                  <Text style={styles(colors).panelStatusText}>
                    Henüz sohbet yok. Göndermek istediğiniz kişiyi arayın.
                  </Text>
                )}
              </ScrollView>
            ) : (
              <ScrollView style={styles(colors).recipientList} keyboardShouldPersistTaps="handled">
                {recipientResults.map((recipient) => (
                  <Pressable
                    key={recipient.id}
                    style={({ pressed }) => [
                      styles(colors).recipientRow,
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => sendArticleToUser(recipient)}
                    disabled={sendingArticleTo === recipient.id}
                  >
                    <View style={styles(colors).recipientAvatar}>
                      <Text style={styles(colors).recipientAvatarText}>
                        {recipient.username[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles(colors).recipientName}>{recipient.username}</Text>
                      <Text style={styles(colors).recipientEmail} numberOfLines={1}>{recipient.email}</Text>
                    </View>
                    {sendingArticleTo === recipient.id ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Ionicons name="send" size={18} color={colors.accent} />
                    )}
                  </Pressable>
                ))}
                {recipientQuery.trim().length >= 2 && recipientResults.length === 0 ? (
                  <Text style={styles(colors).panelStatusText}>Kullanıcı bulunamadı.</Text>
                ) : null}
              </ScrollView>
            )}

            {sendFeedback ? (
              <Text style={styles(colors).sendFeedback}>{sendFeedback}</Text>
            ) : null}
          </View>
        </View>
      </Modal>

      <View style={[styles(colors).detailLayout, isWeb ? styles(colors).detailLayoutWeb : null]}>
        <View style={styles(colors).bodyCol}>
          <View style={styles(colors).bodyCard}>
            {loadingContent ? (
              <View style={styles(colors).loadingWrap}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles(colors).statusText}>Kaynak içeriği yükleniyor...</Text>
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

          {/* Secondary images inline display removed intentionally as they cause irrelevant images from article footers */}
        </View>
        )}

        {isWeb && (
          <View style={[styles(colors).mediaCol, styles(colors).mediaColWeb]}>
            <View style={styles(colors).sameStoryPanel}>
              <View style={styles(colors).relatedHeader}>
                <View style={[styles(colors).relatedDot, { backgroundColor: colors.accent }]} />
                <Text style={styles(colors).relatedTitle}>AYNI HABER, FARKLI KAYNAKLAR</Text>
              </View>
              <Text style={styles(colors).sameStoryHint}>
                Farklı ifadeler ve bakış açılarıyla yayımlanan yakın haberler
              </Text>
              {loadingMatches && alternateSourceArticles.length === 0 ? (
                <View style={styles(colors).sameStoryLoading}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles(colors).statusText}>Alternatif kaynaklar aranıyor...</Text>
                </View>
              ) : alternateSourceArticles.length > 0 ? (
                <View style={styles(colors).sameStoryList}>
                  {alternateSourceArticles.map((item) => (
                    <RelatedArticleCard
                      key={`same-story-web-${item.id}`}
                      article={item}
                      colors={colors}
                      isSidebar={true}
                      onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles(colors).sameStoryEmpty}>
                  <Ionicons name="newspaper-outline" size={26} color={colors.textMuted} />
                  <Text style={styles(colors).sameStoryEmptyTitle}>Birebir eşleşme bulunamadı</Text>
                  <Text style={styles(colors).sameStoryEmptyText}>
                    Bu haber için farklı bir kaynakta aynı habere ait güvenilir bir eşleşme yok.
                  </Text>
                </View>
              )}
            </View>

            {renderAiAnalysisCard()}
          </View>
        )}
      </View>

      <View
        ref={commentSectionRef}
        style={styles(colors).commentsSection}
        onLayout={(e) => setCommentSectionY(e.nativeEvent.layout.y)}
      >
        <View style={styles(colors).commentsHeader}>
          <View>
            <Text style={styles(colors).commentsTitle}>Yorumlar</Text>
            <Text style={styles(colors).commentsSubtitle}>
              {commentsCount > 0 ? `${commentsCount} yorum` : 'İlk yorumu sen yaz'}
            </Text>
          </View>
          <View style={[styles(colors).likeSummary, { backgroundColor: colors.accent + '12' }]}>
            <Ionicons name="heart" size={15} color={colors.accent} />
            <Text style={[styles(colors).likeSummaryText, { color: colors.accent }]}>
              {likesCount}
            </Text>
          </View>
        </View>

        {replyingTo ? (
          <View style={[styles(colors).replyingBox, { borderColor: colors.borderSubtle }]}>
            <Text style={styles(colors).replyingText}>
              {replyingTo.username} kullanıcısına yanıt veriyorsun
            </Text>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={17} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles(colors).commentComposer}>
          <TextInput
            ref={commentInputRef}
            style={styles(colors).commentInput}
            placeholder={replyingTo ? 'Yanıt yaz...' : 'Yorum yaz...'}
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <Pressable
            style={[
              styles(colors).commentSubmitButton,
              {
                backgroundColor: colors.accent,
                opacity: commentSubmitting || !commentText.trim() ? 0.55 : 1,
              },
            ]}
            onPress={handleSubmitComment}
            disabled={commentSubmitting || !commentText.trim()}
          >
            {commentSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </Pressable>
        </View>

        {commentError ? (
          <Text style={styles(colors).commentError}>{commentError}</Text>
        ) : null}

        <View style={styles(colors).commentList}>
          {topLevelComments.map((comment) => (
            <View key={comment.id} style={[styles(colors).commentItem, { borderColor: colors.borderSubtle }]}>
              <View style={styles(colors).commentAvatar}>
                <Text style={styles(colors).commentAvatarText}>
                  {comment.username[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles(colors).commentBody}>
                <View style={styles(colors).commentMetaRow}>
                  <Text style={styles(colors).commentAuthor}>{comment.username}</Text>
                  <Text style={styles(colors).commentTime}>
                    {new Date(comment.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text style={styles(colors).commentContent}>{comment.content}</Text>
                <Pressable style={styles(colors).replyButton} onPress={() => setReplyingTo(comment)}>
                  <Ionicons name="return-down-forward-outline" size={14} color={colors.accent} />
                  <Text style={styles(colors).replyButtonText}>Yanıtla</Text>
                </Pressable>

                {(repliesByParent.get(comment.id) || []).map((reply) => (
                  <View key={reply.id} style={styles(colors).replyItem}>
                    <View style={styles(colors).replyAvatar}>
                      <Text style={styles(colors).replyAvatarText}>
                        {reply.username[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles(colors).replyBody}>
                      <View style={styles(colors).commentMetaRow}>
                        <Text style={styles(colors).commentAuthor}>{reply.username}</Text>
                        <Text style={styles(colors).commentTime}>
                          {new Date(reply.created_at).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                      <Text style={styles(colors).commentContent}>{reply.content}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {!interactionLoading && topLevelComments.length === 0 ? (
            <Text style={styles(colors).noCommentsText}>Henüz yorum yok.</Text>
          ) : null}
        </View>
      </View>

      {!isWeb && (
        <View style={styles(colors).relatedSection}>
          <View style={styles(colors).relatedHeader}>
            <View style={[styles(colors).relatedDot, { backgroundColor: colors.accent }]} />
            <Text style={styles(colors).relatedTitle}>Aynı Haber, Farklı Kaynaklar</Text>
          </View>
          {alternateSourceArticles.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).relatedList}>
              {alternateSourceArticles.map((item) => (
                <RelatedArticleCard
                  key={`same-story-mob-${item.id}`}
                  article={item}
                  colors={colors}
                  onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
                />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles(colors).sameStoryMobileEmpty}>
              Bu haber için farklı bir kaynakta birebir eşleşme bulunamadı.
            </Text>
          )}
          {renderAiAnalysisCard()}
        </View>
      )}

      {generalRelatedArticles.length > 0 && (
        <View style={styles(colors).relatedSection}>
          <View style={[styles(colors).relatedHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View style={[styles(colors).relatedDot, { backgroundColor: colors.accent }]} />
              <Text style={styles(colors).relatedTitle}>Benzer Haberler</Text>
            </View>
            {isWeb && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Pressable
                  style={({ pressed }) => [
                    styles(colors).scrollNavBtn,
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => scrollRelated('left')}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles(colors).scrollNavBtn,
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => scrollRelated('right')}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
                </Pressable>
              </View>
            )}
          </View>
          <ScrollView
            ref={relatedScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles(colors).relatedList}
            onScroll={(event) => setRelatedScrollX(event.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
          >
            {generalRelatedArticles.map((item) => (
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
      width: '100%' as any,
      maxWidth: 1180,
      alignSelf: 'center',
      padding: 24,
      gap: 18,
      paddingBottom: 56,
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
    articleHero: {
      minHeight: 420,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      position: 'relative',
    },
    articleHeroImage: {
      ...StyleSheet.absoluteFillObject,
      width: '100%',
      height: '100%',
    },
    articleHeroScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.52)',
    },
    articleHeroContent: {
      flex: 1,
      justifyContent: 'flex-end',
      gap: 14,
      padding: 30,
    },
    articleHeroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    articleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      color: '#fff',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.6,
      overflow: 'hidden',
    },
    articleMetaLight: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 12,
      fontWeight: '800',
    },
    articleTitle: {
      color: '#fff',
      fontSize: 42,
      lineHeight: 48,
      fontWeight: '900',
      letterSpacing: -0.8,
      maxWidth: 980,
    },
    articleSummary: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
      maxWidth: 820,
    },
    detailToolbar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
      flexWrap: 'wrap',
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
      borderRadius: 20,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 260,
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
      borderRadius: 28,
      padding: 26,
      gap: 18,
    },
    aiAnalysisCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 14,
      gap: 12,
    },
    transferToChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: colors.accent,
      marginTop: 6,
    },
    transferToChatText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.2,
    },
    aiAnalysisScroll: {
      maxHeight: 420,
      overflow: 'hidden',
    },
    aiAnalysisScrollContent: {
      gap: 14,
      paddingBottom: 4,
    },
    aiAnalysisHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    aiAnalysisTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
    },
    aiAnalysisIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiAnalysisTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    aiAnalysisSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    aiConfidenceBadge: {
      color: colors.accent,
      backgroundColor: colors.accent + '16',
      borderRadius: 999,
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    aiAnalysisState: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    aiUnavailableText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    aiAnalysisBody: {
      gap: 14,
    },
    aiSummaryText: {
      color: colors.textPrimary,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '700',
    },
    aiSection: {
      gap: 8,
    },
    aiSectionTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    aiBulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
    },
    aiBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
      marginTop: 8,
    },
    aiBulletText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    aiCallout: {
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      backgroundColor: colors.accent + '10',
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    aiCalloutLabel: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    aiCalloutText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    aiMutedLine: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },
    bodyText: {
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 27,
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
    sameStoryPanel: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 12,
    },
    sameStoryHint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      paddingHorizontal: Spacing.xs,
    },
    sameStoryList: {
      gap: 12,
      marginTop: 6,
    },
    sameStoryLoading: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xl,
    },
    sameStoryEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.xl,
      paddingHorizontal: Spacing.md,
    },
    sameStoryEmptyTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: '800',
      textAlign: 'center',
    },
    sameStoryEmptyText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center',
    },
    sameStoryMobileEmpty: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
      lineHeight: 19,
      paddingHorizontal: Spacing.xs,
      paddingBottom: Spacing.sm,
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
    scrollNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer' as any,
    },
    relatedList: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      paddingBottom: Spacing.sm,
    },
    actionBar: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 18,
      minWidth: 132,
    },
    actionButtonText: {
      fontSize: 18,
    },
    actionButtonLabel: {
      fontSize: 12,
      fontWeight: '600',
    },
    commentsSection: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 18,
      gap: 14,
      width: '100%',
    },
    commentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    commentsTitle: {
      color: colors.textPrimary,
      fontSize: 19,
      fontWeight: '800',
    },
    commentsSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },
    likeSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 999,
    },
    likeSummaryText: {
      fontSize: 12,
      fontWeight: '800',
    },
    replyingBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    replyingText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    commentComposer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    commentInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surfaceInput,
      color: colors.textPrimary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    commentSubmitButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentError: {
      color: colors.error,
      fontSize: 12,
      fontWeight: '600',
    },
    commentList: {
      gap: 10,
    },
    commentItem: {
      flexDirection: 'row',
      gap: 10,
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
    },
    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent + '24',
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentAvatarText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '800',
    },
    commentBody: {
      flex: 1,
      minWidth: 0,
      gap: 5,
    },
    commentMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    commentAuthor: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    commentTime: {
      color: colors.textMuted,
      fontSize: 11,
    },
    commentContent: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    replyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      paddingTop: 2,
    },
    replyButtonText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    replyItem: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 9,
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    replyAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent + '1A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    replyAvatarText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '800',
    },
    replyBody: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    noCommentsText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 12,
    },
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    messagePanel: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '82%' as any,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 18,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 12,
    },
    messagePanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    messagePanelTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    messagePanelSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 3,
    },
    panelIconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceInput,
    },
    recipientSearchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceInput,
    },
    recipientSearchInput: {
      flex: 1,
      minHeight: 44,
      color: colors.textPrimary,
      fontSize: 14,
    },
    recipientList: {
      maxHeight: 300,
    },
    recipientSectionTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingVertical: 8,
      paddingHorizontal: 2,
    },
    recipientRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    recipientAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent + '25',
    },
    recipientAvatarText: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    recipientName: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    recipientEmail: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    panelStatusText: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 16,
    },
    sendFeedback: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
  });

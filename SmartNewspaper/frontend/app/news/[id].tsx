import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useApiNews } from '@/hooks/useNews';
import { useTheme } from '@/hooks/useTheme';
import { mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function NewsDetailPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { articles } = useApiNews();
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

  const resolvedTitle = articleFromCache?.title ?? params.title;
  const resolvedSummary = articleFromCache?.description ?? params.summary ?? '';
  const rawContent = articleFromCache?.content ?? params.content ?? resolvedSummary;
  const body = stripHtml(rawContent);
  const category = mapToContentCategory(
    articleFromCache?.category ?? params.category,
    resolvedTitle,
    resolvedSummary
  );
  const sourceName = articleFromCache?.source?.name ?? params.source ?? 'Kaynak bilinmiyor';
  const publishedLabel = articleFromCache?.publishedAt
    ? new Date(articleFromCache.publishedAt).toLocaleDateString('tr-TR')
    : params.publishedAt ?? 'Tarih yok';
  const imageUrl = articleFromCache?.imageUrl ? proxyImageUrl(articleFromCache.imageUrl) : params.imageUrl;

  const openPublisherProfile = () => {
    const publisherId = getPublisherIdFromSourceName(sourceName);
    router.push(`/publisherprofile?id=${encodeURIComponent(publisherId)}` as any);
  };

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles(colors).heroImage} resizeMode="cover" />
      ) : (
        <View style={styles(colors).heroPlaceholder}>
          <Text style={styles(colors).heroPlaceholderText}>{category.toUpperCase()}</Text>
        </View>
      )}

      <Text style={styles(colors).category}>{category.toUpperCase()}</Text>
      <Text style={styles(colors).title}>{resolvedTitle}</Text>

      <View style={styles(colors).metaWrap}>
        <Text style={styles(colors).metaText}>{sourceName}</Text>
        <Text style={styles(colors).metaDot}>•</Text>
        <Text style={styles(colors).metaText}>{publishedLabel}</Text>
      </View>

      <Pressable style={styles(colors).publisherCard} onPress={openPublisherProfile}>
        <View style={styles(colors).publisherLogo}>
          <Text style={styles(colors).publisherLogoText}>{sourceName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles(colors).publisherLabel}>Publisher</Text>
          <Text style={styles(colors).publisherName}>{sourceName}</Text>
        </View>
        <Text style={styles(colors).publisherCta}>Profili Gor</Text>
      </Pressable>

      <View style={styles(colors).bodyCard}>
        <Text style={styles(colors).bodyText}>{body}</Text>
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
      height: 220,
      borderRadius: Radius.lg,
    },
    heroPlaceholder: {
      width: '100%',
      height: 160,
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
    },
    bodyText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 24,
    },
  });

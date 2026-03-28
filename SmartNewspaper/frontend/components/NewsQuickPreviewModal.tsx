import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View, Image } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';

type PreviewItem = {
  title: string;
  summary: string;
  sourceName: string;
  sourceLogoUrl?: string;
  imageUrl?: string;
  publishedAt?: string;
  url?: string;
};

type Props = {
  visible: boolean;
  item: PreviewItem | null;
  colors: any;
  onClose: () => void;
  onPublisherPress?: (sourceName: string) => void;
};

function fallbackLogoFromName(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  return (parts[0] ?? name).slice(0, 2).toUpperCase();
}

export default function NewsQuickPreviewModal({ visible, item, colors, onClose, onPublisherPress }: Props) {
  if (!item) return null;

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

  const normalizedSource = item.sourceName.toLocaleLowerCase('tr-TR').trim();
  const domain = sourceDomains[normalizedSource];
  const autoLogoUrl = domain
    ? `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`
    : undefined;
  const logoUrl = item.sourceLogoUrl ?? autoLogoUrl;

  const openSource = async () => {
    if (!item.url) {
      Alert.alert('Baglanti yok', 'Bu haber icin kaynak linki bulunamadi.');
      return;
    }

    const canOpen = await Linking.canOpenURL(item.url);
    if (!canOpen) {
      Alert.alert('Baglanti acilamadi', 'Kaynak linki acilamiyor.');
      return;
    }

    await Linking.openURL(item.url);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles(colors).overlay}>
        <Pressable style={styles(colors).overlayTap} onPress={onClose} />

        <View style={styles(colors).sheet}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles(colors).image} resizeMode="cover" />
          ) : null}

          <Pressable
            style={styles(colors).sourceRow}
            onPress={() => onPublisherPress?.(item.sourceName)}
            disabled={!onPublisherPress}
          >
            <View style={styles(colors).sourceLogo}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles(colors).sourceLogoImage} resizeMode="cover" />
              ) : (
                <Text style={styles(colors).sourceLogoText}>{fallbackLogoFromName(item.sourceName)}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles(colors).sourceLabel}>Publisher</Text>
              <Text style={styles(colors).sourceName}>{item.sourceName}</Text>
              {item.publishedAt ? <Text style={styles(colors).sourceDate}>{item.publishedAt}</Text> : null}
            </View>
            {onPublisherPress ? <Text style={styles(colors).sourceCta}>Profile Git</Text> : null}
          </Pressable>

          <Text style={styles(colors).title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles(colors).summary} numberOfLines={3}>{item.summary}</Text>

          <View style={styles(colors).actionsRow}>
            <Pressable style={styles(colors).ghostButton} onPress={onClose}>
              <Text style={styles(colors).ghostButtonText}>Kapat</Text>
            </Pressable>
            <Pressable style={styles(colors).primaryButton} onPress={openSource}>
              <Text style={styles(colors).primaryButtonText}>Haberin Devami</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
    overlayTap: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      width: '100%',
      maxWidth: 980,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
      zIndex: 2,
    },
    image: {
      width: '100%',
      height: 120,
      borderRadius: Radius.md,
    },
    sourceRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      alignItems: 'center',
    },
    sourceLogo: {
      width: 38,
      height: 38,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    sourceLogoImage: {
      width: '100%',
      height: '100%',
    },
    sourceLogoText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    sourceLabel: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sourceName: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    sourceDate: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
    },
    sourceCta: {
      color: colors.accent,
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.bold,
    },
    title: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: Typography.fontSize.lg,
      lineHeight: 30,
    },
    summary: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 22,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xs,
    },
    ghostButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
    },
    ghostButtonText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    primaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
  });

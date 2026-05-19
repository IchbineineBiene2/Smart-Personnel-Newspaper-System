import { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Shared shell for auth screens (login + register).
 * - Wide viewports (≥920px): split layout — hero on left, form card on right.
 * - Narrow: hero collapses to a compact header above the card.
 *
 * Provides brand identity, value proposition, and a consistent surface for
 * any auth form passed as `children`.
 */
interface Bullet {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const BULLETS: Bullet[] = [
  {
    icon: 'newspaper-outline',
    title: 'Tek akışta tüm kaynaklar',
    body: 'Yerel + dünya basını birarada, çoklu dilli haber çekme.',
  },
  {
    icon: 'git-network-outline',
    title: 'Aynı olay, farklı bakış',
    body: 'AI eşleştirmesi ile bir haberi farklı kaynaklardan gezin.',
  },
  {
    icon: 'sparkles-outline',
    title: 'Sana göre öneriler',
    body: 'Okudukların ve beğendiklerin akışını şekillendirir.',
  },
];

export function AuthShell({ title, subtitle, children }: Props) {
  const { colors, themeName } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;

  const pageBackground = colors.background;
  const cardBackground = themeName === 'vincent' ? colors.surface : colors.surfaceHigh;

  return (
    <ScrollView
      style={{ backgroundColor: pageBackground, flex: 1 }}
      contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.container, isWide && styles.containerWide]}>
        {/* Hero / brand panel */}
        <View style={[styles.hero, isWide ? styles.heroWide : styles.heroCompact]}>
          <View style={styles.brandRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
              <Ionicons name="newspaper" size={22} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.brandWord, { color: colors.textPrimary }]}>
                GAZETE
                <Text style={{ color: colors.accent }}>.AI</Text>
              </Text>
              <Text style={[styles.brandTag, { color: colors.textMuted }]}>Akıllı haber akışı</Text>
            </View>
          </View>

          {isWide && (
            <>
              <Text style={[styles.heroHeadline, { color: colors.textPrimary }]}>
                Tek akışta hızla bilgilen,{'\n'}aynı olayın her bakışını gör.
              </Text>
              <View style={styles.bulletList}>
                {BULLETS.map((b) => (
                  <View key={b.title} style={styles.bullet}>
                    <View style={[styles.bulletIcon, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                      <Ionicons name={b.icon} size={18} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>{b.title}</Text>
                      <Text style={[styles.bulletBody, { color: colors.textSecondary }]}>{b.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Auth card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBackground,
              borderColor: colors.borderSubtle,
              shadowColor: colors.black,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          <View style={styles.formSlot}>{children}</View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  scrollWide: {
    paddingHorizontal: Spacing.xxl,
  },
  container: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    gap: Spacing.xl,
  },
  containerWide: {
    flexDirection: 'row',
    gap: Spacing.xxl,
    alignItems: 'center',
  },
  hero: {
    gap: Spacing.lg,
  },
  heroCompact: {
    alignItems: 'flex-start',
  },
  heroWide: {
    flex: 1,
    paddingRight: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: Typography.fontSize.sm,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroHeadline: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  bulletList: {
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  bullet: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  bulletIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bulletTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  bulletBody: {
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    ...Platform.select({
      web: { boxShadow: '0 16px 48px rgba(0,0,0,0.08)' } as any,
      default: { shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
    }),
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  formSlot: {
    gap: Spacing.md,
  },
});

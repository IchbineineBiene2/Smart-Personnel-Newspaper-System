import { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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

const STATS = [
  { value: '50K+', label: 'Kullanıcı' },
  { value: '12',   label: 'Dil' },
  { value: '200+', label: 'Kaynak' },
];

export function AuthShell({ title, subtitle, children }: Props) {
  const { colors, themeName } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const isWeb  = Platform.OS === 'web';

  const cardBg = themeName === 'vincent' ? colors.surface : colors.surfaceHigh;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Decorative background orbs — web only */}
      {isWeb && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View
            style={[
              styles.orb,
              styles.orbTop,
              { backgroundColor: colors.accent },
              { filter: 'blur(120px)' } as any,
            ]}
          />
          <View
            style={[
              styles.orb,
              styles.orbBottom,
              { backgroundColor: colors.accent },
              { filter: 'blur(160px)' } as any,
            ]}
          />
        </View>
      )}

      <View style={[styles.container, isWide && styles.containerWide]}>

        {/* ── Hero panel ── */}
        <View style={[styles.hero, isWide ? styles.heroWide : styles.heroCompact]}>

          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
              <Ionicons name="newspaper" size={24} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.brandWord, { color: colors.textPrimary }]}>
                GAZETE<Text style={{ color: colors.accent }}>.AI</Text>
              </Text>
              <Text style={[styles.brandTag, { color: colors.textMuted }]}>Akıllı haber akışı</Text>
            </View>
          </View>

          {isWide && (
            <>
              {/* Headline */}
              <Text style={[styles.heroHeadline, { color: colors.textPrimary }]}>
                Tek akışta hızla{'\n'}
                <Text style={{ color: colors.accent, fontStyle: 'italic' }}>bilgilen,</Text>
                {' '}aynı olayın{'\n'}her bakışını gör.
              </Text>

              {/* Stats row */}
              <View style={[styles.statsRow, { backgroundColor: colors.surface + 'CC', borderColor: colors.borderSubtle }]}>
                {STATS.map((s, i) => (
                  <View
                    key={s.label}
                    style={[
                      styles.statItem,
                      i < STATS.length - 1 && [styles.statBorder, { borderColor: colors.borderSubtle }],
                    ]}
                  >
                    <Text style={[styles.statValue, { color: colors.accent }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Bullet cards */}
              <View style={styles.bulletList}>
                {BULLETS.map((b) => (
                  <View
                    key={b.title}
                    style={[
                      styles.bullet,
                      { backgroundColor: colors.surface + 'B0', borderColor: colors.borderSubtle },
                    ]}
                  >
                    <View style={[styles.bulletIcon, { backgroundColor: colors.accent + '20' }]}>
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

        {/* ── Auth card ── */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              borderColor: colors.borderSubtle,
              shadowColor: colors.black,
            },
          ]}
        >
          {/* Top accent stripe */}
          <View style={[styles.accentStripe, { backgroundColor: colors.accent }]} />

          <View style={styles.cardBody}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={[styles.cardBadge, { backgroundColor: colors.accent + '18' }]}>
                <Ionicons name="shield-checkmark-outline" size={13} color={colors.accent} />
                <Text style={[styles.cardBadgeText, { color: colors.accent }]}>Güvenli giriş</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
            </View>

            {/* Form */}
            <View style={styles.formSlot}>{children}</View>
          </View>
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
    paddingHorizontal: 48,
    paddingVertical: 40,
  },

  // Background orbs
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.12,
  },
  orbTop: {
    width: 480,
    height: 480,
    top: -160,
    left: -80,
  },
  orbBottom: {
    width: 400,
    height: 400,
    bottom: -140,
    right: -60,
    opacity: 0.08,
  },

  // Layout
  container: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    gap: Spacing.xl,
  },
  containerWide: {
    flexDirection: 'row',
    gap: 56,
    alignItems: 'center',
  },

  // Hero
  hero: {
    gap: Spacing.xl,
  },
  heroCompact: {
    alignItems: 'flex-start',
  },
  heroWide: {
    flex: 1,
    paddingRight: Spacing.lg,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  // Headline
  heroHeadline: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 48,
    letterSpacing: -1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 2,
  },
  statBorder: {
    borderRightWidth: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Bullets
  bulletList: {
    gap: 10,
  },
  bullet: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  bulletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bulletTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  bulletBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 24px 64px rgba(0,0,0,0.14)' } as any,
      default: {
        shadowOpacity: 0.15,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 16 },
        elevation: 8,
      },
    }),
  },
  accentStripe: {
    height: 4,
    width: '100%',
  },
  cardBody: {
    padding: 32,
    gap: Spacing.xl,
  },
  cardHeader: {
    gap: 8,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 4,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  formSlot: {
    gap: Spacing.md,
  },
});

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthButton } from '@/components/auth/AuthButton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { completeOnboarding } from '@/services/auth';
import { CATEGORIES, NEWSPAPERS, NewspaperSource } from '@/services/content';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'İngilizce', flag: '🇬🇧' },
  { code: 'de', label: 'Almanca', flag: '🇩🇪' },
  { code: 'fr', label: 'Fransızca', flag: '🇫🇷' },
  { code: 'es', label: 'İspanyolca', flag: '🇪🇸' },
  { code: 'ar', label: 'Arapça', flag: '🇸🇦' },
];

type Step = 0 | 1 | 2;

const STEPS = [
  { title: 'İlgi alanların', subtitle: 'Hangi konuların akışında öne çıksın istersin?' },
  { title: 'Dil tercihleri', subtitle: 'Hangi dillerdeki haberleri görmek istersin?' },
  { title: 'Favori kaynaklar', subtitle: 'Seçtiklerini feed üstünde öne çıkaralım — sonra değiştirebilirsin.' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;

  const {
    preferredCategories,
    preferredNewsLanguages,
    preferredNewspapers,
    toggleCategory,
    toggleNewsLanguage,
    toggleNewspaper,
  } = usePreferences();

  const [step, setStep] = useState<Step>(0);
  const [completing, setCompleting] = useState(false);

  const canAdvance = useMemo(() => {
    if (step === 0) return preferredCategories.length > 0;
    if (step === 1) return preferredNewsLanguages.length > 0;
    return true; // step 2 atlanabilir
  }, [step, preferredCategories.length, preferredNewsLanguages.length]);

  const handleNext = async () => {
    if (step < 2) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    setCompleting(true);
    try {
      await completeOnboarding();
      router.replace('/(tabs)');
    } finally {
      setCompleting(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background, flex: 1 }}
      contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.layout, isWide && styles.layoutWide]}>
        {/* Hero */}
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={styles.brandRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.accent }]}>
              <Ionicons name="newspaper" size={22} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.brandWord, { color: colors.textPrimary }]}>
                GAZETE<Text style={{ color: colors.accent }}>.AI</Text>
              </Text>
              <Text style={[styles.brandTag, { color: colors.textMuted }]}>Sana özel haber akışı kuruluyor</Text>
            </View>
          </View>
          {isWide && (
            <Text style={[styles.heroBlurb, { color: colors.textSecondary }]}>
              Birkaç soruyla akışını şekillendirelim.{'\n'}
              Tercihlerin her zaman ayarlardan değiştirilebilir.
            </Text>
          )}
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceHigh,
              borderColor: colors.borderSubtle,
              shadowColor: colors.black,
            },
          ]}
        >
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  { backgroundColor: i <= step ? colors.accent : colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.stepCounter, { color: colors.textMuted }]}>{step + 1} / 3</Text>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{STEPS[step].title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{STEPS[step].subtitle}</Text>

          {step === 0 && (
            <View style={styles.chipGrid}>
              {CATEGORIES.map((cat) => {
                const selected = preferredCategories.includes(cat);
                return <Chip key={cat} label={cat} selected={selected} onPress={() => toggleCategory(cat)} />;
              })}
            </View>
          )}
          {step === 1 && (
            <View style={styles.chipGrid}>
              {LANGUAGES.map((lang) => {
                const selected = preferredNewsLanguages.includes(lang.code);
                return (
                  <Chip
                    key={lang.code}
                    label={`${lang.flag}  ${lang.label}`}
                    selected={selected}
                    onPress={() => toggleNewsLanguage(lang.code)}
                  />
                );
              })}
            </View>
          )}
          {step === 2 && (
            <>
              <View style={styles.chipGrid}>
                {NEWSPAPERS.map((paper: NewspaperSource) => {
                  const selected = preferredNewspapers.includes(paper);
                  return (
                    <Chip
                      key={paper}
                      label={paper}
                      selected={selected}
                      onPress={() => toggleNewspaper(paper)}
                    />
                  );
                })}
              </View>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Bu adım zorunlu değil — hiç seçmezsen tüm kaynaklardan haber gelir.
              </Text>
            </>
          )}

          <View style={styles.footerRow}>
            {step > 0 ? (
              <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={6}>
                <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                <Text style={[styles.backText, { color: colors.textSecondary }]}>Geri</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <View style={{ minWidth: 180 }}>
              <AuthButton
                label={step < 2 ? 'Devam Et' : 'Tamamla'}
                onPress={handleNext}
                disabled={!canAdvance}
                loading={completing}
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}
    >
      {selected && <Ionicons name="checkmark" size={14} color={colors.white} />}
      <Text
        style={[
          chipStyles.text,
          { color: selected ? colors.white : colors.textPrimary, fontWeight: selected ? '600' : '500' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  text: {
    fontSize: Typography.fontSize.base,
  },
});

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  scrollWide: {
    paddingHorizontal: Spacing.xxl,
  },
  layout: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    gap: Spacing.xl,
  },
  layoutWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxl,
  },
  hero: {
    gap: Spacing.lg,
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
  heroBlurb: {
    fontSize: Typography.fontSize.lg,
    lineHeight: 26,
    marginTop: Spacing.md,
  },
  card: {
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Platform.select({
      web: { boxShadow: '0 16px 48px rgba(0,0,0,0.08)' } as any,
      default: { shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
    }),
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  progressDot: {
    height: 6,
    borderRadius: 3,
    flex: 1,
  },
  stepCounter: {
    fontSize: Typography.fontSize.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  hint: {
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
});

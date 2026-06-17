import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthButton } from '@/components/auth/AuthButton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePreferences } from '@/hooks/usePreferences';
import { completeOnboarding } from '@/services/auth';
import { CATEGORIES, NEWSPAPERS, NewspaperSource } from '@/services/content';

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; tone: string; description: string }> = {
  Teknoloji: { icon: 'hardware-chip-outline', tone: '#38bdf8', description: 'AI, cihazlar ve dijital dünya' },
  Spor: { icon: 'football-outline', tone: '#22c55e', description: 'Maçlar, transferler ve ligler' },
  Ekonomi: { icon: 'trending-up-outline', tone: '#f59e0b', description: 'Piyasalar, para ve şirketler' },
  Saglik: { icon: 'medkit-outline', tone: '#ef4444', description: 'Sağlık, bilim ve yaşam' },
  Kultur: { icon: 'color-palette-outline', tone: '#a855f7', description: 'Sanat, kültür ve etkinlikler' },
  Siyaset: { icon: 'business-outline', tone: '#6366f1', description: 'Gündem ve kamu kararları' },
  Kaza: { icon: 'warning-outline', tone: '#fb7185', description: 'Son dakika ve yerel olaylar' },
  Deprem: { icon: 'pulse-outline', tone: '#14b8a6', description: 'Afet, uyarı ve güvenlik' },
  Magazin: { icon: 'sparkles-outline', tone: '#ec4899', description: 'Ünlüler ve popüler kültür' },
};

const LANGUAGE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; tone: string; description: string }> = {
  tr: { icon: 'location-outline', tone: '#ef4444', description: 'Yerel gündem ve Türkçe kaynaklar' },
  en: { icon: 'globe-outline', tone: '#38bdf8', description: 'Global haberler ve dünya basını' },
  de: { icon: 'business-outline', tone: '#f59e0b', description: 'Almanca kaynaklar ve Avrupa gündemi' },
  fr: { icon: 'cafe-outline', tone: '#8b5cf6', description: 'Fransızca haber ve kültür akışı' },
  es: { icon: 'sunny-outline', tone: '#fb7185', description: 'İspanyolca gündem ve yaşam' },
  ar: { icon: 'moon-outline', tone: '#14b8a6', description: 'Arapça bölgesel kaynaklar' },
};

const SOURCE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; tone: string; description: string }> = {
  Sabah: { icon: 'sunny-outline', tone: '#f97316', description: 'Gündem ve popüler haberler' },
  Cumhuriyet: { icon: 'library-outline', tone: '#ef4444', description: 'Siyaset ve yorum ağırlığı' },
  Hurriyet: { icon: 'newspaper-outline', tone: '#2563eb', description: 'Geniş haber havuzu' },
  Sozcu: { icon: 'megaphone-outline', tone: '#dc2626', description: 'Sert gündem ve manşetler' },
  Milliyet: { icon: 'albums-outline', tone: '#0ea5e9', description: 'Güncel haber ve yaşam' },
  Reuters: { icon: 'earth-outline', tone: '#f59e0b', description: 'Küresel ajans haberleri' },
  BBC: { icon: 'radio-outline', tone: '#a855f7', description: 'Uluslararası perspektif' },
};

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
  const [sourceSearch, setSourceSearch] = useState('');

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
      style={{ backgroundColor: '#070A12', flex: 1 }}
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
            <>
            <Text style={[styles.heroBlurb, { color: colors.textSecondary }]}>
              Birkaç soruyla akışını şekillendirelim.{'\n'}
              Tercihlerin her zaman ayarlardan değiştirilebilir.
            </Text>
            <View style={styles.previewStack}>
              <View style={[styles.previewCard, { backgroundColor: '#38bdf81A', borderColor: '#38bdf84A' }]}>
                <Ionicons name="flash-outline" size={20} color="#38bdf8" />
                <Text style={[styles.previewText, { color: colors.textPrimary }]}>Sana uygun konu ritmi</Text>
              </View>
              <View style={[styles.previewCard, styles.previewCardOffset, { backgroundColor: '#f59e0b1A', borderColor: '#f59e0b4A' }]}>
                <Ionicons name="radio-outline" size={20} color="#f59e0b" />
                <Text style={[styles.previewText, { color: colors.textPrimary }]}>Seçtiğin kaynaklar önde</Text>
              </View>
              <View style={[styles.previewCard, { backgroundColor: '#a855f71A', borderColor: '#a855f74A' }]}>
                <Ionicons name="globe-outline" size={20} color="#a855f7" />
                <Text style={[styles.previewText, { color: colors.textPrimary }]}>Diline göre temiz akış</Text>
              </View>
            </View>
            </>
          )}
        </View>

        {/* Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceHigh,
              borderColor: colors.borderSubtle,
              shadowColor: colors.accent,
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
            <>
              <View style={[styles.categoryHero, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '2E' }]}>
                <View style={[styles.categoryHeroIcon, { backgroundColor: colors.accent }]}>
                  <Ionicons name="sparkles-outline" size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.categoryHeroTitle, { color: colors.textPrimary }]}>
                    Akışını ilgi alanlarına göre kuralım
                  </Text>
                  <Text style={[styles.categoryHeroText, { color: colors.textSecondary }]}>
                    {preferredCategories.length
                      ? `${preferredCategories.length} kategori seçildi`
                      : 'En az bir kategori seçerek kişisel akışına başla.'}
                  </Text>
                </View>
              </View>

              <View style={[styles.categoryGrid, isWide && styles.categoryGridWide]}>
                {CATEGORIES.map((cat) => {
                  const selected = preferredCategories.includes(cat);
                  return (
                    <CategoryCard
                      key={cat}
                      label={cat}
                      selected={selected}
                      compact={!isWide}
                      onPress={() => toggleCategory(cat)}
                    />
                  );
                })}
              </View>
            </>
          )}
          {step === 1 && (
            <>
              <View style={[styles.categoryHero, { backgroundColor: '#38bdf812', borderColor: '#38bdf82E' }]}>
                <View style={[styles.categoryHeroIcon, { backgroundColor: '#38bdf8' }]}>
                  <Ionicons name="language-outline" size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.categoryHeroTitle, { color: colors.textPrimary }]}>
                    Haber evrenini hangi dillerle açalım?
                  </Text>
                  <Text style={[styles.categoryHeroText, { color: colors.textSecondary }]}>
                    {preferredNewsLanguages.length
                      ? `${preferredNewsLanguages.length} dil seçildi`
                      : 'En az bir dil seç; akışın o kaynaklarla şekillensin.'}
                  </Text>
                </View>
              </View>
              <View style={[styles.choiceGrid, isWide && styles.choiceGridWide]}>
                {LANGUAGES.map((lang) => {
                  const selected = preferredNewsLanguages.includes(lang.code);
                  const meta = LANGUAGE_META[lang.code];
                  return (
                    <ChoiceCard
                      key={lang.code}
                      title={lang.label}
                      eyebrow={lang.flag}
                      description={meta.description}
                      icon={meta.icon}
                      tone={meta.tone}
                      selected={selected}
                      compact={!isWide}
                      onPress={() => toggleNewsLanguage(lang.code)}
                    />
                  );
                })}
              </View>
            </>
          )}
          {step === 2 && (
            <>
              <View style={[styles.categoryHero, { backgroundColor: '#f59e0b12', borderColor: '#f59e0b2E' }]}>
                <View style={[styles.categoryHeroIcon, { backgroundColor: '#f59e0b' }]}>
                  <Ionicons name="star-outline" size={22} color={colors.white} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.categoryHeroTitle, { color: colors.textPrimary }]}>
                    Favori gazetelerini vitrine al
                  </Text>
                  <Text style={[styles.categoryHeroText, { color: colors.textSecondary }]}>
                    {preferredNewspapers.length
                      ? `${preferredNewspapers.length} kaynak öne çıkarılacak`
                      : 'İstersen kaynak seçmeden de devam edebilirsin.'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 16 }}>
                <Ionicons name="search-outline" size={20} color={colors.textMuted} />
                <TextInput
                  placeholder="Kaynak ara..."
                  placeholderTextColor={colors.textMuted}
                  value={sourceSearch}
                  onChangeText={setSourceSearch}
                  style={{ flex: 1, fontSize: 16, color: colors.textPrimary, height: '100%', outlineStyle: 'none' as any }}
                />
              </View>

              <View style={[styles.choiceGrid, isWide && styles.choiceGridWide]}>
                {NEWSPAPERS.filter((p: string) => p.toLowerCase().includes(sourceSearch.toLowerCase())).map((paper: NewspaperSource) => {
                  const selected = preferredNewspapers.includes(paper);
                  const meta = SOURCE_META[paper] ?? SOURCE_META.BBC;
                  return (
                    <ChoiceCard
                      key={paper}
                      title={paper}
                      eyebrow="KAYNAK"
                      description={meta.description}
                      icon={meta.icon}
                      tone={meta.tone}
                      selected={selected}
                      compact={!isWide}
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

function CategoryCard({
  label,
  selected,
  compact,
  onPress,
}: {
  label: string;
  selected: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const meta = CATEGORY_META[label] ?? {
    icon: 'newspaper-outline' as keyof typeof Ionicons.glyphMap,
    tone: colors.accent,
    description: 'Haber akışında öne çıkar',
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryCard,
        compact && styles.categoryCardCompact,
        {
          backgroundColor: selected ? meta.tone : colors.surface,
          borderColor: selected ? meta.tone : colors.borderSubtle,
          shadowColor: meta.tone,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
        selected && styles.categoryCardSelected,
        pressed && { opacity: 0.88 },
      ]}
    >
      <View
        style={[
          styles.categoryIconWrap,
          { backgroundColor: selected ? 'rgba(255,255,255,0.2)' : meta.tone + '1F' },
        ]}
      >
        <Ionicons name={meta.icon} size={compact ? 22 : 26} color={selected ? colors.white : meta.tone} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={[styles.categoryCardTitle, { color: selected ? colors.white : colors.textPrimary }]}>
          {label}
        </Text>
        <Text style={[styles.categoryCardText, { color: selected ? 'rgba(255,255,255,0.82)' : colors.textSecondary }]}>
          {meta.description}
        </Text>
      </View>
      <View
        style={[
          styles.categoryCheck,
          {
            backgroundColor: selected ? colors.white : colors.surfaceHigh,
            borderColor: selected ? colors.white : colors.borderSubtle,
          },
        ]}
      >
        {selected ? <Ionicons name="checkmark" size={15} color={meta.tone} /> : null}
      </View>
    </Pressable>
  );
}

function ChoiceCard({
  title,
  eyebrow,
  description,
  icon,
  tone,
  selected,
  compact,
  onPress,
}: {
  title: string;
  eyebrow: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  selected: boolean;
  compact: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        compact && styles.choiceCardCompact,
        {
          backgroundColor: selected ? tone : colors.surface,
          borderColor: selected ? tone : colors.borderSubtle,
          shadowColor: tone,
          transform: [{ translateY: pressed ? 2 : 0 }, { scale: selected ? 1.02 : 1 }],
        },
        selected && styles.choiceCardSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : tone + '1F' }]}>
        <Ionicons name={icon} size={compact ? 24 : 30} color={selected ? colors.white : tone} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.choiceEyebrow, { color: selected ? 'rgba(255,255,255,0.78)' : tone }]}>{eyebrow}</Text>
        <Text style={[styles.choiceTitle, { color: selected ? colors.white : colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.choiceText, { color: selected ? 'rgba(255,255,255,0.82)' : colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <View style={[styles.choiceCheck, { backgroundColor: selected ? colors.white : colors.surfaceHigh, borderColor: selected ? colors.white : colors.borderSubtle }]}>
        {selected ? <Ionicons name="checkmark" size={16} color={tone} /> : null}
      </View>
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
    paddingHorizontal: 44,
  },
  layout: {
    width: '100%',
    maxWidth: 1480,
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
    flex: 0.85,
    paddingRight: Spacing.lg,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  logoMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWord: {
    fontSize: 36,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0,
  },
  brandTag: {
    fontSize: Typography.fontSize.sm,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroBlurb: {
    fontSize: 22,
    lineHeight: 32,
    marginTop: Spacing.md,
  },
  previewStack: {
    gap: 12,
    marginTop: 26,
    maxWidth: 390,
  },
  previewCard: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewCardOffset: {
    marginLeft: 34,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  card: {
    maxWidth: 980,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 28,
    gap: 18,
    ...Platform.select({
      web: { boxShadow: '0 28px 80px rgba(0,0,0,0.36)' } as any,
      default: { shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
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
    fontSize: 38,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 25,
    marginBottom: Spacing.sm,
  },
  categoryHero: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  categoryHeroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeroTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  categoryHeroText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  categoryGrid: {
    gap: 18,
    marginBottom: Spacing.sm,
  },
  categoryGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryCard: {
    minHeight: 190,
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    gap: 14,
    flexBasis: '31%' as any,
    flexGrow: 1,
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0 20px 46px rgba(0,0,0,0.22)' } as any,
      default: { shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
    }),
  },
  categoryCardCompact: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCardSelected: {
    borderWidth: 0,
  },
  categoryIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardTitle: {
    fontSize: 23,
    fontWeight: '900',
  },
  categoryCardText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  categoryCheck: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceGrid: {
    gap: 18,
    marginBottom: Spacing.sm,
  },
  choiceGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  choiceCard: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 28,
    padding: 22,
    gap: 16,
    flexBasis: '31%' as any,
    flexGrow: 1,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 22px 52px rgba(0,0,0,0.24)' } as any,
      default: { shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
    }),
  },
  choiceCardCompact: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceCardSelected: {
    borderWidth: 0,
  },
  choiceIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
  },
  choiceTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  choiceText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 6,
  },
  choiceCheck: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

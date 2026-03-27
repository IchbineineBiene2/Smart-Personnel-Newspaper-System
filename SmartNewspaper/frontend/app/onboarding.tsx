import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePreferences } from '@/hooks/usePreferences';
import { useTheme } from '@/hooks/useTheme';
import { CATEGORIES } from '@/services/content';
import { Radius, Spacing, Typography } from '@/constants/theme';

const ONBOARDING_COMPLETE_KEY = 'onboarding-complete';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { preferredCategories, toggleCategory } = usePreferences();
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = async () => {
    if (preferredCategories.length === 0) {
      alert('Lütfen en az bir kategori seçin');
      return;
    }

    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setIsComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <ScrollView style={[styles(colors).container]} contentContainerStyle={styles(colors).content}>
      <View style={styles(colors).header}>
        <Text style={styles(colors).title}>Hoşgeldiniz!</Text>
        <Text style={styles(colors).subtitle}>
          İlgi duyduğunuz haber kategorilerini seçerek başlayın
        </Text>
      </View>

      <View style={styles(colors).categoriesSection}>
        <Text style={styles(colors).sectionTitle}>Kategorileri Seç</Text>
        <View style={styles(colors).chipGroup}>
          {CATEGORIES.map((category) => {
            const selected = preferredCategories.includes(category);
            return (
              <Pressable
                key={category}
                style={[styles(colors).chip, selected ? styles(colors).chipSelected : null]}
                onPress={() => toggleCategory(category)}
              >
                <Text style={[styles(colors).chipText, selected ? styles(colors).chipTextSelected : null]}>
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles(colors).summaryCard}>
        <Text style={styles(colors).summaryTitle}>Seçilen Kategoriler</Text>
        <Text style={styles(colors).summaryBody}>
          {preferredCategories.length
            ? preferredCategories.join(', ')
            : 'Henüz kategori seçilmedi.'}
        </Text>
      </View>

      <Pressable style={styles(colors).completeButton} onPress={handleComplete}>
        <Text style={styles(colors).completeButtonText}>Devam Et</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.md,
    lineHeight: 22,
  },
  categoriesSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  chipTextSelected: {
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  summaryBody: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
  },
  completeButton: {
    backgroundColor: colors.accent,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: colors.white,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
});

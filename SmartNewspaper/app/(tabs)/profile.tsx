import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { usePreferences } from '@/hooks/usePreferences';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage, LANGUAGE_LABELS, LANGUAGES } from '@/hooks/useLanguage';
import { NEWS, CATEGORIES, NEWSPAPERS } from '@/services/content';
import { UserProfile, getUserProfile } from '@/services/auth';
import { THEME_NAMES, THEME_LABELS } from '@/services/themes';
import { Radius, Spacing, Typography } from '@/constants/theme';

type TabType = 'preferences' | 'bookmarks' | 'settings';

export default function Profile() {
  const {
    loading: prefsLoading,
    preferredCategories,
    preferredNewspapers,
    toggleCategory,
    toggleNewspaper,
  } = usePreferences();
  const { loading: bookmarksLoading, savedIds } = useBookmarks();
  const { themeName, setTheme, colors } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('preferences');
  const savedNews = NEWS.filter((item) => savedIds.includes(item.id));

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getUserProfile();
      if (!profile) {
        setUserProfile({
          id: 'demo-user',
          name: 'Ahmet Kullanıcı',
          email: 'ahmet@example.com',
          createdAt: new Date().toISOString(),
        });
      } else {
        setUserProfile(profile);
      }
    };
    loadProfile();
  }, []);

  return (
    <ScrollView style={[styles(colors).container]} contentContainerStyle={styles(colors).content}>
      {/* User Info Card */}
      {userProfile && (
        <View style={styles(colors).heroCard}>
          <View style={styles(colors).avatarBadge}>
            <Text style={styles(colors).avatarText}>{userProfile.name.charAt(0)}</Text>
          </View>
          <View style={styles(colors).heroTextArea}>
            <Text style={styles(colors).pageTitle}>{userProfile.name}</Text>
            <Text style={styles(colors).email}>{userProfile.email}</Text>
            <Text style={styles(colors).meta}>Üye Olduğu Tarih: {new Date(userProfile.createdAt).toLocaleDateString('tr-TR')}</Text>
          </View>
        </View>
      )}

      <View style={styles(colors).statsRow}>
        <View style={styles(colors).statCard}>
          <Text style={styles(colors).statValue}>{preferredCategories.length}</Text>
          <Text style={styles(colors).statLabel}>Kategori</Text>
        </View>
        <View style={styles(colors).statCard}>
          <Text style={styles(colors).statValue}>{preferredNewspapers.length}</Text>
          <Text style={styles(colors).statLabel}>Gazete</Text>
        </View>
        <View style={styles(colors).statCard}>
          <Text style={styles(colors).statValue}>{savedNews.length}</Text>
          <Text style={styles(colors).statLabel}>Kaydedilen</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles(colors).tabsContainer}>
        <Pressable
          style={[styles(colors).tabPill, activeTab === 'preferences' ? styles(colors).tabPillActive : null]}
          onPress={() => setActiveTab('preferences')}
        >
          <Text style={[styles(colors).tabText, activeTab === 'preferences' ? styles(colors).tabTextActive : null]}>
            Tercihler
          </Text>
        </Pressable>
        <Pressable
          style={[styles(colors).tabPill, activeTab === 'bookmarks' ? styles(colors).tabPillActive : null]}
          onPress={() => setActiveTab('bookmarks')}
        >
          <Text style={[styles(colors).tabText, activeTab === 'bookmarks' ? styles(colors).tabTextActive : null]}>
            Kaydedilenler
          </Text>
        </Pressable>
        <Pressable
          style={[styles(colors).tabPill, activeTab === 'settings' ? styles(colors).tabPillActive : null]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles(colors).tabText, activeTab === 'settings' ? styles(colors).tabTextActive : null]}>
            Ayarlar
          </Text>
        </Pressable>
      </View>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <>
          <Text style={styles(colors).sectionTitle}>İlgi Duyduğun Kategoriler</Text>
          {prefsLoading ? <Text style={styles(colors).info}>Yükleniyor...</Text> : null}

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

          <View style={styles(colors).summaryCard}>
            <Text style={styles(colors).summaryTitle}>Seçilen Kategoriler</Text>
            <Text style={styles(colors).summaryBody}>
              {preferredCategories.length
                ? preferredCategories.join(', ')
                : 'Henüz kategori seçilmedi.'}
            </Text>
          </View>

          <Text style={styles(colors).sectionTitle}>Takip Etmek İstediğin Gazeteler</Text>
          <View style={styles(colors).chipGroup}>
            {NEWSPAPERS.map((newspaper) => {
              const selected = preferredNewspapers.includes(newspaper);
              return (
                <Pressable
                  key={newspaper}
                  style={[styles(colors).chip, selected ? styles(colors).chipSelected : null]}
                  onPress={() => toggleNewspaper(newspaper)}
                >
                  <Text style={[styles(colors).chipText, selected ? styles(colors).chipTextSelected : null]}>
                    {newspaper}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles(colors).summaryCard}>
            <Text style={styles(colors).summaryTitle}>Seçilen Gazeteler</Text>
            <Text style={styles(colors).summaryBody}>
              {preferredNewspapers.length
                ? preferredNewspapers.join(', ')
                : 'Henüz gazete seçilmedi.'}
            </Text>
          </View>
        </>
      )}

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <>
          <Text style={styles(colors).sectionTitle}>Kaydedilen Haberler</Text>
          {bookmarksLoading ? <Text style={styles(colors).info}>Yükleniyor...</Text> : null}

          {!bookmarksLoading && !savedNews.length ? (
            <Text style={styles(colors).info}>Henüz kaydedilmiş haber bulunmuyor.</Text>
          ) : null}

          {savedNews.map((news) => (
            <View key={news.id} style={styles(colors).bookmarkCard}>
              <Text style={styles(colors).cardTitle}>{news.title}</Text>
              <Text style={styles(colors).cardMeta}>{news.category}</Text>
              <Text style={styles(colors).cardBody}>{news.excerpt}</Text>
            </View>
          ))}
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <>
          <Text style={styles(colors).sectionTitle}>Görünüm Ayarları</Text>

          <Text style={styles(colors).settingLabel}>Tema Seç</Text>
          <View style={styles(colors).themeGrid}>
            {THEME_NAMES.map((theme) => (
              <Pressable
                key={theme}
                style={[
                  styles(colors).themeButton,
                  themeName === theme ? styles(colors).themeButtonActive : null,
                ]}
                onPress={() => setTheme(theme)}
              >
                <Text
                  style={[
                    styles(colors).themeButtonText,
                    themeName === theme ? styles(colors).themeButtonTextActive : null,
                  ]}
                >
                  {THEME_LABELS[theme]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles(colors).settingCard}>
            <Text style={styles(colors).settingCardTitle}>Seçili Tema</Text>
            <Text style={styles(colors).settingCardValue}>{THEME_LABELS[themeName]}</Text>
          </View>

          <Text style={styles(colors).settingLabel}>Dil Seç</Text>
          <View style={styles(colors).themeGrid}>
            {LANGUAGES.map((item) => (
              <Pressable
                key={item}
                style={[
                  styles(colors).themeButton,
                  language === item ? styles(colors).themeButtonActive : null,
                ]}
                onPress={() => setLanguage(item)}
              >
                <Text
                  style={[
                    styles(colors).themeButtonText,
                    language === item ? styles(colors).themeButtonTextActive : null,
                  ]}
                >
                  {LANGUAGE_LABELS[item]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles(colors).settingCard}>
            <Text style={styles(colors).settingCardTitle}>Seçili Dil</Text>
            <Text style={styles(colors).settingCardValue}>{LANGUAGE_LABELS[language]}</Text>
          </View>
        </>
      )}
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
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarBadge: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  heroTextArea: {
    flex: 1,
    gap: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
  },
  pageTitle: {
    fontSize: Typography.fontSize.xl,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  email: {
    fontSize: Typography.fontSize.md,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    color: colors.textMuted,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.full,
    padding: Spacing.xs,
  },
  tabPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.md,
  },
  info: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.base,
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
  },
  bookmarkCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
  },
  cardBody: {
    color: colors.textSecondary,
    lineHeight: 20,
    fontSize: Typography.fontSize.base,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  themeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  themeButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHigh,
  },
  themeButtonText: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  themeButtonTextActive: {
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  settingCardTitle: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  settingCardValue: {
    color: colors.accent,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
});
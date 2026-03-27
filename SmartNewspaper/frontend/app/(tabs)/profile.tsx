import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { usePreferences } from '@/hooks/usePreferences';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage, LANGUAGE_LABELS, LANGUAGES } from '@/hooks/useLanguage';
import { NEWS, CATEGORIES, NEWSPAPERS } from '@/services/content';
import { UserProfile, getUserProfile, logoutUser, resetUserPassword } from '@/services/auth';
import { THEME_NAMES, THEME_LABELS } from '@/services/themes';
import {
  MOCK_NEWS_SOURCES,
  MOCK_MANAGED_CATEGORIES,
  MOCK_USERS,
  MOCK_LOGS,
  MOCK_USAGE_STATS,
} from '@/services/admin';
import { Radius, Spacing, Typography } from '@/constants/theme';

// TODO [AUTH]: Admin tab sadece admin rolu olan kullanicilara gosterilecek
type TabType = 'preferences' | 'bookmarks' | 'settings' | 'admin';
type AdminSection = 'overview' | 'sources' | 'users' | 'logs';

export default function Profile() {
  const router = useRouter();
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
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [authChecking, setAuthChecking] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const savedNews = NEWS.filter((item) => savedIds.includes(item.id));

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadProfile = async () => {
        setAuthChecking(true);

        const profile = await getUserProfile();
        if (!active) {
          return;
        }

        if (!profile) {
          setUserProfile(null);
          setAuthChecking(false);
          router.replace('/auth/login');
          return;
        }

        setUserProfile(profile);
        setAuthChecking(false);
      };

      loadProfile();

      return () => {
        active = false;
      };
    }, [router])
  );

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/auth/login');
  };

  const handlePasswordReset = async () => {
    setPasswordMessage(null);
    setPasswordError(null);

    if (!userProfile) {
      setPasswordError('Kullanıcı bilgisi bulunamadı.');
      return;
    }

    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      setPasswordError('Lütfen iki şifre alanını da doldurun.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalı.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor.');
      return;
    }

    const success = await resetUserPassword(userProfile.email, newPassword);
    if (!success) {
      setPasswordError('Şifre güncellenemedi. Lütfen tekrar deneyin.');
      return;
    }

    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordMessage('Şifren başarıyla güncellendi.');
  };

  if (authChecking || !userProfile) {
    return (
      <View style={st(colors).loadingWrap}>
        <Text style={st(colors).info}>Giriş kontrolü yapılıyor...</Text>
      </View>
    );
  }

  const stats = MOCK_USAGE_STATS;

  const renderAdminContent = () => {
    if (adminSection === 'overview') {
      return (
        <>
          <Text style={st(colors).sectionTitle}>Sistem Özeti</Text>

          {/* FR25: Kullanim istatistikleri */}
          <View style={st(colors).statsGrid}>
            <View style={st(colors).adminStatCard}>
              <Text style={st(colors).adminStatValue}>{stats.totalUsers}</Text>
              <Text style={st(colors).adminStatLabel}>Toplam Kullanıcı</Text>
            </View>
            <View style={st(colors).adminStatCard}>
              <Text style={st(colors).adminStatValue}>{stats.activeToday}</Text>
              <Text style={st(colors).adminStatLabel}>Bugün Aktif</Text>
            </View>
            <View style={st(colors).adminStatCard}>
              <Text style={st(colors).adminStatValue}>{stats.totalNewsAccess}</Text>
              <Text style={st(colors).adminStatLabel}>Haber Erişimi</Text>
            </View>
            <View style={st(colors).adminStatCard}>
              <Text style={st(colors).adminStatValue}>{stats.totalBookmarks}</Text>
              <Text style={st(colors).adminStatLabel}>Kaydedilen</Text>
            </View>
          </View>

          <Text style={st(colors).sectionTitle}>Popüler Kategoriler</Text>
          {stats.topCategories.map((item) => (
            <View key={item.category} style={st(colors).barRow}>
              <Text style={st(colors).barLabel}>{item.category}</Text>
              <View style={st(colors).barTrack}>
                <View
                  style={[
                    st(colors).barFill,
                    { width: `${(item.count / stats.topCategories[0].count) * 100}%` },
                  ]}
                />
              </View>
              <Text style={st(colors).barValue}>{item.count}</Text>
            </View>
          ))}

          <Text style={st(colors).sectionTitle}>Günlük Aktivite</Text>
          {stats.dailyActivity.map((day) => (
            <View key={day.date} style={st(colors).activityRow}>
              <Text style={st(colors).activityDate}>{day.date}</Text>
              <View style={st(colors).activityValues}>
                <View style={st(colors).activityBadge}>
                  <Ionicons name="people-outline" size={12} color={colors.accent} />
                  <Text style={st(colors).activityText}>{day.users}</Text>
                </View>
                <View style={st(colors).activityBadge}>
                  <Ionicons name="newspaper-outline" size={12} color={colors.accent} />
                  <Text style={st(colors).activityText}>{day.newsAccess}</Text>
                </View>
              </View>
            </View>
          ))}
        </>
      );
    }

    if (adminSection === 'sources') {
      return (
        <>
          {/* FR24: Haber kaynaklari ve kategorileri yonetimi */}
          <Text style={st(colors).sectionTitle}>Haber Kaynakları</Text>
          {MOCK_NEWS_SOURCES.map((source) => (
            <View key={source.id} style={st(colors).adminCard}>
              <View style={st(colors).adminCardHeader}>
                <Text style={st(colors).adminCardTitle}>{source.name}</Text>
                <View style={[st(colors).statusDot, { backgroundColor: source.isActive ? colors.success : colors.error }]} />
              </View>
              <Text style={st(colors).adminCardMeta}>{source.url}</Text>
              <View style={st(colors).adminCardFooter}>
                <View style={st(colors).categoryBadge}>
                  <Text style={st(colors).categoryBadgeText}>{source.category}</Text>
                </View>
                <Text style={st(colors).adminCardMeta}>{source.isActive ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
          ))}

          <Text style={st(colors).sectionTitle}>Kategoriler</Text>
          {MOCK_MANAGED_CATEGORIES.map((cat) => (
            <View key={cat.id} style={st(colors).adminCard}>
              <View style={st(colors).adminCardHeader}>
                <Text style={st(colors).adminCardTitle}>{cat.name}</Text>
                <Text style={st(colors).adminCardMeta}>{cat.articleCount} makale</Text>
              </View>
            </View>
          ))}
        </>
      );
    }

    if (adminSection === 'users') {
      return (
        <>
          {/* FR24: Kullanici rolleri ve yetkileri yonetimi */}
          <Text style={st(colors).sectionTitle}>Kullanıcılar</Text>
          {MOCK_USERS.map((user) => (
            <View key={user.id} style={st(colors).adminCard}>
              <View style={st(colors).adminCardHeader}>
                <View style={st(colors).userRow}>
                  <View style={st(colors).userAvatar}>
                    <Text style={st(colors).userAvatarText}>{user.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st(colors).adminCardTitle}>{user.name}</Text>
                    <Text style={st(colors).adminCardMeta}>{user.email}</Text>
                  </View>
                </View>
              </View>
              <View style={st(colors).adminCardFooter}>
                <View style={st(colors).roleBadge}>
                  <Text style={st(colors).roleBadgeText}>
                    {user.role === 'admin' ? 'Yönetici' : user.role === 'editor' ? 'Editör' : 'Kullanıcı'}
                  </Text>
                </View>
                <Text style={[st(colors).adminCardMeta, { color: user.status === 'active' ? colors.success : colors.error }]}>
                  {user.status === 'active' ? 'Aktif' : 'Askıya Alındı'}
                </Text>
              </View>
            </View>
          ))}
        </>
      );
    }

    if (adminSection === 'logs') {
      return (
        <>
          {/* FR25: Sistem log kayitlari */}
          <Text style={st(colors).sectionTitle}>Sistem Logları</Text>
          {MOCK_LOGS.map((log) => (
            <View key={log.id} style={st(colors).logCard}>
              <View style={st(colors).logHeader}>
                <View
                  style={[
                    st(colors).logLevel,
                    {
                      backgroundColor:
                        log.level === 'error' ? colors.error
                        : log.level === 'warning' ? colors.warning
                        : colors.success,
                    },
                  ]}
                >
                  <Text style={st(colors).logLevelText}>
                    {log.level.toUpperCase()}
                  </Text>
                </View>
                <Text style={st(colors).logModule}>{log.module}</Text>
              </View>
              <Text style={st(colors).logMessage}>{log.message}</Text>
              <Text style={st(colors).logTime}>{log.timestamp}</Text>
            </View>
          ))}
        </>
      );
    }

    return null;
  };

  return (
    <ScrollView style={[st(colors).container]} contentContainerStyle={st(colors).content}>
      {/* User Info Card */}
      <View style={st(colors).heroCard}>
        <View style={st(colors).avatarBadge}>
          <Text style={st(colors).avatarText}>{userProfile.name.charAt(0)}</Text>
        </View>
        <View style={st(colors).heroTextArea}>
          <Text style={st(colors).pageTitle}>{userProfile.name}</Text>
          <Text style={st(colors).email}>{userProfile.email}</Text>
          <Text style={st(colors).meta}>Üye Olduğu Tarih: {new Date(userProfile.createdAt).toLocaleDateString('tr-TR')}</Text>
        </View>
      </View>

      <View style={st(colors).statsRow}>
        <View style={st(colors).statCard}>
          <Text style={st(colors).statValue}>{preferredCategories.length}</Text>
          <Text style={st(colors).statLabel}>Kategori</Text>
        </View>
        <View style={st(colors).statCard}>
          <Text style={st(colors).statValue}>{preferredNewspapers.length}</Text>
          <Text style={st(colors).statLabel}>Gazete</Text>
        </View>
        <View style={st(colors).statCard}>
          <Text style={st(colors).statValue}>{savedNews.length}</Text>
          <Text style={st(colors).statLabel}>Kaydedilen</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st(colors).tabsScroll}>
        <View style={st(colors).tabsContainer}>
          {(['preferences', 'bookmarks', 'settings', 'admin'] as TabType[]).map((tab) => {
            const labels: Record<TabType, string> = {
              preferences: 'Tercihler',
              bookmarks: 'Kaydedilenler',
              settings: 'Ayarlar',
              admin: 'Yönetim',
            };
            return (
              <Pressable
                key={tab}
                style={[st(colors).tabPill, activeTab === tab ? st(colors).tabPillActive : null]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[st(colors).tabText, activeTab === tab ? st(colors).tabTextActive : null]}>
                  {labels[tab]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <>
          <Text style={st(colors).sectionTitle}>İlgi Duyduğun Kategoriler</Text>
          {prefsLoading ? <Text style={st(colors).info}>Yükleniyor...</Text> : null}

          <View style={st(colors).chipGroup}>
            {CATEGORIES.map((category) => {
              const selected = preferredCategories.includes(category);
              return (
                <Pressable
                  key={category}
                  style={[st(colors).chip, selected ? st(colors).chipSelected : null]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={[st(colors).chipText, selected ? st(colors).chipTextSelected : null]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={st(colors).summaryCard}>
            <Text style={st(colors).summaryTitle}>Seçilen Kategoriler</Text>
            <Text style={st(colors).summaryBody}>
              {preferredCategories.length
                ? preferredCategories.join(', ')
                : 'Henüz kategori seçilmedi.'}
            </Text>
          </View>

          <Text style={st(colors).sectionTitle}>Takip Etmek İstediğin Gazeteler</Text>
          <View style={st(colors).chipGroup}>
            {NEWSPAPERS.map((newspaper) => {
              const selected = preferredNewspapers.includes(newspaper);
              return (
                <Pressable
                  key={newspaper}
                  style={[st(colors).chip, selected ? st(colors).chipSelected : null]}
                  onPress={() => toggleNewspaper(newspaper)}
                >
                  <Text style={[st(colors).chipText, selected ? st(colors).chipTextSelected : null]}>
                    {newspaper}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={st(colors).summaryCard}>
            <Text style={st(colors).summaryTitle}>Seçilen Gazeteler</Text>
            <Text style={st(colors).summaryBody}>
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
          <Text style={st(colors).sectionTitle}>Kaydedilen Haberler</Text>
          {bookmarksLoading ? <Text style={st(colors).info}>Yükleniyor...</Text> : null}

          {!bookmarksLoading && !savedNews.length ? (
            <Text style={st(colors).info}>Henüz kaydedilmiş haber bulunmuyor.</Text>
          ) : null}

          {savedNews.map((news) => (
            <View key={news.id} style={st(colors).bookmarkCard}>
              <Text style={st(colors).cardTitle}>{news.title}</Text>
              <Text style={st(colors).cardMeta}>{news.category}</Text>
              <Text style={st(colors).cardBody}>{news.excerpt}</Text>
            </View>
          ))}
        </>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <>
          <Text style={st(colors).sectionTitle}>Görünüm Ayarları</Text>

          <Text style={st(colors).settingLabel}>Tema Seç</Text>
          <View style={st(colors).themeGrid}>
            {THEME_NAMES.map((theme) => (
              <Pressable
                key={theme}
                style={[
                  st(colors).themeButton,
                  themeName === theme ? st(colors).themeButtonActive : null,
                ]}
                onPress={() => setTheme(theme)}
              >
                <Text
                  style={[
                    st(colors).themeButtonText,
                    themeName === theme ? st(colors).themeButtonTextActive : null,
                  ]}
                >
                  {THEME_LABELS[theme]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={st(colors).settingCard}>
            <Text style={st(colors).settingCardTitle}>Seçili Tema</Text>
            <Text style={st(colors).settingCardValue}>{THEME_LABELS[themeName]}</Text>
          </View>

          <Text style={st(colors).settingLabel}>Dil Seç</Text>
          <View style={st(colors).themeGrid}>
            {LANGUAGES.map((item) => (
              <Pressable
                key={item}
                style={[
                  st(colors).themeButton,
                  language === item ? st(colors).themeButtonActive : null,
                ]}
                onPress={() => setLanguage(item)}
              >
                <Text
                  style={[
                    st(colors).themeButtonText,
                    language === item ? st(colors).themeButtonTextActive : null,
                  ]}
                >
                  {LANGUAGE_LABELS[item]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={st(colors).settingCard}>
            <Text style={st(colors).settingCardTitle}>Seçili Dil</Text>
            <Text style={st(colors).settingCardValue}>{LANGUAGE_LABELS[language]}</Text>
          </View>

          <Text style={st(colors).sectionTitle}>Şifre Sıfırlama</Text>
          <View style={st(colors).settingCard}>
            <Text style={st(colors).settingCardTitle}>Yeni Şifre Belirle</Text>
            <Text style={st(colors).settingHint}>Profil hesabın için yeni şifre tanımlayabilirsin.</Text>

            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Yeni şifre"
              placeholderTextColor={colors.textMuted}
              style={st(colors).input}
            />
            <TextInput
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              placeholder="Yeni şifre tekrar"
              placeholderTextColor={colors.textMuted}
              style={st(colors).input}
            />

            {passwordError ? <Text style={st(colors).errorText}>{passwordError}</Text> : null}
            {passwordMessage ? <Text style={st(colors).successText}>{passwordMessage}</Text> : null}

            <Pressable style={st(colors).actionButton} onPress={handlePasswordReset}>
              <Text style={st(colors).actionButtonText}>Şifreyi Güncelle</Text>
            </Pressable>
          </View>

          <Pressable style={st(colors).logoutButton} onPress={handleLogout}>
            <Text style={st(colors).logoutButtonText}>Çıkış Yap</Text>
          </Pressable>
        </>
      )}

      {/* Admin Tab (FR24-FR25) */}
      {activeTab === 'admin' && (
        <>
          {/* Admin sub-navigation */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={st(colors).adminNav}>
              {([
                { key: 'overview', label: 'Genel Bakış', icon: 'stats-chart-outline' },
                { key: 'sources', label: 'Kaynaklar', icon: 'globe-outline' },
                { key: 'users', label: 'Kullanıcılar', icon: 'people-outline' },
                { key: 'logs', label: 'Loglar', icon: 'list-outline' },
              ] as { key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map((item) => (
                <Pressable
                  key={item.key}
                  style={[st(colors).adminNavItem, adminSection === item.key ? st(colors).adminNavItemActive : null]}
                  onPress={() => setAdminSection(item.key)}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={adminSection === item.key ? colors.white : colors.textMuted}
                  />
                  <Text style={[st(colors).adminNavText, adminSection === item.key ? st(colors).adminNavTextActive : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {renderAdminContent()}
        </>
      )}
    </ScrollView>
  );
}

const st = (colors: any) => StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 100,
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
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.full,
    padding: Spacing.xs,
  },
  tabPill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
  settingHint: {
    color: colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    color: colors.textPrimary,
  },
  actionButton: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: colors.accent,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  errorText: {
    color: colors.error,
    fontSize: Typography.fontSize.sm,
  },
  successText: {
    color: colors.success,
    fontSize: Typography.fontSize.sm,
  },
  logoutButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.surface,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  logoutButtonText: {
    color: colors.error,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },

  // Admin styles
  adminNav: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  adminNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  adminNavItemActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  adminNavText: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  adminNavTextActive: {
    color: colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  adminStatCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  adminStatValue: {
    color: colors.accent,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
  },
  adminStatLabel: {
    color: colors.textMuted,
    fontSize: Typography.fontSize.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    width: 80,
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceHigh,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: Radius.full,
  },
  barValue: {
    width: 36,
    fontSize: Typography.fontSize.sm,
    color: colors.textMuted,
    textAlign: 'right',
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  activityDate: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  activityValues: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  activityText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
  },
  adminCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminCardTitle: {
    fontSize: Typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  adminCardMeta: {
    fontSize: Typography.fontSize.sm,
    color: colors.textMuted,
  },
  adminCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  categoryBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: colors.accent,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  roleBadge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: Radius.full,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  roleBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: Typography.fontWeight.bold,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logLevel: {
    borderRadius: Radius.sm,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  logLevelText: {
    color: colors.white,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  logModule: {
    fontSize: Typography.fontSize.sm,
    color: colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  logMessage: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  logTime: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
  },
});

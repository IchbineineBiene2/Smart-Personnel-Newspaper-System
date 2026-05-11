import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Platform,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { usePreferences } from '@/hooks/usePreferences';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage, LANGUAGE_LABELS, LANGUAGES } from '@/hooks/useLanguage';
import { UserProfile, getUserProfile, logoutUser, updateUserProfile } from '@/services/auth';
import { ThemeName } from '@/theme/themes';

type ProfileTab = 'general' | 'preferences' | 'security' | 'subscription';

const PROFILE_TABS: { key: ProfileTab; label: string; icon: string }[] = [
  { key: 'general',      label: 'Genel',      icon: 'person-outline' },
  { key: 'preferences',  label: 'Tercihler',  icon: 'settings-outline' },
  { key: 'security',     label: 'Güvenlik',   icon: 'shield-outline' },
  { key: 'subscription', label: 'Abonelik',   icon: 'card-outline' },
];

const THEME_COLORS: Record<ThemeName, { dot: string; bg: string; label: string; text: string }> = {
  midnight: { dot: '#6254FF', bg: '#202330', label: 'GECE YARISI', text: '#FFFFFF' },
  emerald:  { dot: '#10B981', bg: '#14231D', label: 'ZÜMRÜT ORMANI', text: '#FFFFFF' },
  mars:     { dot: '#F43F5E', bg: '#2B1921', label: 'KIZIL MARS', text: '#FFFFFF' },
  cyber:    { dot: '#06B6D4', bg: '#142637', label: 'SİBER PUNK', text: '#FFFFFF' },
  sunset:   { dot: '#2E5B9A', bg: '#ECEFF3', label: 'CLEAN SLATE', text: '#1B2430' },
  vincent:  { dot: '#C4A88A', bg: '#FDF6E3', label: 'VINCENT', text: '#3E2B1F' },
};

const PROFILE_THEME_NAMES: ThemeName[] = ['midnight', 'emerald', 'mars', 'cyber', 'vincent'];

const NEWS_LANGUAGE_OPTIONS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'İngilizce' },
  { code: 'de', label: 'Almanca' },
  { code: 'fr', label: 'Fransızca' },
  { code: 'es', label: 'İspanyolca' },
  { code: 'ar', label: 'Arapça' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, themeName, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const {
    preferredCategories,
    preferredNewspapers,
    preferredNewsLanguages,
    toggleCategory,
    toggleNewspaper,
    toggleNewsLanguage,
  } = usePreferences();
  const { savedIds } = useBookmarks();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [autoNightMode, setAutoNightMode] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === 'web';
  const bg = colors.background;

  useFocusEffect(
    useCallback(() => {
      getUserProfile().then((p) => setUserProfile(p));
    }, [])
  );

  useEffect(() => {
    setEditName(userProfile?.name ?? '');
    setEditEmail(userProfile?.email ?? '');
  }, [userProfile]);

  useEffect(() => {
    Animated.stagger(80, [
      Animated.timing(headerFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(contentFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(contentFade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      Animated.timing(contentFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [activeTab]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/auth/login');
  };

  const handleSaveGeneral = async () => {
    const name = editName.trim();
    const email = editEmail.trim().toLowerCase();
    if (!name || !email) return;

    await updateUserProfile({ name, email });
    const updated = await getUserProfile();
    setUserProfile(updated);
    setIsEditingGeneral(false);
  };

  const handleCancelGeneral = () => {
    setEditName(userProfile?.name ?? '');
    setEditEmail(userProfile?.email ?? '');
    setIsEditingGeneral(false);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.body, { opacity: headerFade }]}>
        {/* ── Left: Profile Card + Tabs ── */}
        <View style={styles.left}>
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.avatarWrap, { borderColor: colors.accent }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="person" size={36} color={colors.accent} />
              </View>
              <View style={[styles.onlineDot, { borderColor: colors.surface }]} />
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {userProfile?.name ?? 'Ahmet Yüksel'}
            </Text>
            <Text style={[styles.profileHandle, { color: colors.textMuted }]}>
              @{userProfile?.email?.split('@')[0] ?? 'yukselahmet740'}
            </Text>
            <View style={styles.profileStats}>
              <View style={[styles.statBox, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.statNum, { color: colors.textPrimary }]}>{preferredNewspapers.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>TAKİP</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.statNum, { color: colors.textPrimary }]}>{preferredCategories.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>KATEGORİ</Text>
              </View>
            </View>
          </View>

          {/* Tab List */}
          <View style={[styles.tabList, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
            {PROFILE_TABS.map((tab) => (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [
                  styles.tabBtn,
                  activeTab === tab.key && { backgroundColor: colors.accent },
                  pressed && activeTab !== tab.key && { backgroundColor: colors.surfaceHigh },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.key ? '#fff' : colors.textMuted}
                />
                <Text style={[styles.tabBtnText, { color: activeTab === tab.key ? '#fff' : colors.textMuted }]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}

            <View style={[styles.tabDivider, { backgroundColor: colors.borderSubtle }]} />

            <Pressable style={styles.logoutTabBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
              <Text style={styles.logoutTabText}>Çıkış Yap</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Right: Content Panel ── */}
        <Animated.View style={[styles.right, { opacity: contentFade }]}>
          {activeTab === 'preferences' && (
            <View style={styles.panel}>
              {/* Appearance settings */}
              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeader}>
                  <Ionicons name="color-palette" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Görünüm Ayarları</Text>
                </View>
                <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                  Dashboard deneyiminizi kişiselleştirin.
                </Text>

                <Text style={[styles.settingLabel, { color: colors.textMuted }]}>RENK TEMASI</Text>
                <View style={styles.themeGrid}>
                  {PROFILE_THEME_NAMES.map((t) => {
                    const tc = THEME_COLORS[t];
                    const isSelected = themeName === t;
                    return (
                      <Pressable
                        key={t}
                        style={[
                          styles.themeCard,
                          {
                            backgroundColor: tc.bg,
                            borderColor: isSelected ? tc.dot : colors.borderSubtle,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() => setTheme(t)}
                      >
                        {isSelected && (
                          <View style={[styles.themeCheck, { backgroundColor: tc.dot }]}>
                            <Ionicons name="checkmark" size={10} color="#fff" />
                          </View>
                        )}
                        <View style={[styles.themeDot, { backgroundColor: tc.dot }]} />
                        <Text style={[styles.themeLabel, { color: tc.text }]}>
                          {tc.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Auto night mode */}
                <View style={[styles.toggleRow, { borderColor: colors.borderSubtle }]}>
                  <View style={[styles.toggleIcon, { backgroundColor: colors.accent + '20' }]}>
                    <Ionicons name="moon" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.toggleText}>
                    <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Otomatik Gece Modu</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                      Güneş battığında koyu temaya geçiş yapar.
                    </Text>
                  </View>
                  <Switch
                    value={autoNightMode}
                    onValueChange={setAutoNightMode}
                    trackColor={{ false: colors.borderSubtle, true: colors.accent }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Language */}
              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeader}>
                  <Ionicons name="language" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Dil</Text>
                </View>
                <View style={styles.langRow}>
                  {(LANGUAGES as string[]).map((lang) => (
                    <Pressable
                      key={lang}
                      style={[
                        styles.langBtn,
                        {
                          backgroundColor: language === lang ? colors.accent : colors.surfaceHigh,
                          borderColor: language === lang ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                      onPress={() => setLanguage(lang as any)}
                    >
                      <Text style={[styles.langText, { color: language === lang ? '#fff' : colors.textMuted }]}>
                        {LANGUAGE_LABELS[lang as keyof typeof LANGUAGE_LABELS]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeader}>
                  <Ionicons name="newspaper-outline" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Haber Dilleri</Text>
                </View>
                <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                  Ana sayfa, akış ve keşfet haberlerini seçtiğiniz dillerle sınırlandırır.
                </Text>
                <View style={styles.langRow}>
                  {NEWS_LANGUAGE_OPTIONS.map((item) => {
                    const selected = preferredNewsLanguages.includes(item.code);
                    return (
                      <Pressable
                        key={item.code}
                        style={[
                          styles.langBtn,
                          {
                            backgroundColor: selected ? colors.accent : colors.surfaceHigh,
                            borderColor: selected ? colors.accent : colors.borderSubtle,
                          },
                        ]}
                        onPress={() => toggleNewsLanguage(item.code)}
                      >
                        <Text style={[styles.langText, { color: selected ? '#fff' : colors.textMuted }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {activeTab === 'general' && (
            <View style={styles.panel}>
              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeaderBetween}>
                  <View style={styles.panelHeader}>
                  <Ionicons name="person" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Profil Bilgileri</Text>
                  </View>
                  {isEditingGeneral ? (
                    <View style={styles.editActions}>
                      <Pressable
                        style={[styles.iconActionBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}
                        onPress={handleCancelGeneral}
                      >
                        <Ionicons name="close" size={16} color={colors.textMuted} />
                      </Pressable>
                      <Pressable
                        style={[styles.iconActionBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                        onPress={handleSaveGeneral}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.editProfileBtn, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '35' }]}
                      onPress={() => setIsEditingGeneral(true)}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.accent} />
                      <Text style={[styles.editProfileText, { color: colors.accent }]}>Düzenle</Text>
                    </Pressable>
                  )}
                </View>
                {isEditingGeneral && (
                  <View style={styles.editForm}>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Ad Soyad</Text>
                      <TextInput
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Ad Soyad"
                        placeholderTextColor={colors.textMuted}
                        style={[
                          styles.profileInput,
                          {
                            backgroundColor: colors.surfaceHigh,
                            borderColor: colors.borderSubtle,
                            color: colors.textPrimary,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>E-posta</Text>
                      <TextInput
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="email@example.com"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={[
                          styles.profileInput,
                          {
                            backgroundColor: colors.surfaceHigh,
                            borderColor: colors.borderSubtle,
                            color: colors.textPrimary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
                {!isEditingGeneral && [
                  { label: 'Ad Soyad', value: userProfile?.name ?? '—', icon: 'person-outline' },
                  { label: 'E-posta', value: userProfile?.email ?? '—', icon: 'mail-outline' },
                  { label: 'Üyelik', value: 'PRO Üye', icon: 'star-outline' },
                ].map((row) => (
                  <View key={row.label} style={[styles.infoRow, { borderColor: colors.borderSubtle }]}>
                    <Ionicons name={row.icon as any} size={16} color={colors.accent} />
                    <View style={styles.infoText}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{row.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeader}>
                  <Ionicons name="newspaper" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Kaydedilen Haberler</Text>
                </View>
                <View style={[styles.statBig, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
                  <Text style={[styles.statBigNum, { color: colors.accent }]}>{savedIds.length}</Text>
                  <Text style={[styles.statBigLabel, { color: colors.textMuted }]}>kaydedilmiş makale</Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'security' && (
            <View style={styles.panel}>
              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Hesap Güvenliği</Text>
                </View>
                <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                  Hesabınızı güvende tutmak için aşağıdaki seçenekleri kullanın.
                </Text>
                {['Şifre Değiştir', 'İki Faktörlü Doğrulama', 'Oturum Geçmişi'].map((item) => (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [
                      styles.securityItem,
                      { backgroundColor: pressed ? colors.surfaceHigh : 'transparent', borderColor: colors.borderSubtle },
                    ]}
                  >
                    <Text style={[styles.securityText, { color: colors.textPrimary }]}>{item}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'subscription' && (
            <View style={styles.panel}>
              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={styles.panelHeader}>
                  <Ionicons name="star" size={20} color="#f59e0b" />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>PRO Üyelik</Text>
                </View>
                <View style={[styles.proBadge, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b30' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#f59e0b" />
                  <Text style={[styles.proBadgeText, { color: '#f59e0b' }]}>Aktif PRO Üyelik</Text>
                </View>
                <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                  Sınırsız haber erişimi, AI analiz ve özel içerikler.
                </Text>
                <Pressable style={[styles.manageBtn, { backgroundColor: colors.accent }]}>
                  <Text style={styles.manageBtnText}>Aboneliği Yönet</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="sparkles" size={11} color={colors.accent} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>AI Destekli Gazete</Text>
          </View>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Gizlilik</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Destek</Text>
        </View>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>© 2026 GazeteAI Hub v2.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 24, paddingBottom: 40 },
  webContent: { maxWidth: 1120, width: '100%' as any, alignSelf: 'center', paddingTop: 60 },
  body: { flexDirection: 'row', gap: 24, flexWrap: 'wrap' },

  // Left
  left: { width: 220, gap: 16 },
  profileCard: {
    borderRadius: 20, borderWidth: 1, padding: 20,
    alignItems: 'center', gap: 8,
  },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatar: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#10b981', borderWidth: 2,
  },
  profileName: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  profileHandle: { fontSize: 12, fontWeight: '500' },
  profileStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statBox: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    padding: 10, alignItems: 'center', gap: 2,
  },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Tab list
  tabList: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  tabBtnText: { fontSize: 12, fontWeight: '700' },
  tabDivider: { height: 1, marginHorizontal: 12, marginVertical: 4 },
  logoutTabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  logoutTabText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },

  // Right
  right: { flex: 1, minWidth: 280 },
  panel: { gap: 16 },
  panelCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  panelTitle: { fontSize: 18, fontWeight: '800' },
  panelSubtitle: { fontSize: 13, lineHeight: 19, marginTop: -8 },
  settingLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },

  // Theme grid
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    flex: 1, minWidth: 118, height: 90, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    position: 'relative', overflow: 'visible',
  },
  themeCheck: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  themeDot: { width: 32, height: 32, borderRadius: 10 },
  themeLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Toggle
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 16, borderTopWidth: 1,
  },
  toggleIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: '700' },
  toggleDesc: { fontSize: 12, lineHeight: 17 },

  // Language
  langRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  langBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  langText: { fontSize: 12, fontWeight: '700' },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editProfileText: { fontSize: 12, fontWeight: '800' },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editForm: { gap: 12 },
  inputGroup: { gap: 6 },
  profileInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: '600',
    outlineStyle: 'none' as any,
  },

  // Stat big
  statBig: {
    borderRadius: 14, borderWidth: 1, padding: 16,
    alignItems: 'center', gap: 4,
  },
  statBigNum: { fontSize: 36, fontWeight: '900' },
  statBigLabel: { fontSize: 12, fontWeight: '600' },

  // Security
  securityItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 10, borderRadius: 10, borderBottomWidth: 1,
  },
  securityText: { fontSize: 14, fontWeight: '600' },

  // Pro
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1,
  },
  proBadgeText: { fontSize: 13, fontWeight: '700' },
  manageBtn: {
    paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  manageBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Footer
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap',
    gap: 8, paddingTop: 20, borderTopWidth: 1,
  },
  footerText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
});

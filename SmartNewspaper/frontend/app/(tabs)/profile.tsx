import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePreferences } from '@/hooks/usePreferences';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useApiNews } from '@/hooks/useNews';
import { usePublisherState } from '@/hooks/usePublisherState';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage, LANGUAGE_LABELS, LANGUAGES } from '@/hooks/useLanguage';
import { UserProfile, getUserProfile, logoutUser, updateUserProfile } from '@/services/auth';
import { buildPublisherDataset } from '@/services/publisherProfiles';
import { ApiArticle, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { ThemeName } from '@/theme/themes';

const PROFILE_PHOTO_STORAGE_KEY = 'profile-photo-uri';

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
    preferredNewsLanguages,
    toggleNewsLanguage,
  } = usePreferences();
  const { savedIds } = useBookmarks();
  const { articles: apiArticles } = useApiNews();
  const { followedIds, notificationEnabledIds, togglePublisherNotifications } = usePublisherState();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [showFollowedPublishers, setShowFollowedPublishers] = useState(false);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [autoNightMode, setAutoNightMode] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === 'web';
  const bg = colors.background;
  const { publishers } = buildPublisherDataset(apiArticles);
  const followedPublishers = publishers.filter((publisher) => followedIds.includes(publisher.id));
  const savedArticles = savedIds
    .map((id) => apiArticles.find((article) => article.id === id))
    .filter((article): article is ApiArticle => Boolean(article))
    .slice(0, 4);

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
    AsyncStorage.getItem(PROFILE_PHOTO_STORAGE_KEY).then((value) => {
      setProfilePhotoUri(value);
    });
  }, []);

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

  const openPhotoPicker = (mode: 'camera' | 'library') => {
    setPhotoMenuOpen(false);

    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      Alert.alert('Desteklenmiyor', 'Fotoğraf seçme ve kamera şu anda web sürümünde destekleniyor.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (mode === 'camera') {
      input.setAttribute('capture', 'user');
    }

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const result = typeof reader.result === 'string' ? reader.result : null;
        if (!result) return;
        setProfilePhotoUri(result);
        await AsyncStorage.setItem(PROFILE_PHOTO_STORAGE_KEY, result);
      };
      reader.readAsDataURL(file);
    };

    input.click();
  };

  const removeProfilePhoto = async () => {
    setPhotoMenuOpen(false);
    setProfilePhotoUri(null);
    await AsyncStorage.removeItem(PROFILE_PHOTO_STORAGE_KEY);
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
                {profilePhotoUri ? (
                  <Image source={{ uri: profilePhotoUri }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Ionicons name="person" size={36} color={colors.accent} />
                )}
              </View>
              <Pressable
                style={[styles.avatarEditButton, { backgroundColor: colors.accent, borderColor: colors.surface }]}
                onPress={() => setPhotoMenuOpen((value) => !value)}
              >
                <Ionicons name="create-outline" size={14} color="#fff" />
              </Pressable>
              <View style={[styles.onlineDot, { borderColor: colors.surface }]} />
              {photoMenuOpen && (
                <View style={[styles.photoMenu, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <Pressable style={styles.photoMenuItem} onPress={() => openPhotoPicker('camera')}>
                    <Ionicons name="camera-outline" size={15} color={colors.accent} />
                    <Text style={[styles.photoMenuText, { color: colors.textPrimary }]}>Çek</Text>
                  </Pressable>
                  <Pressable style={styles.photoMenuItem} onPress={() => openPhotoPicker('library')}>
                    <Ionicons name="image-outline" size={15} color={colors.accent} />
                    <Text style={[styles.photoMenuText, { color: colors.textPrimary }]}>Seç</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.photoMenuItem, !profilePhotoUri && styles.photoMenuItemDisabled]}
                    onPress={profilePhotoUri ? removeProfilePhoto : undefined}
                  >
                    <Ionicons name="trash-outline" size={15} color={profilePhotoUri ? '#ef4444' : colors.textMuted} />
                    <Text style={[styles.photoMenuText, { color: profilePhotoUri ? '#ef4444' : colors.textMuted }]}>Sil</Text>
                  </Pressable>
                </View>
              )}
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {userProfile?.name ?? 'Ahmet Yüksel'}
            </Text>
            <Text style={[styles.profileHandle, { color: colors.textMuted }]}>
              @{userProfile?.email?.split('@')[0] ?? 'yukselahmet740'}
            </Text>
            <View style={styles.profileStats}>
              <Pressable
                style={({ pressed }) => [
                  styles.statBox,
                  { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => {
                  setShowFollowedPublishers(true);
                  setActiveTab('general');
                }}
              >
                <Text style={[styles.statNum, { color: colors.textPrimary }]}>{followedPublishers.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>TAKİP</Text>
              </Pressable>
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
              {showFollowedPublishers && (
                <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <View style={styles.panelHeaderBetween}>
                    <View style={styles.panelHeader}>
                      <Ionicons name="people-outline" size={20} color={colors.accent} />
                      <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Takip Edilen Hesaplar</Text>
                    </View>
                    <Pressable
                      style={[styles.iconActionBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}
                      onPress={() => setShowFollowedPublishers(false)}
                    >
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  {followedPublishers.length === 0 ? (
                    <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                      Henüz takip edilen yayıncı yok.
                    </Text>
                  ) : (
                    <View style={styles.followedList}>
                      {followedPublishers.map((publisher) => {
                        const enabled = notificationEnabledIds.includes(publisher.id);
                        return (
                          <Pressable
                            key={publisher.id}
                            style={[styles.followedRow, { borderColor: colors.borderSubtle }]}
                            onPress={() => router.push(`/publisherprofile?id=${publisher.id}` as any)}
                          >
                            <View style={[styles.publisherLogo, { backgroundColor: colors.accent + '18' }]}>
                              {publisher.logoUrl ? (
                                <Image source={{ uri: publisher.logoUrl }} style={styles.publisherLogoImage} resizeMode="cover" />
                              ) : (
                                <Text style={[styles.publisherLogoText, { color: colors.accent }]}>{publisher.logoText}</Text>
                              )}
                            </View>
                            <View style={styles.followedText}>
                              <Text style={[styles.followedName, { color: colors.textPrimary }]} numberOfLines={1}>
                                {publisher.name}
                              </Text>
                              <Text style={[styles.followedMeta, { color: colors.textMuted }]} numberOfLines={1}>
                                {publisher.articlesCount} haber | {publisher.cadence}
                              </Text>
                            </View>
                            <Pressable
                              style={[
                                styles.notifyButton,
                                {
                                  backgroundColor: enabled ? colors.accent : colors.surfaceHigh,
                                  borderColor: enabled ? colors.accent : colors.borderSubtle,
                                },
                              ]}
                              onPress={(event) => {
                                event.stopPropagation();
                                togglePublisherNotifications(publisher.id);
                              }}
                            >
                              <Ionicons
                                name={enabled ? 'notifications' : 'notifications-outline'}
                                size={14}
                                color={enabled ? '#fff' : colors.textMuted}
                              />
                              <Text style={[styles.notifyButtonText, { color: enabled ? '#fff' : colors.textMuted }]}>
                                {enabled ? 'Açık' : 'Bildirimleri aç'}
                              </Text>
                            </Pressable>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }, showFollowedPublishers && styles.hiddenPanel]}>
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

              <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }, showFollowedPublishers && styles.hiddenPanel]}>
                <Pressable
                  style={styles.panelHeader}
                  onPress={() => router.push({ pathname: '/(tabs)/archive', params: { tab: 'saved' } } as any)}
                >
                  <Ionicons name="newspaper" size={20} color={colors.accent} />
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Kaydedilen Haberler</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
                <View style={[styles.statBig, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
                  <Text style={[styles.statBigNum, { color: colors.accent }]}>{savedIds.length}</Text>
                  <Text style={[styles.statBigLabel, { color: colors.textMuted }]}>kaydedilmiş makale</Text>
                </View>
                {savedArticles.length > 0 ? (
                  <View style={styles.savedPreviewList}>
                    {savedArticles.map((article) => {
                      const imageUrl = proxyImageUrl(article.imageUrl);
                      const category = mapToContentCategory(article.category, article.title, article.description);
                      return (
                        <Pressable
                          key={article.id}
                          style={[styles.savedPreviewRow, { borderColor: colors.borderSubtle }]}
                          onPress={() => router.push({ pathname: '/news/[id]', params: { id: article.id } })}
                        >
                          {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.savedPreviewImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.savedPreviewImage, styles.savedPreviewPlaceholder, { backgroundColor: colors.surfaceHigh }]}>
                              <Ionicons name="newspaper-outline" size={18} color={colors.accent} />
                            </View>
                          )}
                          <View style={styles.savedPreviewText}>
                            <Text style={[styles.savedPreviewCategory, { color: colors.accent }]} numberOfLines={1}>
                              {category}
                            </Text>
                            <Text style={[styles.savedPreviewTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                              {article.title}
                            </Text>
                            <Text style={[styles.savedPreviewSource, { color: colors.textMuted }]} numberOfLines={1}>
                              {article.source.name}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.emptySavedPreview, { color: colors.textMuted }]}>Henüz önizlenecek kayıt yok.</Text>
                )}
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
    overflow: 'hidden',
  },
  avatarImage: { width: '100%' as any, height: '100%' as any },
  avatarEditButton: {
    position: 'absolute',
    right: -2,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  photoMenu: {
    position: 'absolute',
    top: 74,
    left: 46,
    width: 126,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  photoMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  photoMenuItemDisabled: { opacity: 0.55 },
  photoMenuText: { fontSize: 12, fontWeight: '800' },
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
  followedList: { gap: 10 },
  followedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  publisherLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  publisherLogoImage: { width: '100%' as any, height: '100%' as any },
  publisherLogoText: { fontSize: 13, fontWeight: '900' },
  followedText: { flex: 1, minWidth: 0 },
  followedName: { fontSize: 14, fontWeight: '800' },
  followedMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  notifyButtonText: { fontSize: 11, fontWeight: '800' },

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
  hiddenPanel: { display: 'none' },
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
  savedPreviewList: { gap: 10 },
  savedPreviewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  savedPreviewImage: {
    width: 72,
    height: 54,
    borderRadius: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  savedPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedPreviewText: { flex: 1, minWidth: 0 },
  savedPreviewCategory: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  savedPreviewTitle: { fontSize: 13, fontWeight: '800', lineHeight: 18 },
  savedPreviewSource: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  emptySavedPreview: { fontSize: 12, fontWeight: '600' },

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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { CATEGORIES } from '@/services/content';
import { buildPublisherDataset } from '@/services/publisherProfiles';
import { ApiArticle, mapToContentCategory, proxyImageUrl } from '@/services/newsApi';
import { ThemeName } from '@/theme/themes';

const PROFILE_PHOTO_STORAGE_KEY = 'profile-photo-uri';

type ProfileTab = 'general' | 'preferences' | 'security' | 'subscription';

type FriendStatus = 'none' | 'friends' | 'pending' | 'sent';

interface FriendSearchResult {
  id: number;
  username: string;
  full_name?: string;
  email: string;
  friend_count?: number;
  friend_status?: FriendStatus;
  friend_request_id?: number;
}

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
    toggleCategory,
    toggleNewsLanguage,
  } = usePreferences();
  const { savedIds } = useBookmarks();
  const { articles: apiArticles } = useApiNews();
  const { followedIds, notificationEnabledIds, toggleFollow, togglePublisherNotifications } = usePublisherState();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('general');
  const [showFollowedPublishers, setShowFollowedPublishers] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSearchResult[]>([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState<Record<number, boolean>>({});
  const [removingFriends, setRemovingFriends] = useState<Record<number, boolean>>({});
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [publisherPanelView, setPublisherPanelView] = useState<'followed' | 'other'>('followed');
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [autoNightMode, setAutoNightMode] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const friendSearchRequestId = useRef(0);

  const isWeb = Platform.OS === 'web';
  const bg = colors.background;
  const { publishers } = buildPublisherDataset(apiArticles);
  const followedPublishers = publishers.filter((publisher) => followedIds.includes(publisher.id));
  const otherPublishers = publishers.filter((publisher) => !followedIds.includes(publisher.id));
  const savedArticles = savedIds
    .map((id) => apiArticles.find((article) => article.id === id))
    .filter((article): article is ApiArticle => Boolean(article))
    .slice(0, 4);

  const getAuthToken = async () => {
    const authModule = require('@/services/auth');
    return authModule.getToken?.();
  };

  const loadFriends = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await fetch('http://localhost:3000/api/friends', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Arkadaslar yuklenemedi:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const profile = await getUserProfile();
        setUserProfile(profile);
        if (profile) {
          loadFriends();
        }
      };
      loadProfile();
    }, [loadFriends])
  );

  useEffect(() => {
    setEditName(userProfile?.name ?? '');
    setEditEmail(userProfile?.email ?? '');
  }, [userProfile]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/auth/login');
  };

  const handleCancelGeneral = () => {
    setEditName(userProfile?.name ?? '');
    setEditEmail(userProfile?.email ?? '');
    setIsEditingGeneral(false);
  };

  const handleSaveGeneral = async () => {
    const nextName = editName.trim();
    const nextEmail = editEmail.trim();

    if (!nextName || !nextEmail) {
      Alert.alert('Hata', 'Ad soyad ve e-posta alanlari bos birakilamaz.');
      return;
    }

    const updatedProfile: UserProfile = {
      ...(userProfile ?? {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
      }),
      name: nextName,
      email: nextEmail,
    };

    await updateUserProfile(updatedProfile);
    setUserProfile(updatedProfile);
    setIsEditingGeneral(false);
  };

  const searchFriendUsers = async (query: string) => {
    const requestId = friendSearchRequestId.current + 1;
    friendSearchRequestId.current = requestId;
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setFriendSearchResults([]);
      setFriendSearchLoading(false);
      return;
    }

    try {
      setFriendSearchLoading(true);
      const token = await getAuthToken();
      if (!token) {
        setFriendSearchResults([]);
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/contacts/search?q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (requestId !== friendSearchRequestId.current) return;

      if (response.ok) {
        const data = await response.json();
        const usersWithStatus = await Promise.all(
          (data.users || []).map(async (user: FriendSearchResult) => {
            try {
              const profileResponse = await fetch(`http://localhost:3000/api/contacts/profile/${user.id}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                return {
                  ...user,
                  friend_count: profileData.friend_count,
                  friend_status: profileData.friend_status,
                  friend_request_id: profileData.friend_request_id,
                };
              }
            } catch (error) {
              console.error('Arkadaslik durumu alinamadi:', error);
            }

            return user;
          })
        );

        if (requestId === friendSearchRequestId.current) {
          setFriendSearchResults(usersWithStatus);
        }
      } else {
        setFriendSearchResults([]);
      }
    } catch (error) {
      if (requestId !== friendSearchRequestId.current) return;
      console.error('Kullanici arama hatasi:', error);
      setFriendSearchResults([]);
    } finally {
      if (requestId === friendSearchRequestId.current) {
        setFriendSearchLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!showFriendSearch) {
      friendSearchRequestId.current += 1;
      setFriendSearchQuery('');
      setFriendSearchResults([]);
      setFriendSearchLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchFriendUsers(friendSearchQuery);
    }, 250);

    return () => clearTimeout(timeout);
  }, [friendSearchQuery, showFriendSearch]);

  const handleSendFriendRequest = async (userId: number) => {
    try {
      setFriendActionLoading((current) => ({ ...current, [userId]: true }));
      const token = await getAuthToken();

      const response = await fetch(`http://localhost:3000/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setFriendSearchResults((current) =>
          current.map((user) =>
            user.id === userId ? { ...user, friend_status: 'sent' } : user
          )
        );
        Alert.alert('Basarili', 'Arkadaslik istegi gonderildi.');
      } else {
        const data = await response.json();
        Alert.alert('Hata', data.error || 'Arkadaslik istegi gonderilemedi.');
      }
    } catch (error) {
      console.error('Arkadaslik istegi gonderilemedi:', error);
      Alert.alert('Hata', 'Arkadaslik istegi gonderilemedi.');
    } finally {
      setFriendActionLoading((current) => ({ ...current, [userId]: false }));
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      setRemovingFriends((current) => ({ ...current, [friendId]: true }));
      const token = await getAuthToken();

      const response = await fetch(`http://localhost:3000/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setFriends((current) => current.filter((friend) => friend.friend_id !== friendId));
        setFriendSearchResults((current) =>
          current.map((user) =>
            user.id === friendId ? { ...user, friend_status: 'none' } : user
          )
        );
      } else {
        const data = await response.json();
        Alert.alert('Hata', data.error || 'Arkadaslik kaldirilamadi.');
      }
    } catch (error) {
      console.error('Arkadaslik kaldirilamadi:', error);
      Alert.alert('Hata', 'Arkadaslik kaldirilamadi.');
    } finally {
      setRemovingFriends((current) => ({ ...current, [friendId]: false }));
    }
  };

  const openPhotoPicker = async (source: 'camera' | 'library') => {
    // TODO: Implement photo picker
    console.log('Photo picker called:', source);
  };

  const removeProfilePhoto = async () => {
    setProfilePhotoUri(null);
    // TODO: Send update to backend
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Lütfen tüm alanları doldurunuz.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      // TODO: Call API to change password
      // const result = await changePassword(oldPassword, newPassword);
      setPasswordSuccess('Şifre başarıyla değiştirildi!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (error) {
      setPasswordError('Şifre değiştirme başarısız oldu. Lütfen tekrar deneyiniz.');
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: bg }]}
      contentContainerStyle={[styles.content, isWeb && styles.webContent]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={styles.body}>
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
              @{userProfile?.username ?? userProfile?.email?.split('@')[0] ?? 'yukselahmet740'}
            </Text>
            <View style={styles.profileStats}>
              <Pressable
                style={({ pressed }) => [
                  styles.statBox,
                  { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => {
                  setShowFollowedPublishers(true);
                  setShowFriends(false);
                  setShowCategorySelector(false);
                  setPublisherPanelView('followed');
                  setActiveTab('general');
                }}
              >
                <Text style={[styles.statNum, { color: colors.textPrimary }]}>{followedPublishers.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>TAKİP</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.statBox,
                  { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => {
                  setShowFriends(true);
                  setShowFollowedPublishers(false);
                  setShowCategorySelector(false);
                  setActiveTab('general');
                }}
              >
                <Text style={[styles.statNum, { color: colors.textPrimary }]}>{friends.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>ARKADAŞ</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.statBox,
                  { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle, opacity: pressed ? 0.75 : 1 },
                ]}
                onPress={() => {
                  setShowCategorySelector(true);
                  setShowFollowedPublishers(false);
                  setShowFriends(false);
                  setActiveTab('general');
                }}
              >
                <Text style={[styles.statNum, { color: colors.textPrimary }]}>{preferredCategories.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>KATEGORİ</Text>
              </Pressable>
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
        <Animated.View style={styles.right}>
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
              {showCategorySelector && (
                <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <View style={styles.panelHeaderBetween}>
                    <View style={styles.panelHeader}>
                      <Ionicons name="albums-outline" size={20} color={colors.accent} />
                      <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Kategori Seçimi</Text>
                    </View>
                    <Pressable
                      style={[styles.iconActionBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}
                      onPress={() => setShowCategorySelector(false)}
                    >
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>

                  <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                    İlgi alanlarınızı seçin. Seçimler anında kaydedilir.
                  </Text>

                  <View style={styles.categoryChipGroup}>
                    {CATEGORIES.map((category) => {
                      const selected = preferredCategories.includes(category);
                      return (
                        <Pressable
                          key={category}
                          style={[
                            styles.categoryChip,
                            {
                              backgroundColor: selected ? colors.accent : colors.surfaceHigh,
                              borderColor: selected ? colors.accent : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => toggleCategory(category)}
                        >
                          <Text style={[styles.categoryChipText, { color: selected ? '#fff' : colors.textMuted }]}>
                            {category}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={[styles.categorySummary, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.categorySummaryText, { color: colors.textPrimary }]}>
                      {preferredCategories.length ? preferredCategories.join(', ') : 'Henüz kategori seçilmedi.'}
                    </Text>
                  </View>
                </View>
              )}

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

                  <View style={styles.publisherPanelTabs}>
                    <Pressable
                      style={[
                        styles.publisherPanelTab,
                        publisherPanelView === 'followed' && { backgroundColor: colors.accent, borderColor: colors.accent },
                      ]}
                      onPress={() => setPublisherPanelView('followed')}
                    >
                      <Text style={[styles.publisherPanelTabText, { color: publisherPanelView === 'followed' ? '#fff' : colors.textMuted }]}>
                        Takip Edilenler
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.publisherPanelTab,
                        publisherPanelView === 'other' && { backgroundColor: colors.accent, borderColor: colors.accent },
                      ]}
                      onPress={() => setPublisherPanelView('other')}
                    >
                      <Text style={[styles.publisherPanelTabText, { color: publisherPanelView === 'other' ? '#fff' : colors.textMuted }]}>
                        Diğer Hesaplar
                      </Text>
                    </Pressable>
                  </View>

                  {publisherPanelView === 'followed' ? (
                    followedPublishers.length === 0 ? (
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
                                  styles.unfollowButton,
                                  {
                                    backgroundColor: colors.surfaceHigh,
                                    borderColor: colors.borderSubtle,
                                  },
                                ]}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  toggleFollow(publisher.id);
                                }}
                              >
                                <Ionicons name="remove-circle-outline" size={14} color="#ef4444" />
                                <Text style={styles.unfollowButtonText}>Takibi bırak</Text>
                              </Pressable>
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
                    )
                  ) : otherPublishers.length === 0 ? (
                    <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                      Takip edilecek başka haber hesabı bulunamadı.
                    </Text>
                  ) : (
                    <View style={styles.followedList}>
                      {otherPublishers.map((publisher) => {
                        const enabled = notificationEnabledIds.includes(publisher.id);
                        const followed = followedIds.includes(publisher.id);

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
                                styles.followButton,
                                {
                                  backgroundColor: followed ? colors.surfaceHigh : colors.accent,
                                  borderColor: followed ? colors.borderSubtle : colors.accent,
                                },
                              ]}
                              onPress={(event) => {
                                event.stopPropagation();
                                toggleFollow(publisher.id);
                              }}
                            >
                              <Ionicons
                                name={followed ? 'checkmark-circle' : 'add-circle-outline'}
                                size={14}
                                color={followed ? colors.textMuted : '#fff'}
                              />
                              <Text style={[styles.followButtonText, { color: followed ? colors.textMuted : '#fff' }]}>
                                {followed ? 'Takipte' : 'Takip Et'}
                              </Text>
                            </Pressable>
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
                              disabled={!followed}
                            >
                              <Ionicons
                                name={enabled ? 'notifications' : 'notifications-outline'}
                                size={14}
                                color={enabled ? '#fff' : colors.textMuted}
                              />
                              <Text style={[styles.notifyButtonText, { color: enabled ? '#fff' : colors.textMuted }]}>
                                {enabled ? 'Açık' : 'Bildirim'}
                              </Text>
                            </Pressable>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {showFriends && (
                <View style={[styles.panelCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <View style={styles.panelHeaderBetween}>
                    <View style={styles.panelHeader}>
                      <Ionicons name="people" size={20} color={colors.accent} />
                      <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Arkadaşlar</Text>
                    </View>
                    <View style={styles.panelActions}>
                      <Pressable
                        style={[styles.addFriendBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                        onPress={() => setShowFriendSearch((current) => !current)}
                      >
                        <Ionicons name={showFriendSearch ? 'search' : 'person-add'} size={15} color="#fff" />
                        <Text style={styles.addFriendBtnText}>
                          {showFriendSearch ? 'Ara' : 'Arkadas Ekle'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.iconActionBtn, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}
                        onPress={() => {
                          setShowFriends(false);
                          setShowFriendSearch(false);
                        }}
                      >
                        <Ionicons name="close" size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>

                  {showFriendSearch && (
                    <View style={styles.friendSearchBox}>
                      <View style={[styles.friendSearchInputWrap, { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceHigh }]}>
                        <Ionicons name="search" size={16} color={colors.textMuted} />
                        <TextInput
                          style={[styles.friendSearchInput, { color: colors.textPrimary }]}
                          placeholder="Kullanici ara..."
                          placeholderTextColor={colors.textMuted}
                          value={friendSearchQuery}
                          onChangeText={setFriendSearchQuery}
                          autoCapitalize="none"
                        />
                      </View>

                      {friendSearchLoading ? (
                        <ActivityIndicator size="small" color={colors.accent} style={styles.friendSearchLoading} />
                      ) : friendSearchQuery.trim().length >= 2 ? (
                        friendSearchResults.length > 0 ? (
                          <View style={styles.friendSearchResults}>
                            {friendSearchResults.map((result) => {
                              const status = result.friend_status ?? 'none';
                              const isBusy = friendActionLoading[result.id];

                              return (
                                <View
                                  key={result.id}
                                  style={[styles.friendRow, { borderColor: colors.borderSubtle }]}
                                >
                                  <View style={[styles.friendAvatar, { backgroundColor: colors.accent + '18' }]}>
                                    <Ionicons name="person" size={18} color={colors.accent} />
                                  </View>
                                  <View style={styles.friendText}>
                                    <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                                      {result.full_name || result.username}
                                    </Text>
                                    <Text style={[styles.friendEmail, { color: colors.textMuted }]} numberOfLines={1}>
                                      @{result.username} · {result.email}
                                    </Text>
                                  </View>
                                  {status === 'friends' ? (
                                    <View style={[styles.friendStatusPill, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                                      <Text style={[styles.friendStatusText, { color: colors.textMuted }]}>Arkadas</Text>
                                    </View>
                                  ) : status === 'sent' ? (
                                    <View style={[styles.friendStatusPill, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                                      <Text style={[styles.friendStatusText, { color: colors.textMuted }]}>Gonderildi</Text>
                                    </View>
                                  ) : status === 'pending' ? (
                                    <View style={[styles.friendStatusPill, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                                      <Text style={[styles.friendStatusText, { color: colors.textMuted }]}>Bekliyor</Text>
                                    </View>
                                  ) : (
                                    <Pressable
                                      style={[styles.friendAddSmallBtn, { backgroundColor: colors.accent }]}
                                      onPress={() => handleSendFriendRequest(result.id)}
                                      disabled={isBusy}
                                    >
                                      {isBusy ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                      ) : (
                                        <Text style={styles.friendAddSmallText}>Ekle</Text>
                                      )}
                                    </Pressable>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                            Kullanici bulunamadi.
                          </Text>
                        )
                      ) : (
                        <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                          Arkadaslik istegi gondermek icin en az 2 harf yaz.
                        </Text>
                      )}
                    </View>
                  )}

                  {friends.length === 0 ? (
                    <Text style={[styles.panelSubtitle, { color: colors.textMuted }]}>
                      Henüz arkadaşın yok.
                    </Text>
                  ) : (
                    <View style={styles.friendsList}>
                      {friends.map((friend) => (
                        <View
                          key={friend.friend_id}
                          style={[styles.friendRow, { borderColor: colors.borderSubtle }]}
                        >
                          <View style={[styles.friendAvatar, { backgroundColor: colors.accent + '18' }]}>
                            <Ionicons name="person" size={18} color={colors.accent} />
                          </View>
                          <View style={styles.friendText}>
                            <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {friend.full_name || friend.username}
                            </Text>
                            <Text style={[styles.friendEmail, { color: colors.textMuted }]} numberOfLines={1}>
                              @{friend.username} · {friend.email}
                            </Text>
                          </View>
                          <Pressable
                            style={[styles.removeFriendBtn, { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceHigh }]}
                            onPress={() => handleRemoveFriend(friend.friend_id)}
                            disabled={removingFriends[friend.friend_id]}
                          >
                            {removingFriends[friend.friend_id] ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <>
                                <Ionicons name="person-remove-outline" size={14} color="#ef4444" />
                                <Text style={styles.removeFriendText}>Cikar</Text>
                              </>
                            )}
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View
                style={[
                  styles.panelCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  (showFollowedPublishers || showFriends || showCategorySelector) && styles.hiddenPanel,
                ]}
              >
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

              <View
                style={[
                  styles.panelCard,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                  (showFollowedPublishers || showCategorySelector) && styles.hiddenPanel,
                ]}
              >
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
                    onPress={() => {
                      if (item === 'Şifre Değiştir') {
                        setShowPasswordChange(!showPasswordChange);
                      }
                    }}
                  >
                    <Text style={[styles.securityText, { color: colors.textPrimary }]}>{item}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}

                {showPasswordChange && (
                  <View style={[styles.passwordForm, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
                    <Text style={[styles.passwordFormTitle, { color: colors.textPrimary }]}>Şifre Değiştir</Text>

                    <Text style={[styles.passwordLabel, { color: colors.textPrimary }]}>Eski Şifre</Text>
                    <TextInput
                      style={[styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                      placeholder="Eski şifrenizi girin"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      value={oldPassword}
                      onChangeText={setOldPassword}
                    />

                    <Text style={[styles.passwordLabel, { color: colors.textPrimary, marginTop: 12 }]}>Yeni Şifre</Text>
                    <TextInput
                      style={[styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                      placeholder="Yeni şifrenizi girin"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />

                    <Text style={[styles.passwordLabel, { color: colors.textPrimary, marginTop: 12 }]}>Yeni Şifre Tekrar</Text>
                    <TextInput
                      style={[styles.passwordInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.borderSubtle }]}
                      placeholder="Yeni şifrenizi tekrar girin"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />

                    {passwordError && (
                      <Text style={[styles.errorText, { color: '#ef4444', marginTop: 10 }]}>{passwordError}</Text>
                    )}

                    {passwordSuccess && (
                      <Text style={[styles.successText, { color: '#10b981', marginTop: 10 }]}>{passwordSuccess}</Text>
                    )}

                    <View style={styles.passwordFormButtons}>
                      <Pressable
                        style={[styles.passwordCancelBtn, { borderColor: colors.borderSubtle }]}
                        onPress={() => {
                          setShowPasswordChange(false);
                          setOldPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                          setPasswordError('');
                          setPasswordSuccess('');
                        }}
                      >
                        <Text style={[styles.passwordCancelBtnText, { color: colors.textPrimary }]}>İptal</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.passwordChangeBtn, { backgroundColor: colors.accent }]}
                        onPress={handleChangePassword}
                      >
                        <Text style={styles.passwordChangeBtnText}>Şifre Değiştir</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
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
    left: -2,
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
    left: -130,
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
  friendsList: { gap: 10 },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  addFriendBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  friendSearchBox: {
    gap: 10,
  },
  friendSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  friendSearchLoading: {
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
  friendSearchResults: {
    gap: 4,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  friendText: { flex: 1, minWidth: 0 },
  friendName: { fontSize: 14, fontWeight: '800' },
  friendEmail: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  friendStatusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  friendStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  friendAddSmallBtn: {
    minWidth: 54,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  friendAddSmallText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  removeFriendBtn: {
    minWidth: 72,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
  },
  removeFriendText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  publisherPanelTabs: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  publisherPanelTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  publisherPanelTabText: { fontSize: 11, fontWeight: '800' },
  sectionCount: { fontSize: 11, fontWeight: '700' },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  followButtonText: { fontSize: 11, fontWeight: '800' },
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  unfollowButtonText: { fontSize: 11, fontWeight: '800', color: '#ef4444' },
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
  categoryChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 12, fontWeight: '800' },
  categorySummary: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  categorySummaryText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

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
  passwordForm: {
    marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1,
  },
  passwordFormTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  passwordLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  passwordInput: {
    borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: 'System',
  },
  errorText: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  successText: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  passwordFormButtons: {
    flexDirection: 'row', gap: 10, marginTop: 16,
  },
  passwordCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center',
  },
  passwordCancelBtnText: { fontSize: 14, fontWeight: '600' },
  passwordChangeBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  passwordChangeBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },

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

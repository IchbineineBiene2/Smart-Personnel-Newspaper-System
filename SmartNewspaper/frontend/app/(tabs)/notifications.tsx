import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useApiNews } from '@/hooks/useNews';
import { usePublisherState } from '@/hooks/usePublisherState';
import { useEvents } from '@/hooks/useEvents';
import { useConcerts } from '@/hooks/useConcerts';
import { getToken } from '@/services/auth';
import { getPublisherIdFromSourceName } from '@/services/publisherProfiles';
import { proxyImageUrl } from '@/services/newsApi';
import { EventCategory, EVENT_CATEGORY_LABELS, EVENT_CATEGORY_COLORS } from '@/services/eventsApi';

type NotificationTab = 'all' | 'friends' | 'comments' | 'news' | 'events';
type NewsCategory = string;
type EventCategoryType = EventCategory;

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  content: string;
  related_article_id?: string | null;
  related_user_id?: number | null;
  friend_request_id?: number | null;
  is_read: boolean;
  created_at: string;
}

interface FeedNotification {
  id: string;
  tab: NotificationTab;
  icon: string;
  accent: string;
  title: string;
  content: string;
  createdAt: string;
  unread?: boolean;
  badge?: string;
  imageUrl?: string;
  publisherId?: string;
  onPress?: () => void;
  apiId?: number;
  isFriendRequest?: boolean;
  friendRequestId?: number;
  userId?: number;
}

const TABS: { key: NotificationTab; label: string; icon: string }[] = [
  { key: 'all', label: 'Tümü', icon: 'albums-outline' },
  { key: 'friends', label: 'Arkadaşlık', icon: 'people-outline' },
  { key: 'comments', label: 'Yorumlar', icon: 'chatbubble-outline' },
  { key: 'news', label: 'Yeni Haber', icon: 'newspaper-outline' },
  { key: 'events', label: 'Etkinlikler', icon: 'calendar-outline' },
];

const NEWS_CATEGORIES = [
  'Teknoloji',
  'Spor',
  'Sağlık',
  'Siyaset',
  'Eğitim',
  'Eğlence',
  'Işletme',
  'Diğer',
];

const EVENT_CATEGORIES: EventCategoryType[] = [
  'akademik',
  'sosyal',
  'konser',
  'tiyatro',
  'stand-up',
  'son-tarih',
  'sinav',
  'genel',
];

const TURKEY_CITIES = [
  'Adana',
  'Adıyaman',
  'Afyonkarahisar',
  'Ağrı',
  'Aksaray',
  'Amasya',
  'Ankara',
  'Antalya',
  'Ardahan',
  'Artvin',
  'Aydın',
  'Balıkesir',
  'Bartin',
  'Batman',
  'Bayburt',
  'Bilecik',
  'Bingöl',
  'Bitlis',
  'Bolu',
  'Burdur',
  'Bursa',
  'Çanakkale',
  'Çankırı',
  'Çorum',
  'Denizli',
  'Diyarbakır',
  'Düzce',
  'Edirne',
  'Elazığ',
  'Erzincan',
  'Erzurum',
  'Eskişehir',
  'Gaziantep',
  'Giresun',
  'Gümüşhane',
  'Hakkari',
  'Hatay',
  'Iğdır',
  'Isparta',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Karabük',
  'Karaman',
  'Kars',
  'Kastamonu',
  'Kayseri',
  'Kilis',
  'Kırıkkale',
  'Kırklareli',
  'Kırşehir',
  'Kocaeli',
  'Konya',
  'Kütahya',
  'Malatya',
  'Manisa',
  'Mardin',
  'Mersin',
  'Muğla',
  'Muş',
  'Nevşehir',
  'Niğde',
  'Ordu',
  'Osmaniye',
  'Rize',
  'Sakarya',
  'Samsun',
  'Şanlıurfa',
  'Siirt',
  'Sinop',
  'Şırnak',
  'Sivas',
  'Tekirdağ',
  'Tokat',
  'Trabzon',
  'Tunceli',
  'Uşak',
  'Van',
  'Yalova',
  'Yozgat',
  'Zonguldak',
];

function normalizeCityText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u');
}

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { articles, loading: newsLoading } = useApiNews();
  const { followedIds, notificationEnabledIds } = usePublisherState();
  const { events } = useEvents();
  const { concerts } = useConcerts();

  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [handlingFriendRequest, setHandlingFriendRequest] = useState<Record<number, boolean>>({});
  
  // News tab state (multi-select)
  const [selectedNewsCategories, setSelectedNewsCategories] = useState<Set<NewsCategory>>(
    new Set(NEWS_CATEGORIES)
  );
  
  // Events tab state (multi-select)
  const [selectedEventCategories, setSelectedEventCategories] = useState<Set<EventCategoryType>>(
    new Set(EVENT_CATEGORIES)
  );
  const [citySearch, setCitySearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const loadRemoteData = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || authToken;
    if (!token) return;

    try {
      setLoading(true);
      const notificationsResponse = await fetch('http://localhost:3000/api/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        setApiNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Bildirim verileri yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      let interval: ReturnType<typeof setInterval> | undefined;

      getToken().then((token) => {
        if (!active) return;
        setAuthToken(token || '');
        if (token) {
          loadRemoteData(token);
          interval = setInterval(() => loadRemoteData(token), 30000);
        }
      });

      return () => {
        active = false;
        if (interval) clearInterval(interval);
      };
    }, [loadRemoteData])
  );

  const markAsRead = async (notificationId: number) => {
    if (!authToken) return;

    try {
      const response = await fetch(`http://localhost:3000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        setApiNotifications((current) =>
          current.map((item) => item.id === notificationId ? { ...item, is_read: true } : item)
        );
      }
    } catch (error) {
      console.error('Bildirim okundu yapılamadı:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    if (!authToken) return;

    try {
      const response = await fetch(`http://localhost:3000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        setApiNotifications((current) => current.filter((item) => item.id !== notificationId));
      }
    } catch (error) {
      console.error('Bildirim silinemedi:', error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: number, notificationId: number) => {
    if (!authToken) return;

    try {
      setHandlingFriendRequest((current) => ({ ...current, [requestId]: true }));
      const response = await fetch(`http://localhost:3000/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        await deleteNotification(notificationId);
      }
    } catch (error) {
      console.error('Arkadaş isteği kabul edilemedi:', error);
    } finally {
      setHandlingFriendRequest((current) => ({ ...current, [requestId]: false }));
    }
  };

  const handleRejectFriendRequest = async (requestId: number, notificationId: number) => {
    if (!authToken) return;

    try {
      setHandlingFriendRequest((current) => ({ ...current, [requestId]: true }));
      const response = await fetch(`http://localhost:3000/api/friends/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        await deleteNotification(notificationId);
      }
    } catch (error) {
      console.error('Arkadaş isteği reddedilemedi:', error);
    } finally {
      setHandlingFriendRequest((current) => ({ ...current, [requestId]: false }));
    }
  };

  // Prepare feed items for all tabs
  const feedItems = useMemo<FeedNotification[]>(() => {
    const friendNotifications: FeedNotification[] = apiNotifications
      .filter((item) => item.type === 'friend_request')
      .map((item) => ({
        id: `api-${item.id}`,
        tab: 'friends',
        icon: 'person-add',
        accent: '#e67e22',
        title: 'Arkadaş İsteği',
        content: item.content,
        createdAt: item.created_at,
        unread: !item.is_read,
        badge: item.is_read ? undefined : 'Okunmadı',
        apiId: item.id,
        isFriendRequest: true,
        friendRequestId: item.friend_request_id || undefined,
        userId: item.related_user_id || undefined,
      }));

    const commentNotifications: FeedNotification[] = apiNotifications
      .filter((item) => ['comment_like', 'comment_reply'].includes(item.type))
      .map((item) => ({
        id: `api-${item.id}`,
        tab: 'comments',
        icon: item.type === 'comment_like' ? 'heart' : 'chatbubble',
        accent: item.type === 'comment_like' ? '#ef4444' : '#8b5cf6',
        title: item.type === 'comment_like' ? 'Yorum Beğeni' : 'Yorum Yanıtı',
        content: item.content,
        createdAt: item.created_at,
        unread: !item.is_read,
        badge: item.is_read ? undefined : 'Okunmadı',
        apiId: item.id,
        onPress: () => {
          if (!item.is_read) markAsRead(item.id);
        },
      }));

    const enabledPublisherIds = new Set(
      notificationEnabledIds.filter((id) => followedIds.includes(id))
    );

    const newsNotifs: FeedNotification[] = articles
      .filter((article) => {
        const pubId = getPublisherIdFromSourceName(article.source.name);
        const category = article.category || 'Diğer';
        return enabledPublisherIds.has(pubId) && selectedNewsCategories.has(category);
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20)
      .map((article) => ({
        id: `news-${article.id}`,
        tab: 'news',
        icon: 'newspaper',
        accent: '#3b82f6',
        title: article.source.name,
        content: article.title,
        createdAt: article.publishedAt,
        badge: article.category || 'Haber',
        imageUrl: proxyImageUrl(article.imageUrl) ?? article.imageUrl,
        publisherId: getPublisherIdFromSourceName(article.source.name),
        onPress: () => router.push(`/publisherprofile?id=${getPublisherIdFromSourceName(article.source.name)}` as any),
      }));

    const eventNotifs: FeedNotification[] = [
      ...events
        .filter((e) => {
          const selectedCityNormalized = normalizeCityText(selectedCity);
          const locationText = normalizeCityText(`${e.location || ''} ${e.venue || ''}`);
          return (
            selectedEventCategories.has(e.category as EventCategoryType) &&
            (!selectedCityNormalized || locationText.includes(selectedCityNormalized))
          );
        })
        .map((event) => ({
          id: `event-${event.id}`,
          tab: 'events' as const,
          icon: 'calendar',
          accent: EVENT_CATEGORY_COLORS[event.category as EventCategoryType] || '#8b5cf6',
          title: event.title,
          content: `${event.location || 'Belirtilmedi'} • ${event.date}`,
          createdAt: event.date,
          badge: EVENT_CATEGORY_LABELS[event.category as EventCategoryType] || event.category,
          imageUrl: event.imageUrl,
          onPress: () => router.push({ pathname: '/events/[id]', params: { id: event.id } }),
        })),
      ...concerts
        .filter((c) => {
          const selectedCityNormalized = normalizeCityText(selectedCity);
          const locationText = normalizeCityText(`${c.location || ''} ${c.venue || ''}`);
          return (
            selectedEventCategories.has(c.category as EventCategoryType) &&
            (!selectedCityNormalized || locationText.includes(selectedCityNormalized))
          );
        })
        .map((concert) => ({
          id: `concert-${concert.id}`,
          tab: 'events' as const,
          icon: 'musical-notes',
          accent: '#f59e0b',
          title: concert.title,
          content: `${concert.venue || 'Belirtilmedi'} • ${concert.date}`,
          createdAt: concert.date,
          badge: EVENT_CATEGORY_LABELS[concert.category as EventCategoryType] || concert.category,
          imageUrl: concert.imageUrl,
          onPress: () => router.push({ pathname: '/events/[id]', params: { id: concert.id, type: 'concert' } }),
        })),
    ];

    return [
      ...friendNotifications,
      ...commentNotifications,
      ...newsNotifs,
      ...eventNotifs,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [apiNotifications, articles, concerts, events, followedIds, notificationEnabledIds, selectedNewsCategories, selectedEventCategories, selectedCity, router]);

  const citySuggestions = useMemo(() => {
    const query = normalizeCityText(citySearch.trim());
    if (!query || selectedCity === citySearch.trim()) return [];
    return TURKEY_CITIES.filter((city) => normalizeCityText(city).startsWith(query)).slice(0, 8);
  }, [citySearch, selectedCity]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return feedItems;
    if (activeTab === 'news') {
      return feedItems.filter((item) => item.tab === 'news');
    }
    if (activeTab === 'events') {
      return feedItems.filter((item) => item.tab === 'events');
    }
    return feedItems.filter((item) => item.tab === activeTab);
  }, [feedItems, activeTab]);

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.headerTop}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bildirim Merkezi</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Tüm bildirimler tek yerde.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => {
            setRefreshing(true);
            loadRemoteData();
          }}
        >
          <Ionicons name="refresh" size={17} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        scrollEventThrottle={16}
      >
        {TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabChip,
                {
                  backgroundColor: selected ? colors.accent : colors.surface,
                  borderColor: selected ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={13} color={selected ? '#fff' : colors.textMuted} />
              <Text style={[styles.tabText, { color: selected ? '#fff' : colors.textMuted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* News Tab Category Filter */}
      {activeTab === 'news' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {NEWS_CATEGORIES.map((cat) => {
            const selected = selectedNewsCategories.has(cat);
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? colors.accent : colors.surface,
                    borderColor: selected ? colors.accent : colors.borderSubtle,
                  },
                ]}
                onPress={() => {
                  const newSet = new Set(selectedNewsCategories);
                  if (newSet.has(cat)) {
                    newSet.delete(cat);
                  } else {
                    newSet.add(cat);
                  }
                  setSelectedNewsCategories(newSet);
                }}
              >
                <Text style={[styles.categoryChipText, { color: selected ? '#fff' : colors.textMuted }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Events Tab Category Filter */}
      {activeTab === 'events' && (
        <>
          <View style={styles.citySearchBlock}>
            <Text style={[styles.citySearchLabel, { color: colors.textPrimary }]}>
              Hangi şehri istiyorsun?
            </Text>
            <View
              style={[
                styles.citySearchBox,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={citySearch}
                onChangeText={(text) => {
                  setCitySearch(text);
                  if (selectedCity && text.trim() !== selectedCity) {
                    setSelectedCity('');
                  }
                }}
                placeholder="Şehir ara"
                placeholderTextColor={colors.textMuted}
                style={[styles.cityInput, { color: colors.textPrimary }]}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {citySearch ? (
                <Pressable
                  style={styles.cityClearButton}
                  onPress={() => {
                    setCitySearch('');
                    setSelectedCity('');
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {citySuggestions.length > 0 && (
              <View
                style={[
                  styles.citySuggestionPanel,
                  { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
                ]}
              >
                {citySuggestions.map((city) => (
                  <Pressable
                    key={city}
                    style={({ pressed }) => [
                      styles.citySuggestionItem,
                      { opacity: pressed ? 0.65 : 1 },
                    ]}
                    onPress={() => {
                      setCitySearch(city);
                      setSelectedCity(city);
                    }}
                  >
                    <Ionicons name="location-outline" size={15} color={colors.accent} />
                    <Text style={[styles.citySuggestionText, { color: colors.textPrimary }]}>
                      {city}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {EVENT_CATEGORIES.map((cat) => {
              const selected = selectedEventCategories.has(cat);
              const label = EVENT_CATEGORY_LABELS[cat] || cat;
              return (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? colors.accent : colors.surface,
                      borderColor: selected ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => {
                    const newSet = new Set(selectedEventCategories);
                    if (newSet.has(cat)) {
                      newSet.delete(cat);
                    } else {
                      newSet.add(cat);
                    }
                    setSelectedEventCategories(newSet);
                  }}
                >
                  <Text style={[styles.categoryChipText, { color: selected ? '#fff' : colors.textMuted }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );

  const renderNotification = ({ item }: { item: FeedNotification }) => {
    if (item.isFriendRequest) {
      const canHandleRequest = Boolean(item.friendRequestId && item.apiId);
      const isHandling = item.friendRequestId ? handlingFriendRequest[item.friendRequestId] : false;
      return (
        <View
          style={[
            styles.notificationItem,
            {
              backgroundColor: item.unread ? item.accent + '10' : colors.surface,
              borderColor: item.unread ? item.accent + '45' : colors.borderSubtle,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.accent + '18' }]}>
            <Ionicons name={item.icon as any} size={18} color={item.accent} />
          </View>

          <View style={styles.notificationContent}>
            <View style={styles.notificationTitleRow}>
              <Text style={[styles.notificationTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.badge ? (
                <Text style={[styles.badge, { color: item.accent, backgroundColor: item.accent + '14' }]}>
                  {item.badge}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.notificationText, { color: colors.textMuted }]} numberOfLines={2}>
              {item.content}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>

          <View style={styles.friendRequestActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b981', opacity: canHandleRequest ? 1 : 0.5 }]}
              onPress={() => handleAcceptFriendRequest(item.friendRequestId!, item.apiId!)}
              disabled={isHandling || !canHandleRequest}
            >
              {isHandling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ef4444', opacity: canHandleRequest ? 1 : 0.5 }]}
              onPress={() => handleRejectFriendRequest(item.friendRequestId!, item.apiId!)}
              disabled={isHandling || !canHandleRequest}
            >
              {isHandling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="close" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: item.unread ? item.accent + '10' : colors.surface,
            borderColor: item.unread ? item.accent + '45' : colors.borderSubtle,
          },
        ]}
        onPress={item.onPress}
        activeOpacity={0.8}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.notificationImage} resizeMode="cover" />
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: item.accent + '18' }]}>
            <Ionicons name={item.icon as any} size={18} color={item.accent} />
          </View>
        )}

        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.badge ? (
              <Text style={[styles.badge, { color: item.accent, backgroundColor: item.accent + '14' }]}>
                {item.badge}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.notificationText, { color: colors.textMuted }]} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {item.apiId ? (
          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteNotification(item.apiId!)}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </TouchableOpacity>
    );
  };

  if ((loading || newsLoading) && feedItems.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredItems}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRemoteData();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu filtrede bildirim yok</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: 24,
    paddingBottom: 48,
    gap: 12,
  },
  headerBlock: {
    gap: 14,
    marginBottom: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    gap: 8,
    paddingBottom: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryRow: {
    gap: 12,
    paddingBottom: 8,
    paddingTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  citySearchBlock: {
    gap: 8,
  },
  citySearchLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  citySearchBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    outlineStyle: 'none' as any,
  },
  cityClearButton: {
    padding: 4,
  },
  citySuggestionPanel: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  citySuggestionItem: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  citySuggestionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationImage: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  notificationContent: {
    flex: 1,
    gap: 5,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  notificationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 6,
  },
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

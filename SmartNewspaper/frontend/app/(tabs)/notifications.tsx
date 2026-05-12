import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

type NotificationFilter = 'all' | 'messages' | 'upcoming' | 'news' | 'finished' | 'system';

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  content: string;
  related_article_id?: string | null;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  other_user_id: number;
  username: string;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
}

interface FeedNotification {
  id: string;
  filter: NotificationFilter;
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
}

const FILTERS: { key: NotificationFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Tümü', icon: 'albums-outline' },
  { key: 'messages', label: 'Mesajlar', icon: 'chatbubble-outline' },
  { key: 'upcoming', label: 'Yaklaşan', icon: 'calendar-outline' },
  { key: 'news', label: 'Yeni Haber', icon: 'newspaper-outline' },
  { key: 'finished', label: 'Bitenler', icon: 'checkmark-done-outline' },
  { key: 'system', label: 'Sistem', icon: 'notifications-outline' },
];

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

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { articles, loading: newsLoading } = useApiNews();
  const { followedIds, notificationEnabledIds } = usePublisherState();
  const { events } = useEvents();
  const { concerts } = useConcerts();

  const [apiNotifications, setApiNotifications] = useState<ApiNotification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const loadRemoteData = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || authToken;
    if (!token) return;

    try {
      setLoading(true);
      const [notificationsResponse, conversationsResponse] = await Promise.all([
        fetch('http://localhost:3000/api/notifications?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/messages/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        setApiNotifications(data.notifications || []);
      }

      if (conversationsResponse.ok) {
        const data = await conversationsResponse.json();
        setConversations(data.conversations || []);
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

  const feedItems = useMemo<FeedNotification[]>(() => {
    const now = Date.now();
    const twoDays = 2 * 24 * 60 * 60 * 1000;

    const systemItems: FeedNotification[] = apiNotifications.map((item) => ({
      id: `api-${item.id}`,
      filter: item.type === 'message' ? 'messages' : item.type === 'news' ? 'news' : 'system',
      icon: item.type === 'message' ? 'chatbubble' : item.type === 'news' ? 'newspaper' : 'notifications',
      accent: item.type === 'message' ? '#10b981' : item.type === 'news' ? '#3b82f6' : colors.accent,
      title: item.title,
      content: item.content,
      createdAt: item.created_at,
      unread: !item.is_read,
      badge: item.is_read ? undefined : 'Okunmadı',
      apiId: item.id,
      onPress: () => {
        if (!item.is_read) markAsRead(item.id);
        if (item.related_article_id) {
          router.push({ pathname: '/news/[id]', params: { id: item.related_article_id } });
        }
      },
    }));

    const messageItems: FeedNotification[] = conversations
      .filter((conversation) => conversation.unread_count > 0)
      .map((conversation) => ({
        id: `message-${conversation.other_user_id}`,
        filter: 'messages',
        icon: 'chatbubble-ellipses',
        accent: '#10b981',
        title: `${conversation.username} yeni mesaj gönderdi`,
        content: conversation.last_message || `${conversation.unread_count} okunmamış mesajın var.`,
        createdAt: conversation.last_message_at,
        unread: true,
        badge: `${conversation.unread_count} yeni`,
        onPress: () => {
          router.push({
            pathname: '/messages/[userId]',
            params: { userId: String(conversation.other_user_id), username: conversation.username },
          });
        },
      }));

    const mixedEvents = [
      ...events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.location,
        type: 'event' as const,
      })),
      ...concerts.map((concert) => ({
        id: concert.id,
        title: concert.title,
        date: concert.date,
        location: concert.venue || concert.location,
        type: 'concert' as const,
      })),
    ];

    const upcomingItems: FeedNotification[] = mixedEvents
      .filter((event) => new Date(event.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
      .map((event) => ({
        id: `upcoming-${event.id}`,
        filter: 'upcoming',
        icon: 'calendar',
        accent: '#8b5cf6',
        title: `Yaklaşan etkinlik: ${event.title}`,
        content: `${formatEventDate(event.date)}${event.location ? ` • ${event.location}` : ''}`,
        createdAt: event.date,
        badge: 'Yaklaşan',
        onPress: () => {
          if (event.type === 'event') {
            router.push({ pathname: '/events/[id]', params: { id: event.id } });
          } else {
            router.push({ pathname: '/events/[id]', params: { id: event.id, type: 'concert' } });
          }
        },
      }));

    const finishedItems: FeedNotification[] = mixedEvents
      .filter((event) => {
        const date = new Date(event.date).getTime();
        return date < now && now - date <= twoDays;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
      .map((event) => ({
        id: `finished-${event.id}`,
        filter: 'finished',
        icon: 'checkmark-done',
        accent: '#f59e0b',
        title: `Yeni biten etkinlik: ${event.title}`,
        content: `${formatEventDate(event.date)} tarihinde sona erdi.`,
        createdAt: event.date,
        badge: 'Bitti',
        onPress: () => {
          if (event.type === 'event') {
            router.push({ pathname: '/events/[id]', params: { id: event.id } });
          } else {
            router.push({ pathname: '/events/[id]', params: { id: event.id, type: 'concert' } });
          }
        },
      }));

    const enabledPublisherIds = new Set(
      notificationEnabledIds.filter((id) => followedIds.includes(id))
    );

    const newsItems: FeedNotification[] = articles
      .filter((article) => enabledPublisherIds.has(getPublisherIdFromSourceName(article.source.name)))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 12)
      .map((article) => ({
        id: `news-${article.id}`,
        filter: 'news',
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

    return [...messageItems, ...upcomingItems, ...newsItems, ...finishedItems, ...systemItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [apiNotifications, articles, colors.accent, conversations, concerts, events, followedIds, notificationEnabledIds, router]);

  const filteredItems = activeFilter === 'all'
    ? feedItems
    : feedItems.filter((item) => item.filter === activeFilter);

  const unreadMessages = conversations.reduce((total, item) => total + (item.unread_count || 0), 0);
  const upcomingCount = feedItems.filter((item) => item.filter === 'upcoming').length;
  const finishedCount = feedItems.filter((item) => item.filter === 'finished').length;
  const latestNewsCount = feedItems.filter((item) => item.filter === 'news').length;

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <View style={styles.headerTop}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bildirim Merkezi</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Mesajlar, etkinlikler ve yeni haberler tek yerde.
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

      <View style={styles.summaryGrid}>
        <SummaryCard label="Okunmamış Mesaj" value={unreadMessages} icon="chatbubble" accent="#10b981" colors={colors} />
        <SummaryCard label="Yaklaşan Etkinlik" value={upcomingCount} icon="calendar" accent="#8b5cf6" colors={colors} />
        <SummaryCard label="Yeni Haber" value={latestNewsCount} icon="newspaper" accent="#3b82f6" colors={colors} />
        <SummaryCard label="Yeni Biten" value={finishedCount} icon="checkmark-done" accent="#f59e0b" colors={colors} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.accent : colors.surface,
                  borderColor: selected ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Ionicons name={filter.icon as any} size={13} color={selected ? '#fff' : colors.textMuted} />
              <Text style={[styles.filterText, { color: selected ? '#fff' : colors.textMuted }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderNotification = ({ item }: { item: FeedNotification }) => (
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

function SummaryCard({
  label,
  value,
  icon,
  accent,
  colors,
}: {
  label: string;
  value: number;
  icon: string;
  accent: string;
  colors: any;
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
      <View style={[styles.summaryIcon, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon as any} size={16} color={accent} />
      </View>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
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
    gap: 18,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
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

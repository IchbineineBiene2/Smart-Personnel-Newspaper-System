import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

interface Conversation {
  other_user_id: number;
  username: string;
  email: string;
  last_sender_id?: number;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
}

const ARTICLE_SHARE_PREFIX = 'SPN_ARTICLE_SHARE:';

function getMessagePreview(content?: string): string {
  if (!content) return '';
  if (!content.startsWith(ARTICLE_SHARE_PREFIX)) return content;

  try {
    const article = JSON.parse(content.slice(ARTICLE_SHARE_PREFIX.length));
    return article?.title ? `Haber: ${article.title}` : 'Haber paylasildi';
  } catch {
    return 'Haber paylasildi';
  }
}

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string>('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const loadConversations = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/messages/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadToken = async () => {
      try {
        const authModule = require('@/services/auth');
        const storedToken = await authModule.getToken?.();
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };

    loadToken();
  }, []);

  useEffect(() => {
    if (token) {
      loadConversations();
      const interval = setInterval(loadConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const openConversation = (userId: number, username: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    router.push({
      pathname: '/messages/[userId]',
      params: { userId: userId.toString(), username },
    });
  };

  const searchUsers = async (query: string) => {
    const trimmed = query.trim();
    if (!token || trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `http://localhost:3000/api/contacts/search?q=${encodeURIComponent(trimmed)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const toggleSearch = () => {
    setSearchOpen((current) => {
      const next = !current;
      if (!next) {
        setSearchQuery('');
        setSearchResults([]);
      }
      return next;
    });
  };

  const renderAvatar = (username: string) => (
    <View style={[styles.avatar, { backgroundColor: colors.accent + '30' }]}>
      <Text style={[styles.avatarText, { color: colors.accent }]}>
        {username[0]?.toUpperCase() || '?'}
      </Text>
    </View>
  );

  const renderConversation = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnread && { backgroundColor: colors.accent + '10' },
          { borderBottomColor: colors.borderSubtle },
        ]}
        onPress={() => openConversation(item.other_user_id, item.username)}
      >
        {renderAvatar(item.username)}

        <View style={styles.conversationContent}>
          <Text
            style={[
              styles.username,
              hasUnread && styles.unreadText,
              { color: colors.textPrimary },
            ]}
          >
            {item.username}
          </Text>
          <Text
            style={[
              styles.lastMessage,
              hasUnread && styles.unreadText,
              { color: hasUnread ? colors.textPrimary : colors.textMuted },
            ]}
            numberOfLines={1}
          >
            {getMessagePreview(item.last_message) || item.email}
          </Text>
        </View>

        <View style={styles.conversationRight}>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {new Date(item.last_message_at).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: colors.accent }]}>
              <Text style={styles.badgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserResult = (item: UserProfile) => (
    <TouchableOpacity
      key={item.id.toString()}
      style={[styles.conversationItem, { borderBottomColor: colors.borderSubtle }]}
      onPress={() => openConversation(item.id, item.username)}
    >
      {renderAvatar(item.username)}

      <View style={styles.conversationContent}>
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          {item.username}
        </Text>
        <Text style={[styles.lastMessage, { color: colors.textMuted }]} numberOfLines={1}>
          {item.email}
        </Text>
      </View>

      <View style={[styles.startChatPill, { backgroundColor: colors.accent + '1A' }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accent} />
        <Text style={[styles.startChatText, { color: colors.accent }]}>Mesaj</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSearchPanel = () => {
    if (!searchOpen) return null;

    const canShowResults = searchQuery.trim().length >= 2;

    return (
      <View style={[styles.searchPanel, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.searchContainer, { borderColor: colors.borderSubtle }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Yeni sohbet icin kisi ara..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>

        {searching ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 12 }} />
        ) : canShowResults ? (
          <View style={[styles.searchResultsBox, { borderColor: colors.borderSubtle }]}>
            {searchResults.length > 0 ? (
              searchResults.map(renderUserResult)
            ) : (
              <Text style={[styles.searchEmptyText, { color: colors.textMuted }]}>
                Kullanici bulunamadi
              </Text>
            )}
          </View>
        ) : (
          <Text style={[styles.searchHint, { color: colors.textMuted }]}>
            En az 2 harf yazarak hesap arayabilirsiniz.
          </Text>
        )}
      </View>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Mesajlar</Text>
        <TouchableOpacity
          style={[styles.headerAction, { backgroundColor: colors.accent + '1A' }]}
          onPress={toggleSearch}
        >
          <Ionicons name={searchOpen ? 'close' : 'create'} size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.other_user_id.toString()}
        ListHeaderComponent={renderSearchPanel}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadConversations();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Henuz sohbetiniz yok
            </Text>
            <TouchableOpacity
              style={[styles.newChatButton, { backgroundColor: colors.accent }]}
              onPress={() => setSearchOpen(true)}
            >
              <Text style={styles.newChatButtonText}>Yeni Sohbet Baslat</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPanel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  searchResultsBox: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  searchHint: {
    fontSize: 12,
    marginTop: 8,
  },
  searchEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
  },
  unreadText: {
    fontWeight: '800',
  },
  conversationRight: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  newChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  startChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  startChatText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

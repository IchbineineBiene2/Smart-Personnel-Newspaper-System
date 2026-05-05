import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface Conversation {
  other_user_id: number;
  username: string;
  email: string;
  last_message_at: string;
  unread_count: number;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = async () => {
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
    // Load token from storage
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
    router.push({
      pathname: '/messages/[userId]',
      params: { userId: userId.toString(), username },
    });
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        { borderBottomColor: colors.borderSubtle },
      ]}
      onPress={() => openConversation(item.other_user_id, item.username)}
    >
      <View
        style={[
          styles.avatar,
          { backgroundColor: colors.accent + '30' },
        ]}
      >
        <Text
          style={[
            styles.avatarText,
            { color: colors.accent },
          ]}
        >
          {item.username[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.conversationContent}>
        <Text
          style={[
            styles.username,
            { color: colors.textPrimary },
          ]}
        >
          {item.username}
        </Text>
        <Text
          style={[
            styles.lastMessage,
            { color: colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {item.email}
        </Text>
      </View>

      <View style={styles.conversationRight}>
        <Text
          style={[
            styles.timestamp,
            { color: colors.textMuted },
          ]}
        >
          {new Date(item.last_message_at).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {item.unread_count > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>{item.unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    // Search could filter conversations or open profile search
    if (text.length >= 2) {
      router.push({
        pathname: '/profile-search',
        params: { query: text },
      });
    }
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
        <TouchableOpacity onPress={() => router.push('/profile-search')}>
          <Ionicons name="create" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[
            styles.searchInput,
            { color: colors.textPrimary, borderColor: colors.borderSubtle },
          ]}
          placeholder="Kişi ara..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.other_user_id.toString()}
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
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Henüz sohbetiniz yok
            </Text>
            <TouchableOpacity
              style={[styles.newChatButton, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/profile-search')}
            >
              <Text style={styles.newChatButtonText}>Yeni Sohbet Başlat</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
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
});

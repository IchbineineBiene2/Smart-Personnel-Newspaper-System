import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
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
  full_name?: string;
  email: string;
  last_sender_id?: number;
  last_message?: string;
  last_message_at: string;
  unread_count: number;
}

interface UserProfile {
  id: number;
  username: string;
  full_name?: string;
  email: string;
}

interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

interface SharedArticle {
  id?: string;
  title: string;
  summary?: string;
  imageUrl?: string;
  source?: string;
  publishedAt?: string;
  category?: string;
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

function parseSharedArticle(content: string): SharedArticle | null {
  if (!content.startsWith(ARTICLE_SHARE_PREFIX)) return null;

  try {
    const article = JSON.parse(content.slice(ARTICLE_SHARE_PREFIX.length));
    if (!article?.title) return null;
    return article as SharedArticle;
  } catch {
    return null;
  }
}

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messageRequests, setMessageRequests] = useState<Conversation[]>([]);
  const [activeMessageTab, setActiveMessageTab] = useState<'chats' | 'requests'>('chats');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRequestId = useRef(0);
  const [selectedConversation, setSelectedConversation] = useState<{ userId: number; username: string } | null>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);

  // Responsive detection for split-view
  const isWeb = Platform.OS === 'web';

  // Get initial width - use window.innerWidth for web, Dimensions for native
  const getInitialWidth = () => {
    if (isWeb && typeof window !== 'undefined') {
      return true;
    }
    const w = Dimensions.get('window').width;
    return w >= 1024;
  };

  const [isWide, setIsWide] = useState(getInitialWidth());

  useEffect(() => {
    if (!isWeb) return;

    const handleResize = () => {
      setIsWide(true);
    };

    // Use window resize for web platform
    window.addEventListener('resize', handleResize);

    // Also check on initial mount
    setIsWide(true);

    return () => window.removeEventListener('resize', handleResize);
  }, [isWeb]);

  const loadConversations = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [conversationsResponse, requestsResponse] = await Promise.all([
        fetch('http://localhost:3000/api/messages/conversations', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch('http://localhost:3000/api/messages/requests', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (conversationsResponse.ok) {
        const data = await conversationsResponse.json();
        setConversations(data.conversations || []);
      }

      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        setMessageRequests(data.requests || []);
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
        const user = await authModule.getCurrentUser?.();
        if (storedToken) {
          setToken(storedToken);
          if (user) {
            setCurrentUserId(user.userId);
          }
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

  const loadMessages = async (conversation = selectedConversation) => {
    if (!token || !conversation) return;

    try {
      setMessagesLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/messages/${conversation.userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !selectedConversation) return;

    setMessages([]);
    setNewMessage('');
    loadMessages(selectedConversation);
    const interval = setInterval(() => loadMessages(selectedConversation), 3000);
    return () => clearInterval(interval);
  }, [token, selectedConversation?.userId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const response = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_id: selectedConversation.userId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((current) => [...current, data.message]);
        setNewMessage('');
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const acceptMessageRequest = async (userId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3000/api/messages/requests/${userId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setActiveMessageTab('chats');
        loadConversations();
        loadMessages({ userId, username: selectedConversation?.username || '' });
      }
    } catch (error) {
      console.error('Error accepting message request:', error);
    }
  };

  const rejectMessageRequest = async (userId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3000/api/messages/requests/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSelectedConversation(null);
        setMessages([]);
        loadConversations();
      }
    } catch (error) {
      console.error('Error rejecting message request:', error);
    }
  };

  const openConversation = (userId: number, username: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setConversationMenuOpen(false);

    if (isWide) {
      // Web split-view: set selected conversation
      setSelectedConversation({ userId, username });
    } else {
      // Mobile: navigate to detail page
      router.push({
        pathname: '/messages/[userId]',
        params: { userId: userId.toString(), username },
      });
    }
  };

  const searchUsers = async (query: string) => {
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    const trimmed = query.trim();
    if (!token || trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
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

      if (requestId !== searchRequestId.current) return;

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      if (requestId !== searchRequestId.current) return;
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      if (requestId === searchRequestId.current) {
        setSearching(false);
      }
    }
  };

  const restrictConversation = async () => {
    if (!token || !selectedConversation) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/messages/requests/${selectedConversation.userId}/restrict`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setConversationMenuOpen(false);
        setActiveMessageTab('requests');
        loadConversations();
      } else {
        const data = await response.json().catch(() => null);
        Alert.alert('Kisitlanamadi', data?.error || 'Bu sohbet kisitlanamadi.');
      }
    } catch (error) {
      console.error('Error restricting conversation:', error);
      Alert.alert('Kisitlanamadi', 'Bu sohbet kisitlanamadi.');
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  useEffect(() => {
    if (!searchOpen) {
      searchRequestId.current += 1;
      setSearching(false);
      return;
    }

    const timeout = setTimeout(() => {
      searchUsers(searchQuery);
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery, searchOpen, token]);

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

  const openUserProfile = (userId: number, username: string) => {
    router.push({
      pathname: '/profile/[userId]',
      params: { userId: userId.toString(), username },
    } as any);
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;
    const isSelected = selectedConversation?.userId === item.other_user_id;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          hasUnread && { backgroundColor: colors.accent + '10' },
          isSelected && { backgroundColor: colors.accent + '20' },
          { borderBottomColor: colors.borderSubtle },
        ]}
        onPress={() => openConversation(item.other_user_id, item.username)}
      >
        <TouchableOpacity onPress={() => openUserProfile(item.other_user_id, item.username)}>
          {renderAvatar(item.username)}
        </TouchableOpacity>

        <View style={styles.conversationContent}>
          <Text
            style={[
              styles.username,
              hasUnread && styles.unreadText,
              { color: colors.textPrimary },
            ]}
          >
            {item.full_name || item.username}
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
          {item.full_name || item.username}
        </Text>
        <Text style={[styles.lastMessage, { color: colors.textMuted }]} numberOfLines={1}>
          @{item.username} · {item.email}
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

  const renderChatMessage = ({ item }: { item: Message }) => {
    const isSent = item.sender_id === currentUserId;
    const sharedArticle = parseSharedArticle(item.content);
    const lastSentReadMessageId = [...messages]
      .reverse()
      .find((message) => message.sender_id === currentUserId && message.is_read)?.id;
    const showSeen = isSent && item.is_read && item.id === lastSentReadMessageId;

    const openSharedArticle = () => {
      if (!sharedArticle?.id) return;

      router.push({
        pathname: '/news/[id]',
        params: {
          id: sharedArticle.id,
          title: sharedArticle.title,
          summary: sharedArticle.summary,
          imageUrl: sharedArticle.imageUrl,
          source: sharedArticle.source,
          publishedAt: sharedArticle.publishedAt,
          category: sharedArticle.category,
        },
      });
    };

    return (
      <View style={[styles.messageWrap, isSent ? styles.sentWrap : styles.receivedWrap]}>
        <View
          style={[
            styles.messageBubble,
            sharedArticle && styles.articleBubble,
            isSent
              ? { backgroundColor: colors.accent }
              : { backgroundColor: colors.surfaceHigh },
          ]}
        >
          {sharedArticle ? (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={openSharedArticle}
              disabled={!sharedArticle.id}
              style={[
                styles.articleCard,
                {
                  backgroundColor: isSent ? 'rgba(255,255,255,0.14)' : colors.surface,
                  borderColor: isSent ? 'rgba(255,255,255,0.22)' : colors.borderSubtle,
                },
              ]}
            >
              {sharedArticle.imageUrl ? (
                <Image
                  source={{ uri: sharedArticle.imageUrl }}
                  style={styles.articleImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.articleImagePlaceholder,
                    { backgroundColor: isSent ? 'rgba(255,255,255,0.12)' : colors.surfaceInput },
                  ]}
                >
                  <Ionicons
                    name="newspaper-outline"
                    size={24}
                    color={isSent ? '#fff' : colors.accent}
                  />
                </View>
              )}

              <View style={styles.articleContent}>
                <View style={styles.articleMetaRow}>
                  <Text
                    style={[
                      styles.articleMeta,
                      { color: isSent ? 'rgba(255,255,255,0.78)' : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {sharedArticle.source || 'Haber'}
                  </Text>
                  {sharedArticle.category ? (
                    <Text
                      style={[
                        styles.articleCategory,
                        { color: isSent ? '#fff' : colors.accent },
                      ]}
                      numberOfLines={1}
                    >
                      {sharedArticle.category}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.articleTitle,
                    { color: isSent ? '#fff' : colors.textPrimary },
                  ]}
                  numberOfLines={2}
                >
                  {sharedArticle.title}
                </Text>
                {sharedArticle.summary ? (
                  <Text
                    style={[
                      styles.articleSummary,
                      { color: isSent ? 'rgba(255,255,255,0.82)' : colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {sharedArticle.summary}
                  </Text>
                ) : null}
                <View style={styles.articleOpenRow}>
                  <Text
                    style={[
                      styles.articleOpenText,
                      { color: isSent ? '#fff' : colors.accent },
                    ]}
                  >
                    Haberi ac
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={isSent ? '#fff' : colors.accent}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <Text
              style={[
                styles.messageText,
                { color: isSent ? '#fff' : colors.textPrimary },
              ]}
            >
              {item.content}
            </Text>
          )}
          <Text
            style={[
              styles.messageTime,
              { color: isSent ? 'rgba(255,255,255,0.7)' : colors.textMuted },
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {showSeen ? (
          <Text style={[styles.seenText, { color: colors.textMuted }]}>
            Goruldu {new Date(item.updated_at || item.created_at).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderMessageTabs = () => (
    <View style={[styles.messageTabs, { borderBottomColor: colors.borderSubtle }]}>
      {([
        { key: 'chats' as const, label: 'Sohbetler', count: conversations.length },
        { key: 'requests' as const, label: 'Mesaj Istekleri', count: messageRequests.length },
      ]).map((tab) => {
        const selected = activeMessageTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.messageTab,
              {
                backgroundColor: selected ? colors.accent : colors.surface,
                borderColor: selected ? colors.accent : colors.borderSubtle,
              },
            ]}
            onPress={() => {
              setActiveMessageTab(tab.key);
              setSelectedConversation(null);
              setMessages([]);
            }}
          >
            <Text style={[styles.messageTabText, { color: selected ? '#fff' : colors.textMuted }]}>
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <View style={[styles.messageTabBadge, { backgroundColor: selected ? '#fff' : colors.accent }]}>
                <Text style={[styles.messageTabBadgeText, { color: selected ? colors.accent : '#fff' }]}>
                  {tab.count}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderChatDetail = () => {
    const isViewingRequest = activeMessageTab === 'requests';

    if (!selectedConversation) {
      return (
        <View style={[styles.detailEmpty, { backgroundColor: colors.background }]}>
          <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.detailEmptyText, { color: colors.textMuted }]}>
            Sohbet seciniz
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.detailHeader, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => openUserProfile(selectedConversation.userId, selectedConversation.username)}
          >
            <Text style={[styles.detailUsername, { color: colors.textPrimary }]}>
              {selectedConversation.username}
            </Text>
            <Text style={[styles.detailSubtitle, { color: colors.textMuted }]}>
              Cevrimici
            </Text>
          </TouchableOpacity>
          {!isViewingRequest ? (
            <View style={styles.conversationMenuWrap}>
              <TouchableOpacity
                style={[styles.conversationMenuButton, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}
                onPress={() => setConversationMenuOpen((current) => !current)}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {conversationMenuOpen ? (
                <View style={[styles.conversationMenu, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity style={styles.conversationMenuItem} onPress={restrictConversation}>
                    <Ionicons name="ban-outline" size={16} color="#ef4444" />
                    <Text style={styles.conversationMenuDangerText}>Kisitla</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {isViewingRequest ? (
          <View style={[styles.requestActions, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.requestActionButton, { backgroundColor: colors.accent }]}
              onPress={() => acceptMessageRequest(selectedConversation.userId)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.requestActionText}>Kabul Et</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.requestActionButton, styles.rejectRequestButton]}
              onPress={() => rejectMessageRequest(selectedConversation.userId)}
            >
              <Ionicons name="close" size={16} color="#fff" />
              <Text style={styles.requestActionText}>Sil</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Messages area */}
        {messagesLoading && messages.length === 0 ? (
          <View style={styles.detailLoading}>
            <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
              {selectedConversation.username} ile konuşma yükleniyor...
            </Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            renderItem={renderChatMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
          />
        )}

        {isViewingRequest ? (
          <View style={[styles.requestHint, { borderTopColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <Text style={[styles.requestHintText, { color: colors.textMuted }]}>
              Konusmaya baslamak icin mesaj istegini kabul et.
            </Text>
          </View>
        ) : (
          <View style={[styles.inputArea, { borderTopColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.messageInput, { color: colors.textPrimary, borderColor: colors.borderSubtle }]}
              placeholder="Mesaj yaz..."
              placeholderTextColor={colors.textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors.accent, opacity: sending || !newMessage.trim() ? 0.6 : 1 },
              ]}
              onPress={sendMessage}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
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

  // Web split-view layout
  if (isWide) {
    return (
      <View style={[styles.splitContainer, { backgroundColor: colors.background }]}>
        {/* Left panel: Conversations list */}
        <View style={[styles.splitLeft, { borderRightColor: colors.borderSubtle }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Mesajlar</Text>
            <TouchableOpacity
              style={[styles.headerAction, { backgroundColor: colors.accent + '1A' }]}
              onPress={toggleSearch}
            >
              <Ionicons name={searchOpen ? 'close' : 'create'} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {renderMessageTabs()}
          {renderSearchPanel()}

          <FlatList
            data={activeMessageTab === 'chats' ? conversations : messageRequests}
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
                <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {activeMessageTab === 'chats' ? 'Henuz sohbetiniz yok' : 'Mesaj isteginiz yok'}
                </Text>
                {activeMessageTab === 'chats' ? (
                  <TouchableOpacity
                    style={[styles.newChatButton, { backgroundColor: colors.accent }]}
                    onPress={() => setSearchOpen(true)}
                  >
                    <Text style={styles.newChatButtonText}>Yeni Sohbet Baslat</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />
        </View>

        {/* Right panel: Chat detail */}
        <View style={styles.splitRight}>
          {renderChatDetail()}
        </View>
      </View>
    );
  }

  // Mobile layout - normal single column
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

      {renderMessageTabs()}
      {renderSearchPanel()}

      <FlatList
        data={activeMessageTab === 'chats' ? conversations : messageRequests}
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
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {activeMessageTab === 'chats' ? 'Henuz sohbetiniz yok' : 'Mesaj isteginiz yok'}
            </Text>
            {activeMessageTab === 'chats' ? (
              <TouchableOpacity
                style={[styles.newChatButton, { backgroundColor: colors.accent }]}
                onPress={() => setSearchOpen(true)}
              >
                <Text style={styles.newChatButtonText}>Yeni Sohbet Baslat</Text>
              </TouchableOpacity>
            ) : null}
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
  messageTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  messageTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  messageTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  messageTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  messageTabBadgeText: {
    fontSize: 10,
    fontWeight: '900',
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
  // Split view styles
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitLeft: {
    flex: 0,
    width: 320,
    minWidth: 320,
    maxWidth: 320,
    borderRightWidth: 1,
  },
  splitRight: {
    flex: 1,
    minWidth: 0,
  },
  detailContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 30,
  },
  detailBack: {
    marginRight: 12,
    padding: 4,
  },
  detailUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  conversationMenuWrap: {
    position: 'relative',
    alignItems: 'flex-end',
    zIndex: 40,
  },
  conversationMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationMenu: {
    position: 'absolute',
    top: 42,
    right: 0,
    minWidth: 132,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    zIndex: 60,
    elevation: 12,
  },
  conversationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  conversationMenuDangerText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800',
  },
  detailEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailEmptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  messagesArea: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  placeholderMessage: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 14,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  requestActionButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rejectRequestButton: {
    backgroundColor: '#ef4444',
  },
  requestActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  requestHint: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  requestHintText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageWrap: {
    maxWidth: '80%',
    marginVertical: 4,
  },
  sentWrap: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  receivedWrap: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  articleBubble: {
    width: '78%',
    maxWidth: 360,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 14,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  seenText: {
    fontSize: 11,
    marginTop: 3,
    marginRight: 4,
    fontWeight: '600',
    textAlign: 'right',
  },
  articleCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  articleImage: {
    width: '100%',
    height: 128,
  },
  articleImagePlaceholder: {
    width: '100%',
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleContent: {
    padding: 10,
    gap: 6,
  },
  articleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  articleMeta: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },
  articleCategory: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  articleTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  articleSummary: {
    fontSize: 12,
    lineHeight: 17,
  },
  articleOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginTop: 2,
  },
  articleOpenText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

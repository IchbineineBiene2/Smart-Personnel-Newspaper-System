import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

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
  url?: string;
  publishedAt?: string;
  category?: string;
}

const ARTICLE_SHARE_PREFIX = 'SPN_ARTICLE_SHARE:';

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

export default function MessageDetailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId, username } = useLocalSearchParams<{
    userId: string;
    username: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [token, setToken] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  const loadMessages = async () => {
    if (!userId || !token) return;
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/messages/${userId}`,
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
      setLoading(false);
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
        console.error('Error loading auth:', error);
      }
    };

    loadToken();
  }, []);

  useEffect(() => {
    if (token && userId) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [token, userId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;

    try {
      setSending(true);
      const response = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipient_id: parseInt(userId),
          content: newMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([...messages, data.message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
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
          url: sharedArticle.url,
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
                  Haberi aç
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

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() =>
            router.push({
              pathname: '/profile/[userId]',
              params: { userId, username },
            } as any)
          }
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {username}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Çevrimiçi
          </Text>
        </TouchableOpacity>
        <Ionicons name="ellipsis-vertical" size={24} color={colors.textMuted} />
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
      />

      <View
        style={[
          styles.inputContainer,
          { borderTopColor: colors.borderSubtle },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surfaceInput,
              maxHeight: 100,
            },
          ]}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
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
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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

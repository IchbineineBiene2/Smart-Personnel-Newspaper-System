import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { mapToContentCategory } from '@/services/newsApi';
import type { ApiArticle } from '@/services/newsApi';

const ARTICLE_SHARE_PREFIX = 'SPN_ARTICLE_SHARE:';

interface Friend {
  friend_id: number;
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
}

export interface SocialSidebarProps {
  token: string;
  currentUserId: number;
  draggedArticle: ApiArticle | null;
  onClearDrag: () => void;
}

// Simulated presence — real presence needs WebSocket
function isOnline(userId: number) {
  return userId % 3 !== 0;
}

const AVATAR_PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
function avatarColor(id: number) {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length];
}

export function SocialSidebar({ token, currentUserId, draggedArticle, onClearDrag }: SocialSidebarProps) {
  const { colors } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [shareSuccess, setShareSuccess] = useState<number | null>(null);
  const [miniChat, setMiniChat] = useState<{ userId: number; username: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('http://localhost:3000/api/friends', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setFriends(data.friends || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !miniChat) {
      setMessages([]);
      return;
    }
    const load = () =>
      fetch(`http://localhost:3000/api/messages/${miniChat.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setMessages(data.messages || []);
          setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
        })
        .catch(() => {});
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [token, miniChat?.userId]);

  const sendArticle = async (userId: number, article: ApiArticle) => {
    if (!token) return;
    const cat = mapToContentCategory(article.category, article.title, article.description);
    const payload = {
      id: article.id,
      title: article.title,
      summary: article.description,
      imageUrl: article.imageUrl,
      source: article.source.name,
      url: article.url,
      publishedAt: article.publishedAt,
      category: cat,
    };
    await fetch('http://localhost:3000/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        recipient_id: userId,
        content: `${ARTICLE_SHARE_PREFIX}${JSON.stringify(payload)}`,
      }),
    }).catch(() => {});
    setShareSuccess(userId);
    setTimeout(() => setShareSuccess(null), 2200);
    onClearDrag();
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !miniChat || !token) return;
    setSending(true);
    try {
      const r = await fetch('http://localhost:3000/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient_id: miniChat.userId, content: chatInput.trim() }),
      });
      if (r.ok) {
        const data = await r.json();
        setMessages((prev) => [...prev, data.message]);
        setChatInput('');
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
      }
    } catch {}
    setSending(false);
  };

  const online = friends.filter((f) => isOnline(f.friend_id));
  const offline = friends.filter((f) => !isOnline(f.friend_id));
  const sorted = [...online, ...offline];

  return (
    <View style={[styles.sidebar, { borderLeftColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Ionicons name="people" size={15} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Arkadaşlar</Text>
        {online.length > 0 && (
          <View style={[styles.onlinePill, { backgroundColor: '#10b98120' }]}>
            <View style={styles.onlineDotTiny} />
            <Text style={styles.onlinePillText}>{online.length}</Text>
          </View>
        )}
      </View>

      {/* ── Drag hint banner ── */}
      {draggedArticle && (
        <View style={[styles.dragBanner, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '44' }]}>
          <Ionicons name="share-social-outline" size={12} color={colors.accent} />
          <Text style={[styles.dragBannerText, { color: colors.accent }]} numberOfLines={1}>
            Göndermek için arkadaşına tıkla
          </Text>
          <TouchableOpacity onPress={onClearDrag} hitSlop={8}>
            <Ionicons name="close" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Friends list ── */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={30} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz arkadaşın yok</Text>
          </View>
        ) : (
          sorted.map((f) => (
            <FriendRow
              key={f.friend_id}
              friend={f}
              online={isOnline(f.friend_id)}
              isDragging={!!draggedArticle}
              isDragOver={dropTarget === f.friend_id}
              didShare={shareSuccess === f.friend_id}
              isSelected={miniChat?.userId === f.friend_id}
              colors={colors}
              onPress={() =>
                setMiniChat(miniChat?.userId === f.friend_id ? null : { userId: f.friend_id, username: f.username })
              }
              onDragOver={() => setDropTarget(f.friend_id)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={() => {
                setDropTarget(null);
                if (draggedArticle) sendArticle(f.friend_id, draggedArticle);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* ── Mini chat overlay (absolute, covers sidebar) ── */}
      {miniChat && (
        <View style={[styles.chatOverlay, { backgroundColor: colors.background, borderColor: colors.borderSubtle }]}>
          {/* Chat header */}
          <View style={[styles.chatHeader, { borderBottomColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.chatBackBtn} onPress={() => setMiniChat(null)}>
              <Ionicons name="chevron-back" size={16} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chatName, { color: colors.textPrimary }]} numberOfLines={1}>
                {friends.find((f) => f.friend_id === miniChat.userId)?.full_name || miniChat.username}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: isOnline(miniChat.userId) ? '#10b981' : colors.textMuted }}>
                {isOnline(miniChat.userId) ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceHigh }]}
              onPress={() => setMiniChat(null)}
            >
              <Ionicons name="close" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id.toString()}
            style={{ flex: 1 }}
            contentContainerStyle={styles.msgListContent}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz mesaj yok</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSent = item.sender_id === currentUserId;
              const isArticle = item.content.startsWith(ARTICLE_SHARE_PREFIX);
              let articleTitle = '';
              if (isArticle) {
                try {
                  articleTitle = JSON.parse(item.content.slice(ARTICLE_SHARE_PREFIX.length))?.title || 'Haber';
                } catch {}
              }
              return (
                <View style={[styles.msgRow, isSent ? styles.msgSent : styles.msgReceived]}>
                  <View
                    style={[
                      styles.msgBubble,
                      isSent ? { backgroundColor: colors.accent } : { backgroundColor: colors.surfaceHigh },
                    ]}
                  >
                    {isArticle ? (
                      <View style={styles.articleShareRow}>
                        <Ionicons
                          name="newspaper-outline"
                          size={11}
                          color={isSent ? 'rgba(255,255,255,0.75)' : colors.textMuted}
                        />
                        <Text
                          style={[styles.articleShareTitle, { color: isSent ? '#fff' : colors.textPrimary }]}
                          numberOfLines={2}
                        >
                          {articleTitle}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.msgText, { color: isSent ? '#fff' : colors.textPrimary }]}>
                        {item.content}
                      </Text>
                    )}
                    <Text style={[styles.msgTime, { color: isSent ? 'rgba(255,255,255,0.55)' : colors.textMuted }]}>
                      {new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Input row */}
          <View style={[styles.inputRow, { borderTopColor: colors.borderSubtle, backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle }]}
              placeholder="Mesaj yaz..."
              placeholderTextColor={colors.textMuted}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.accent, opacity: sending || !chatInput.trim() ? 0.45 : 1 }]}
              onPress={sendMessage}
              disabled={sending || !chatInput.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={13} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── FriendRow ─────────────────────────────────────────────────────────────────

function FriendRow({
  friend, online, isDragging, isDragOver, didShare, isSelected, colors,
  onPress, onDragOver, onDragLeave, onDrop,
}: {
  friend: Friend;
  online: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  didShare: boolean;
  isSelected: boolean;
  colors: any;
  onPress: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  const rowRef = useRef<any>(null);

  // Keep latest callbacks in refs so DOM listeners never go stale
  const isDraggingRef = useRef(isDragging);
  const onPressRef = useRef(onPress);
  const onDragOverRef = useRef(onDragOver);
  const onDragLeaveRef = useRef(onDragLeave);
  const onDropRef = useRef(onDrop);
  isDraggingRef.current = isDragging;
  onPressRef.current = onPress;
  onDragOverRef.current = onDragOver;
  onDragLeaveRef.current = onDragLeave;
  onDropRef.current = onDrop;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el: HTMLElement | null = rowRef.current;
    if (!el) return;

    const dragover = (e: Event) => { e.preventDefault(); onDragOverRef.current(); };
    const dragleave = () => onDragLeaveRef.current();
    const drop = (e: Event) => { e.preventDefault(); onDropRef.current(); };
    // Click: share article if in drag/share mode, otherwise open chat
    const click = () => (isDraggingRef.current ? onDropRef.current() : onPressRef.current());

    el.addEventListener('dragover', dragover);
    el.addEventListener('dragleave', dragleave);
    el.addEventListener('drop', drop);
    el.addEventListener('click', click);

    return () => {
      el.removeEventListener('dragover', dragover);
      el.removeEventListener('dragleave', dragleave);
      el.removeEventListener('drop', drop);
      el.removeEventListener('click', click);
    };
  }, []); // mount/unmount only; callbacks are stable via refs above

  const color = avatarColor(friend.friend_id);
  const initials = (friend.full_name || friend.username).slice(0, 2).toUpperCase();

  const rowStyle: any[] = [
    styles.friendRow,
    isDragOver && { backgroundColor: colors.accent + '28', borderColor: colors.accent + '70' },
    isSelected && !isDragOver && { backgroundColor: colors.accent + '14', borderColor: colors.accent + '30' },
    !isDragOver && !isSelected && { borderColor: 'transparent' },
  ];

  const inner = (
    <>
      <View style={[styles.avatar, { backgroundColor: color + '28' }]}>
        <Text style={[styles.avatarText, { color }]}>{initials}</Text>
        <View
          style={[
            styles.onlineDot,
            { backgroundColor: online ? '#10b981' : '#9ca3af', borderColor: colors.surface },
          ]}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.friendName, { color: colors.textPrimary }]} numberOfLines={1}>
          {friend.full_name || friend.username}
        </Text>
        <Text style={[styles.friendStatus, { color: online ? '#10b981' : colors.textMuted }]}>
          {online ? 'Çevrimiçi' : 'Çevrimdışı'}
        </Text>
      </View>
      {didShare ? (
        <View style={[styles.sharedPill, { backgroundColor: '#10b98122' }]}>
          <Ionicons name="checkmark" size={10} color="#10b981" />
          <Text style={[styles.sharedText, { color: '#10b981' }]}>Gönderildi</Text>
        </View>
      ) : isDragging ? (
        <View style={[styles.dropZone, isDragOver && { backgroundColor: colors.accent + '18' }]}>
          {isDragOver ? (
            <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
          ) : (
            <Ionicons name="arrow-redo-outline" size={13} color={colors.textMuted} />
          )}
        </View>
      ) : null}
    </>
  );

  if (Platform.OS !== 'web') {
    return (
      <TouchableOpacity ref={rowRef} style={rowStyle} onPress={onPress} activeOpacity={0.75}>
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View ref={rowRef} style={rowStyle}>
      {inner}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    borderLeftWidth: 1,
    flexDirection: 'column',
    overflow: 'visible' as any,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  onlineDotTiny: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  onlinePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
  dragBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dragBannerText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 9,
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 2,
    borderWidth: 1,
    cursor: 'pointer' as any,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '900',
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
  },
  friendName: {
    fontSize: 12,
    fontWeight: '700',
  },
  friendStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  dropZone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sharedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  sharedText: {
    fontSize: 9,
    fontWeight: '800',
  },
  // Mini chat overlay
  chatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    flexDirection: 'column',
    zIndex: 50,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 6,
  },
  chatBackBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chatName: {
    fontSize: 13,
    fontWeight: '800',
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgListContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  msgRow: {
    marginVertical: 2,
  },
  msgSent: {
    alignItems: 'flex-end',
  },
  msgReceived: {
    alignItems: 'flex-start',
  },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    gap: 2,
  },
  articleShareRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  articleShareTitle: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    flex: 1,
  },
  msgText: {
    fontSize: 12,
    lineHeight: 17,
  },
  msgTime: {
    fontSize: 9,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginTop: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

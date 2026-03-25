import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

type ChatRole = 'assistant' | 'user';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    role: 'assistant',
    content: 'Merhaba! Ben Smart Assistant. Haber ozeti, kategori onerisi ve icerik fikri verebilirim.',
  },
  {
    id: 'm2',
    role: 'user',
    content: 'Bugunun teknoloji haberlerini kisa ozetler misin?',
  },
  {
    id: 'm3',
    role: 'assistant',
    content: 'Teknoloji tarafinda bugun yapay zeka tabanli yayin otomasyonu ve mobil guvenlik guncellemeleri one cikiyor.',
  },
];

export default function AIChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const nextUserMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const nextAssistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: 'Bu bir demo cevap. Istersen bu alani gercek AI servisine baglayabiliriz.',
    };

    setMessages((prev) => [...prev, nextUserMessage, nextAssistantMessage]);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 18}
    >
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <View style={[styles.heroBadge, { backgroundColor: colors.accent }]}>
          <Ionicons name="sparkles-outline" size={16} color={colors.white} />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>AI News Assistant</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Sor, ozetle, fikir al</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.messagesContent}
        style={styles.messagesWrap}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                isUser
                  ? { alignSelf: 'flex-end', backgroundColor: colors.accent }
                  : {
                      alignSelf: 'flex-start',
                      backgroundColor: colors.surface,
                      borderColor: colors.borderSubtle,
                      borderWidth: 1,
                    },
              ]}
            >
              <Text style={[styles.messageText, { color: isUser ? colors.white : colors.textPrimary }]}>
                {message.content}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            marginBottom: insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="AI asistana mesaj yaz..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary }]}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <Pressable
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: pressed ? colors.accentLight : colors.accent,
            },
          ]}
        >
          <Ionicons name="send" size={14} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  messagesWrap: {
    flex: 1,
    marginTop: 12,
  },
  messagesContent: {
    gap: 10,
    paddingBottom: 14,
  },
  messageBubble: {
    maxWidth: '86%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

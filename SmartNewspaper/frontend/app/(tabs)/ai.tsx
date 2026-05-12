import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
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

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function buildInitialMessages(articleTitle: string, articleSummary: string, articleSource: string, articleCategory: string, articleAiSummary: string): ChatMessage[] {
  const hasArticleContext = Boolean(articleTitle || articleSummary || articleSource || articleCategory);

  if (!hasArticleContext) {
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Bir haber açtığında, o haberin detaylarıyla ilgili sana odaklı sorular sorabilir ve cevaplar alabilirsin.',
      },
    ];
  }

  const contextBits = [articleCategory, articleSource].filter(Boolean).join(' • ');

  return [
    {
      id: 'welcome',
      role: 'assistant',
      content: `${articleTitle || 'Seçilen haber'} hakkında soru sorabilirsin.${contextBits ? ` (${contextBits})` : ''}`,
    },
    ...(articleAiSummary
      ? [
          {
            id: 'article-summary',
            role: 'assistant',
            content: articleAiSummary,
          },
        ]
      : []),
    ...(articleSummary
      ? [
          {
            id: 'article-summary-brief',
            role: 'assistant',
            content: articleSummary,
          },
        ]
      : []),
  ];
}

export default function AIChatScreen() {
  const { colors: themeColors, themeName } = useTheme();
  const colors = themeColors;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    articleId?: string;
    articleTitle?: string;
    articleSummary?: string;
    articleContent?: string;
    articleSource?: string;
    articleCategory?: string;
    articlePublishedAt?: string;
    articleAiSummary?: string;
    articleAiContext?: string;
  }>();
  const articleTitle = readParam(params.articleTitle);
  const articleSummary = readParam(params.articleSummary);
  const articleContent = readParam(params.articleContent);
  const articleSource = readParam(params.articleSource);
  const articleCategory = readParam(params.articleCategory);
  const articlePublishedAt = readParam(params.articlePublishedAt);
  const articleAiSummary = readParam(params.articleAiSummary);
  const articleAiContext = readParam(params.articleAiContext);

  const articleContext = useMemo(() => {
    if (!articleTitle && !articleSummary && !articleContent) return null;
    return {
      title: articleTitle,
      summary: articleSummary,
      content: articleContent,
      source: articleSource,
      category: articleCategory,
      publishedAt: articlePublishedAt,
      aiSummary: articleAiSummary,
      aiContext: articleAiContext,
    };
  }, [articleAiContext, articleAiSummary, articleCategory, articleContent, articlePublishedAt, articleSource, articleSummary, articleTitle]);

  const [messages, setMessages] = useState<ChatMessage[]>(
    () => buildInitialMessages(articleTitle, articleSummary, articleSource, articleCategory, articleAiSummary)
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const nextUserMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    // Add user message immediately
    setMessages((prev) => [...prev, nextUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare request payload
      const requestPayload = {
        message: trimmed,
        articleContext: articleContext
          ? {
              title: articleContext.title,
              summary: articleContext.summary,
              content: articleContext.content,
              source: articleContext.source,
              category: articleContext.category,
            }
          : undefined,
        chatHistory: messages,
      };

      // Call backend AI endpoint
      const response = await fetch('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse = await response.json();

      // Add assistant message
      const nextAssistantMessage: ChatMessage = {
        id: aiResponse.id,
        role: 'assistant',
        content: aiResponse.content,
      };

      setMessages((prev) => [...prev, nextAssistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestionPrompts = articleContext
    ? [
        'Bu haberde en kritik nokta ne?',
        'Bu haberi 3 maddede özetle.',
        'Bu haberin olası etkileri neler?',
      ]
    : [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 18}
    >
      <View style={[styles.panel, { borderColor: colors.borderSubtle }]}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <View style={[styles.heroBadge, { backgroundColor: colors.accent }]}>
          <Ionicons name="sparkles-outline" size={16} color={colors.white} />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>AI News Assistant</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Sor, özetle, fikir al</Text>
        </View>
      </View>

      {articleContext ? (
        <View style={[styles.articleContextCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <View style={styles.articleContextHeader}>
            <View style={[styles.articleContextBadge, { backgroundColor: colors.accent + '1A' }]}>
              <Ionicons name="newspaper-outline" size={14} color={colors.accent} />
              <Text style={[styles.articleContextBadgeText, { color: colors.accent }]}>Haber bağlamı</Text>
            </View>
            <Text style={[styles.articleContextMeta, { color: colors.textMuted }]} numberOfLines={1}>
              {articleSource || 'Kaynak bilinmiyor'}{articlePublishedAt ? ` • ${articlePublishedAt}` : ''}
            </Text>
          </View>
          <Text style={[styles.articleContextTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {articleContext.title || 'Seçilen haber'}
          </Text>
          {!!articleContext.summary && (
            <Text style={[styles.articleContextSummary, { color: colors.textSecondary }]} numberOfLines={3}>
              {articleContext.summary}
            </Text>
          )}
          {!!articleAiSummary && (
            <View style={[styles.articleContextCallout, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.articleContextCalloutLabel, { color: colors.accent }]}>AI özeti</Text>
              <Text style={[styles.articleContextCalloutText, { color: colors.textPrimary }]} numberOfLines={4}>
                {articleAiSummary}
              </Text>
            </View>
          )}
          <View style={styles.suggestionRow}>
            {suggestionPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={({ pressed }) => [
                  styles.suggestionChip,
                  { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setInput(prompt)}
              >
                <Text style={[styles.suggestionChipText, { color: colors.textMuted }]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
          editable={!isLoading}
        />
        <Pressable
          onPress={handleSend}
          disabled={isLoading || !input.trim()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: isLoading || !input.trim() ? colors.surfaceHigh : pressed ? colors.accentLight : colors.accent,
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name={isLoading ? 'hourglass-outline' : 'send'} size={14} color={colors.white} />
        </Pressable>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 10,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 880,
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
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
  articleContextCard: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  articleContextHeader: {
    gap: 8,
  },
  articleContextBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  articleContextBadgeText: { fontSize: 11, fontWeight: '800' },
  articleContextMeta: { fontSize: 11, fontWeight: '700' },
  articleContextTitle: { fontSize: 16, fontWeight: '900', lineHeight: 22 },
  articleContextSummary: { fontSize: 13, lineHeight: 19 },
  articleContextCallout: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  articleContextCalloutLabel: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  articleContextCalloutText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionChipText: { fontSize: 11, fontWeight: '700' },
  messagesWrap: {
    flex: 1,
    marginTop: 16,
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

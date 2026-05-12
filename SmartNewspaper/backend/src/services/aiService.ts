import { pipeline } from '@xenova/transformers';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
};

export type ArticleContext = {
  title?: string;
  summary?: string;
  content?: string;
  source?: string;
  category?: string;
};

export type ChatRequest = {
  message: string;
  articleContext?: ArticleContext;
  chatHistory?: ChatMessage[];
};

export type ChatResponse = {
  role: 'assistant';
  content: string;
  id: string;
  timestamp: string;
};

// Cache pipeline for performance
let qaCache: any = null;
let isInitializing = false;

/**
 * Get or create QA pipeline
 */
async function getQAPipeline() {
  if (!qaCache && !isInitializing) {
    try {
      isInitializing = true;
      console.log('[AI] QA Pipeline yükleniyor...');
      qaCache = await pipeline('question-answering', 'Xenova/distilbert-base-multilingual-cased');
      console.log('[AI] QA Pipeline başarıyla yüklendi');
    } catch (error) {
      console.error('[AI] QA Pipeline hatası:', error);
      qaCache = null;
    } finally {
      isInitializing = false;
    }
  }
  return qaCache;
}

/**
 * Generate AI response using transformers model with article context
 */
export async function generateAIResponse(req: ChatRequest): Promise<ChatResponse> {
  const { message, articleContext, chatHistory = [] } = req;
  const timestamp = new Date().toISOString();
  const id = `a-${Date.now()}`;

  let response = '';

  try {
    // If there's article context, use QA model to extract answers from content
    if (articleContext && articleContext.content) {
      response = await generateArticleContextualResponse(message, articleContext);
    } else {
      // Otherwise generate general response
      response = await generateGeneralResponse(message, chatHistory);
    }
  } catch (error) {
    console.error('[AI] Response generation error:', error);
    response = 'Üzgünüm, cevap oluştururken bir hata oluştu. Lütfen tekrar deneyin.';
  }

  return {
    role: 'assistant',
    content: response,
    id,
    timestamp,
  };
}

/**
 * Generate contextual response using AI model (Question Answering)
 * Uses distilbert multilingual model to extract answers from article content
 */
async function generateArticleContextualResponse(
  message: string,
  context: ArticleContext
): Promise<string> {
  try {
    const qa = await getQAPipeline();

    if (!qa || !context.content) {
      return generateSmartFallbackResponse(message, context);
    }

    // Prepare context text - limit to avoid token limits
    const contextText = [context.title, context.summary, context.content]
      .filter(Boolean)
      .join(' ')
      .substring(0, 512);

    try {
      // Use QA model to answer question based on article content
      const answer = await qa({
        question: message,
        context: contextText,
      });

      // Format the response with confidence score
      if (answer && answer.answer && answer.score > 0.1) {
        const confidence = Math.round(answer.score * 100);
        return `${answer.answer}\n\n_Cevap Güven Seviyesi: %${confidence}_`;
      }
    } catch (qaError) {
      console.error('[AI] QA inference error:', qaError);
      return generateSmartFallbackResponse(message, context);
    }

    return generateSmartFallbackResponse(message, context);
  } catch (error) {
    console.error('[AI] Contextual response error:', error);
    return generateSmartFallbackResponse(message, context);
  }
}

/**
 * Smart fallback: Extract relevant content based on question intent
 */
function generateSmartFallbackResponse(message: string, context: ArticleContext): string {
  const lowerMessage = message.toLowerCase('tr-TR');
  const lowerContent = (context.content || '').toLowerCase('tr-TR');
  
  // Split content into sentences
  const sentences = (context.content || '')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (sentences.length === 0) {
    return context.summary || `"${context.title}" hakkında detaylı bilgi veremiyorum.`;
  }

  // Extract keywords from question
  const questionKeywords = lowerMessage
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  // Find sentences matching question keywords
  const relevantSentences = sentences
    .map((sentence) => ({
      text: sentence,
      score: questionKeywords.filter((kw) => sentence.toLowerCase('tr-TR').includes(kw)).length,
    }))
    .filter((s) => s.score > 0 || sentences.indexOf(s.text) < 3) // Top sentences or keyword matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.text);

  // If no keyword matches, return first 2 significant sentences
  if (relevantSentences.length === 0) {
    return sentences.slice(0, 2).join(' ');
  }

  return relevantSentences.join(' ');
}

/**
 * Generate general conversational responses (no article context)
 */
async function generateGeneralResponse(message: string, history: ChatMessage[]): Promise<string> {
  const lowerMessage = message.toLowerCase('tr-TR');

  // Check for greetings
  if (
    lowerMessage.includes('merhaba') ||
    lowerMessage.includes('selam') ||
    lowerMessage.includes('hey') ||
    lowerMessage.includes('hello')
  ) {
    return 'Merhaba! 👋 Smart Newspaper AI asistanına hoş geldiniz. Size haber analiziyle ilgili yardımcı olmaktan mutluluk duyacağım. Bir haber seçerek başlayabilir veya genel sorularınızı sorabilirsiniz.';
  }

  // Check for help requests
  if (
    lowerMessage.includes('yardım') ||
    lowerMessage.includes('nasıl') ||
    lowerMessage.includes('ne yapabilirim') ||
    lowerMessage.includes('help') ||
    lowerMessage.includes('how')
  ) {
    return 'Benim yardımcı olabileceğim şeyler:\n\n1. **Haber Analizi**: Bir haberi seçin ve sorularınızı sorun\n2. **Bağlam Anlaması**: Haberleri daha iyi anlamak için arka plan ve etkileri açıklayabilirim\n3. **Tavsiyelendirme**: İlgili konular hakkında daha fazla haber bulmanıza yardımcı olabilirim\n4. **Genel Sorular**: Haber ve medya hakkında konuşabiliriz';
  }

  // Check for sentiment-based questions
  if (
    lowerMessage.includes('bu haberi') ||
    lowerMessage.includes('bu haber') ||
    lowerMessage.includes('about this') ||
    lowerMessage.includes('tell me')
  ) {
    return '📰 Bir haberi seçerek çalışmaya başlayabilir, ardından o haber hakkında spesifik sorular sorabilirsiniz. Böylece size daha kişiselleştirilmiş ve faydalı analiz sunabilirim.';
  }

  // Default response
  return `"${message}" sorunuz ilginç! Daha iyi yardımcı olmak için lütfen:\n\n- Bir haberi seçin ve hakkında soru sorun\n- Daha spesifik bir soru formüle edin\n- İlgilendiğiniz konuyu belirtin\n\nBu şekilde size en uygun cevabı verebilirim.`;
}

import { Platform, Alert } from 'react-native';
import { ApiArticle } from '@/services/newsApi';
import { ContentCategory } from '@/services/content';
import { NewspaperArticleInput } from './newspaperPdfTemplate';
import { exportNewspaperPdf } from './newspaperPdfExporter';

/**
 * Converts real ApiArticle data to NewspaperArticleInput format for PDF export
 * Uses real backend data instead of mock/generated content
 */
export function mapApiArticleToNewspaperInput(article: ApiArticle): NewspaperArticleInput {
  return {
    id: article.id,
    title: article.title,
    // Use real description from backend (not generated)
    summary: article.description || '',
    // Use real content from backend if available, otherwise use description
    // This ensures we use actual article body, not fake generated text
    content: article.content || article.description || '',
    category: (article.category || 'Teknoloji') as ContentCategory | string,
    source: article.source.name || 'Unknown Source',
    date: article.publishedAt || new Date().toISOString(),
    // Use real article image from backend
    imageUrl: article.imageUrl || undefined,
  };
}

/**
 * Exports real personalized news articles to PDF
 * Unlike archive export, this uses actual backend data without any mock/fallback content
 * 
 * @param articles - Real ApiArticle objects from backend
 * @param preferredCategories - Optional preferred categories for personalization scoring
 */
export async function exportRealNewsToPdf(
  articles: ApiArticle[],
  preferredCategories: string[] = []
): Promise<void> {
  if (!articles || articles.length === 0) {
    Alert.alert('Uyarı', 'Indirilecek makale bulunamadi.');
    return;
  }

  try {
    // Map all real articles to PDF template format
    const pdfarticles: NewspaperArticleInput[] = articles.map(mapApiArticleToNewspaperInput);

    // Export using the standard PDF exporter
    await exportNewspaperPdf({
      engine: Platform.OS === 'web' ? 'react-pdf' : 'html-css',
      newspaperName: 'Smart Newspaper',
      generatedAt: new Date().toISOString(),
      shareTitle: `Smart Newspaper - ${new Date().toLocaleDateString()}`,
      personalization: {
        preferredCategories,
      },
      articles: pdfarticles,
    });
  } catch (error) {
    console.error('PDF export error:', error);
    Alert.alert('Hata', 'PDF olusturulurken bir sorun olustu.');
  }
}

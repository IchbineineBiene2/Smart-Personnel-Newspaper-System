import { query } from '../db/index';
import { Article } from '../models/Article';

export async function processCustomTagNotifications(newArticles: Article[]): Promise<void> {
  if (!newArticles || newArticles.length === 0) return;

  try {
    // Tüm kullanıcıların custom_tags'lerini al
    const usersResult = await query<{ user_id: number; custom_tags: string[] }>(
      `SELECT user_id, custom_tags 
       FROM user_preferences 
       WHERE custom_tags IS NOT NULL AND array_length(custom_tags, 1) > 0`
    );

    const users = usersResult.rows;
    if (users.length === 0) return;

    for (const article of newArticles) {
      const textToSearch = `${article.title} ${article.description}`.toLowerCase();
      
      for (const user of users) {
        const customTags = user.custom_tags || [];
        
        // Etiket eşleşmesi kontrolü
        const hasMatch = customTags.some(tag => {
          const lowerTag = tag.toLowerCase();
          // Sadece boşluk veya noktalama ile ayrılmış kelimeleri bul (basit word-boundary)
          const escaped = lowerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:^|[\\s.,!?;:\\"'\\-\\[\\]{}()])(${escaped})(?:[\\s.,!?;:\\"'\\-\\[\\]{}()]|$)`, 'i');
          return regex.test(` ${textToSearch} `);
        });

        if (hasMatch) {
          // Bu kullanıcıya bildirim gönder
          await query(
            `INSERT INTO notifications (user_id, type, title, content, related_article_id)
             VALUES ($1, 'custom_tag_match', $2, $3, $4)`,
            [
              user.user_id,
              'İlgi alanına giren yeni bir haber var!',
              article.title,
              article.id
            ]
          ).catch((e) => {
            console.error('[NotificationService] Bildirim eklenemedi:', e.message);
          });
        }
      }
    }
  } catch (error) {
    console.error('[NotificationService] Error processing custom tags:', error);
  }
}

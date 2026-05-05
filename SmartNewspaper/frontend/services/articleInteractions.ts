import { getToken } from '@/services/auth';

const API_BASE_URL = 'http://localhost:3000/api/article-interactions';

export interface ArticleInteractionSummary {
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface ArticleComment {
  id: number;
  article_id: string;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: string;
  updated_at: string;
  username: string;
  email: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchArticleInteractionSummary(
  articleId: string
): Promise<ArticleInteractionSummary> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(articleId)}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error('Article interactions could not be loaded');
  }

  return response.json();
}

export async function fetchArticleComments(articleId: string): Promise<ArticleComment[]> {
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(articleId)}/comments`);

  if (!response.ok) {
    throw new Error('Article comments could not be loaded');
  }

  const data = await response.json();
  return data.comments || [];
}

export async function toggleArticleLike(articleId: string): Promise<{
  liked: boolean;
  likes_count: number;
}> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(articleId)}/like`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    throw new Error('Article like could not be updated');
  }

  return response.json();
}

export async function addArticleComment(
  articleId: string,
  content: string,
  parentId?: number | null
): Promise<ArticleComment> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/${encodeURIComponent(articleId)}/comments`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      parent_id: parentId || null,
    }),
  });

  if (!response.ok) {
    throw new Error('Comment could not be added');
  }

  const data = await response.json();
  return data.comment;
}

import React from 'react';
import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import {
  NewspaperPreparedArticle,
  NewspaperTemplateInput,
  prepareNewspaperPdfData,
} from './newspaperPdfTemplate';

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function shortDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('tr-TR');
}

function paragraphs(article: NewspaperPreparedArticle, max = 8): string[] {
  const raw = article.content || '';
  return raw
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 24,
    fontFamily: 'Times-Roman',
    color: '#151515',
    backgroundColor: '#fffdf8',
  },
  coverHeader: {
    borderBottomWidth: 3,
    borderBottomColor: '#151515',
    paddingBottom: 10,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 46,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: -1,
  },
  subline: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 6,
    color: '#555',
  },
  leadCard: {
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    textDecoration: 'none',
  },
  leadImage: {
    width: '100%',
    height: 205,
    objectFit: 'cover',
  },
  placeholderBg: {
    backgroundColor: '#e5e5e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 900,
  },
  leadBody: {
    padding: 12,
  },
  category: {
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#8a1f11',
    fontWeight: 900,
    marginBottom: 4,
  },
  leadTitle: {
    fontSize: 25,
    lineHeight: 1.08,
    fontWeight: 900,
  },
  summary: {
    marginTop: 6,
    fontSize: 10,
    lineHeight: 1.35,
    color: '#333',
  },
  meta: {
    marginTop: 7,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#666',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewCard: {
    width: '31.8%',
    borderWidth: 1,
    borderColor: '#d4d4d4',
    backgroundColor: '#ffffff',
    minHeight: 162,
    textDecoration: 'none',
  },
  previewImage: {
    width: '100%',
    height: 70,
    objectFit: 'cover',
  },
  previewBody: {
    padding: 8,
  },
  previewTitle: {
    fontSize: 11,
    lineHeight: 1.2,
    fontWeight: 900,
  },
  readMore: {
    marginTop: 5,
    fontSize: 8,
    color: '#8a1f11',
    fontWeight: 900,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  articleHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#151515',
    paddingBottom: 8,
    marginBottom: 12,
  },
  articleTitle: {
    fontSize: 31,
    lineHeight: 1.05,
    fontWeight: 900,
  },
  articleImage: {
    width: '100%',
    height: 235,
    objectFit: 'cover',
    marginBottom: 12,
  },
  articleColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  articleColumn: {
    flex: 1,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.45,
    textAlign: 'justify',
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: '#d0d0d0',
    paddingTop: 4,
    fontSize: 8,
    color: '#777',
    textAlign: 'center',
  },
});

export function createNewspaperReactPdfDocument(input: NewspaperTemplateInput): React.ReactElement {
  const prepared = prepareNewspaperPdfData(input);
  const allArticles = prepared.sections.flatMap((section) => section.articles);
  const lead = allArticles[0];
  const previews = allArticles.slice(1, 10);

  return (
    <Document title={prepared.newspaperName} author="Smart Newspaper">
      <Page size="A4" style={[styles.page, { backgroundColor: prepared.theme.backgroundColor, color: prepared.theme.textColor }]}>
        <View style={[styles.coverHeader, { borderBottomColor: prepared.theme.titleColor }]}>
          <Text style={[styles.eyebrow, { color: prepared.theme.textColor }]}>Personalized Edition</Text>
          <Text style={[styles.title, { color: prepared.theme.titleColor }]}>{prepared.newspaperName}</Text>
          <Text style={[styles.subline, { color: prepared.theme.textColor, opacity: 0.8 }]}>Gunluk Baski | {prepared.displayDate} | {allArticles.length} haber</Text>
        </View>

        {lead ? (
          <Link src={`#article-${lead.id}`} style={[styles.leadCard, { borderColor: prepared.theme.titleColor, backgroundColor: 'transparent' }]}>
            {lead.imageUrl ? (
              <Image src={lead.imageUrl} style={styles.leadImage} />
            ) : (
              <View style={[styles.leadImage, styles.placeholderBg]}>
                <Text style={styles.placeholderText}>Görsel Bulunamadı</Text>
              </View>
            )}
            <View style={styles.leadBody}>
              <Text style={[styles.category, { color: prepared.theme.accentColor }]}>{lead.categoryDisplayName}</Text>
              <Text style={[styles.leadTitle, { color: prepared.theme.headingColor }]}>{lead.title}</Text>
              <Text style={[styles.summary, { color: prepared.theme.textColor }]}>{lead.summary}</Text>
              <Text style={[styles.meta, { color: prepared.theme.textColor, opacity: 0.7 }]}>{lead.source} | {shortDate(lead.date)}</Text>
              <Text style={[styles.readMore, { color: prepared.theme.accentColor }]}>Haberi ac</Text>
            </View>
          </Link>
        ) : null}

        <View style={styles.previewGrid}>
          {previews.map((article) => (
            <Link key={article.id} src={`#article-${article.id}`} style={[styles.previewCard, { borderColor: prepared.theme.textColor, backgroundColor: 'transparent' }]}>
              {article.imageUrl ? (
                <Image src={article.imageUrl} style={styles.previewImage} />
              ) : (
                <View style={[styles.previewImage, styles.placeholderBg]}>
                  <Text style={styles.placeholderText}>Görsel Bulunamadı</Text>
                </View>
              )}
              <View style={styles.previewBody}>
                <Text style={[styles.category, { color: prepared.theme.accentColor }]}>{article.categoryDisplayName}</Text>
                <Text style={[styles.previewTitle, { color: prepared.theme.headingColor }]}>{article.title}</Text>
                <Text style={[styles.meta, { color: prepared.theme.textColor, opacity: 0.7 }]}>{article.source}</Text>
                <Text style={[styles.readMore, { color: prepared.theme.accentColor }]}>Detaya git</Text>
              </View>
            </Link>
          ))}
        </View>

        <Text style={[styles.footer, { color: prepared.theme.textColor, borderTopColor: prepared.theme.textColor }]}>Smart Newspaper | Onizleme kartlarina tiklayarak haber detayina gidebilirsiniz.</Text>
      </Page>

      {allArticles.map((article, index) => {
        const content = paragraphs(article);
        const columns = chunk(content, Math.ceil(content.length / 2) || 1);

        return (
          <Page key={article.id} id={`article-${article.id}`} size="A4" style={[styles.page, { backgroundColor: prepared.theme.backgroundColor, color: prepared.theme.textColor }]}>
            <View style={[styles.articleHeader, { borderBottomColor: prepared.theme.titleColor }]}>
              <Text style={[styles.category, { color: prepared.theme.accentColor }]}>{article.categoryDisplayName}</Text>
              <Text style={[styles.articleTitle, { color: prepared.theme.headingColor }]}>{article.title}</Text>
              <Text style={[styles.meta, { color: prepared.theme.textColor, opacity: 0.7 }]}>{article.source} | {shortDate(article.date)}</Text>
            </View>

            {article.imageUrl ? (
              <Image src={article.imageUrl} style={styles.articleImage} />
            ) : (
              <View style={[styles.articleImage, styles.placeholderBg]}>
                <Text style={styles.placeholderText}>Görsel Bulunamadı</Text>
              </View>
            )}

            <View style={styles.articleColumns}>
              {[0, 1].map((col) => (
                <View key={col} style={styles.articleColumn}>
                  {(columns[col] || []).map((paragraph, paragraphIndex) => (
                    <Text key={`${col}-${paragraphIndex}`} style={[styles.paragraph, { color: prepared.theme.textColor }]}>
                      {paragraph}
                    </Text>
                  ))}
                </View>
              ))}
            </View>

            <Text style={[styles.footer, { color: prepared.theme.textColor, borderTopColor: prepared.theme.textColor }]}>
              {prepared.newspaperName} | Haber {index + 1} / {allArticles.length}
            </Text>
          </Page>
        );
      })}
    </Document>
  );
}

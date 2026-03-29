import React from 'react';
import { Document, Page, StyleSheet, Text, View, Image } from '@react-pdf/renderer';

import {
  NewspaperPreparedArticle,
  NewspaperTemplateInput,
  prepareNewspaperPdfData,
  CATEGORY_COLOR_MAP,
} from './newspaperPdfTemplate';

const styles = StyleSheet.create({
  page: {
    paddingTop: 12,
    paddingBottom: 15,
    paddingHorizontal: 10,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  masthead: {
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 2,
    borderBottomColor: '#111111',
  },
  title: {
    fontSize: 48,
    fontWeight: 900,
    letterSpacing: -0.5,
    marginBottom: 2,
    marginTop: 0,
  },
  subline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 0,
    marginBottom: 0,
  },
  /* 3-Column Grid */
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  column: {
    width: '33%',
    paddingHorizontal: 2,
  },
  articleCell: {
    marginBottom: 4,
  },
  articleImage: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
    marginBottom: 2,
    backgroundColor: '#f0f0f0',
  },
  articleImagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#d0d0d0',
    marginBottom: 2,
  },
  articleTitle: {
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1.2,
    marginBottom: 1.5,
    marginTop: 0,
    color: '#111111',
  },
  articleBody: {
    fontSize: 9,
    lineHeight: 1.4,
    fontWeight: 400,
    marginBottom: 1,
    marginTop: 0,
    color: '#222222',
  },
  articleSummary: {
    fontSize: 9.5,
    lineHeight: 1.35,
    fontWeight: 500,
    marginBottom: 1.5,
    marginTop: 0,
    color: '#222222',
  },
  articleMeta: {
    fontSize: 7.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: 600,
    marginTop: 0,
    marginBottom: 0,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 5,
    left: 10,
    right: 10,
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
    paddingTop: 2,
  },
});

export function createNewspaperReactPdfDocument(input: NewspaperTemplateInput): React.ReactElement {
  const prepared = prepareNewspaperPdfData(input);

  // Flatten all articles from all sections
  const allArticles = prepared.sections.flatMap((section) => section.articles);

  // Distribute articles evenly across 3 columns
  const columnCount = 3;
  const columns: NewspaperPreparedArticle[][] = Array.from({ length: columnCount }, () => []);

  allArticles.forEach((article, index) => {
    columns[index % columnCount].push(article);
  });

  return (
    <Document title={prepared.newspaperName} author="Smart Newspaper">
      <Page size="A4" style={styles.page}>
        <View style={styles.masthead} fixed>
          <Text style={styles.title}>{prepared.newspaperName}</Text>
          <Text style={styles.subline}>Gunluk Baski | {prepared.displayDate}</Text>
        </View>

        <View style={styles.gridContainer}>
          {columns.map((columnArticles, colIndex) => (
            <View key={`col-${colIndex}`} style={styles.column}>
              {columnArticles.map((article) => (
                <View key={`article-${article.id}`} style={styles.articleCell}>
                  {article.imageUrl ? (
                    <Image src={article.imageUrl} style={styles.articleImage} />
                  ) : (
                    <View style={styles.articleImagePlaceholder} />
                  )}
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  {(() => {
                    // Format content into readable paragraphs
                    const contentParagraphs = (article.content || article.summary)
                      .split(/\n+/)
                      .filter((line) => line.trim().length > 0);

                    return contentParagraphs.map((paragraph, idx) => (
                      <Text
                        key={`body-${idx}`}
                        style={
                          idx === contentParagraphs.length - 1
                            ? { ...styles.articleBody, marginBottom: 2 }
                            : styles.articleBody
                        }
                      >
                        {paragraph}
                      </Text>
                    ));
                  })()}
                  <Text style={styles.articleMeta}>
                    {article.source} | {article.date}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          fixed
          render={() => 'Smart Newspaper | © 2026'}
        />
      </Page>
    </Document>
  );
}

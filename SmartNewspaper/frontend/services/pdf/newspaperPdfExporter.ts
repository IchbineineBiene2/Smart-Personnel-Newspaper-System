import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  NewspaperArticleInput,
  NewspaperPersonalization,
  renderNewspaperPdfHtml,
} from './newspaperPdfTemplate';

export type NewspaperPdfEngine = 'html-css' | 'react-pdf';

export type ExportNewspaperPdfInput = {
  newspaperName?: string;
  generatedAt?: string;
  articles: NewspaperArticleInput[];
  personalization?: NewspaperPersonalization;
  shareTitle?: string;
  engine?: NewspaperPdfEngine;
};

function downloadBlobOnWeb(blob: Blob, fileName: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function htmlToDataUrl(html: string): string {
  const encoded = btoa(unescape(encodeURIComponent(html)));
  return `data:text/html;base64,${encoded}`;
}

function renderHtmlInWindowAndPrint(html: string, fileName: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Create an iframe with the HTML content
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.style.position = 'absolute';
  
  document.body.appendChild(iframe);

  // Write the HTML to the iframe
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    console.error('Could not access iframe document');
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to load, then print
  setTimeout(() => {
    iframe.contentWindow?.print();
    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  }, 500);
}

export async function exportNewspaperPdf(input: ExportNewspaperPdfInput): Promise<{ uri?: string; mode: 'file' | 'print-dialog' }> {
  const selectedEngine = input.engine ?? 'html-css';

  if (selectedEngine === 'react-pdf' && Platform.OS === 'web') {
    try {
      // Dynamically import React PDF only when needed
      const { pdf } = await import('@react-pdf/renderer');
      const { createNewspaperReactPdfDocument } = await import('./newspaperReactPdfTemplate');

      const doc = createNewspaperReactPdfDocument({
        newspaperName: input.newspaperName,
        generatedAt: input.generatedAt,
        articles: input.articles,
        personalization: input.personalization,
      });

      const blob = await pdf(doc as any).toBlob();
      const outputName = `${(input.shareTitle ?? input.newspaperName ?? 'smart-newspaper').replace(/\s+/g, '-').toLowerCase()}.pdf`;
      downloadBlobOnWeb(blob, outputName);
      return { mode: 'file' };
    } catch (error) {
      console.warn('React PDF rendering failed, falling back to HTML-CSS engine:', error);
      // Fall through to HTML-CSS rendering
    }
  }

  const html = renderNewspaperPdfHtml({
    newspaperName: input.newspaperName,
    generatedAt: input.generatedAt,
    articles: input.articles,
    personalization: input.personalization,
  });

  if (Platform.OS === 'web') {
    const outputName = `${(input.shareTitle ?? input.newspaperName ?? 'smart-newspaper').replace(/\s+/g, '-').toLowerCase()}.pdf`;
    renderHtmlInWindowAndPrint(html, outputName);
    return { mode: 'print-dialog' };
  }

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: input.shareTitle ?? input.newspaperName ?? 'Smart Newspaper',
      UTI: 'com.adobe.pdf',
    });
  }

  return { uri, mode: 'file' };
}

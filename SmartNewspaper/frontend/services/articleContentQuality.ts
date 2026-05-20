export function stripArticleHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .split(/\n\n+/)
    .map((paragraph) => paragraph.replace(/\n+/g, ' ').replace(/[ ]{2,}/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

export function isLikelyArticleBody(value: string | null | undefined): boolean {
  if (!value) return false;

  const text = stripArticleHtml(value);
  if (text.length < 120) return false;

  const codeSignals = [
    /\bimport\s+[\w*{]/,
    /\bexport\s+(default\s+)?(function|const|class)\b/,
    /\b(function|const|let|var)\s+[a-z_$][\w$]*\s*[=(]/,
    /=>\s*[{(]/,
    /\b(document|window)\.[a-z]/,
    /\baddEventListener\s*\(/,
    /\bgetElementById\s*\(/,
    /<\/?[a-z][\s\S]*?>/i,
    /\bclass(Name)?=/,
    /\bstroke-dash(array|offset)\b/,
    /\bxmlns=/,
    /\bprops:\s*{/,
  ].filter((pattern) => pattern.test(value)).length;

  const punctuationChars = (text.match(/[{}[\];=<>]/g) ?? []).length;
  const punctuationDensity = punctuationChars / Math.max(text.length, 1);
  const words = text.split(/\s+/).filter(Boolean);
  const proseWords = words.filter((word) => /[a-zA-ZğüşıöçĞÜŞİÖÇäöüßÄÖÜ]{3,}/.test(word)).length;
  const sentenceCount = (text.match(/[.!?](\s|$)/g) ?? []).length;

  if (codeSignals >= 2) return false;
  if (codeSignals >= 1 && punctuationDensity > 0.025) return false;
  if (punctuationDensity > 0.055) return false;
  if (words.length >= 30 && proseWords / words.length < 0.62) return false;
  if (text.length > 240 && sentenceCount < 2) return false;

  return true;
}

export function cleanArticleBody(value: string | null | undefined): string | null {
  if (!isLikelyArticleBody(value)) return null;
  return stripArticleHtml(String(value));
}

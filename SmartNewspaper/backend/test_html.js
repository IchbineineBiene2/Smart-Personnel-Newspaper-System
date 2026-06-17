const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('test.html', 'utf8');
const $ = cheerio.load(html);

console.log('JSON-LD bodies:', extractJsonLdArticleBodies($).length);

function extractJsonLdArticleBodies($) {
  const results = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== 'object') continue;
        const obj = node;
        ['articleBody', 'description'].forEach((key) => {
          const value = obj[key];
          if (typeof value === 'string' && value.length > 50) {
            results.push(value.substring(0, 100));
          }
        });
        Object.values(obj).forEach((val) => {
          if (val && typeof val === 'object') queue.push(val);
        });
      }
    } catch (e) {}
  });
  return results;
}

const possibleText = [];
$('p, article, .content, .news-detail, .article-body, figure, .content-text').each((i, el) => {
    const t = $(el).text().trim().substring(0, 100);
    if (t.length > 50) possibleText.push(t);
});

console.log('DOM length:', html.length);
console.log('Possible text snippets:', possibleText.length);
console.log('Content snippet:', possibleText[0]);

const imgClass = $('img').map((i, el) => $(el).attr('src')).get();
console.log('Images:', imgClass.slice(0, 5));

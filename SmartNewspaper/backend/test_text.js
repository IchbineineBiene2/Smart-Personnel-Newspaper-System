const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('test.html', 'utf8');
const $ = cheerio.load(html);

// Remove unwanted stuff
['script', 'style', '.social-shares', '.tags', '.advertisement', 
  'aside', 'nav', 'header', 'footer', '[class*="related"]', '[class*="sidebar"]', 
  '.tag-cloud'
].forEach(sel => $(sel).remove());

const contentNodes = $('.content, .news-detail, .article-body, figure, .content-text');
console.log('Nodes found:', contentNodes.length);

let texts = [];
contentNodes.each((i, el) => {
    let text = $(el).text().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if(text.length > 50) texts.push(text);
});

console.log('Texts:', texts.map(t => t.substring(0, 100)));

// What if we try to just read main > article > p ?
const ps = $('article p, main p').map((i,el) => $(el).text().trim()).get().filter(t => t.length > 50);
console.log('Ps:', ps.length, ps[0]);

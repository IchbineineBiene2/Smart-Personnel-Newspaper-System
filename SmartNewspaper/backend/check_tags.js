const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('test.html', 'utf8');
const $ = cheerio.load(html);

console.log('article classes:', $('article').attr('class'));
console.log('main classes:', $('main').attr('class'));
console.log('content text classes:', $('article p').parent().attr('class'));

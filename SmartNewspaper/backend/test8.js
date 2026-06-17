const html = require('fs').readFileSync('dump.html', 'utf8');
const cWizMatch = html.match(/<c-wiz[^>]+data-n-au=["']([^"']+)["']/);
console.log('data-n-au:', cWizMatch ? cWizMatch[1] : 'not found');

const aMatch = html.match(/<a[^>]+href=["'](https:\/\/[^"']+)["']/g);
console.log('all a hrefs:', aMatch?.slice(0, 10));

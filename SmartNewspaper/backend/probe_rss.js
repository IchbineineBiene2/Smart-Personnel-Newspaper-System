const domains = [
  'sabah.com.tr', 'trthaber.com', 'fanatik.com.tr', 'goal.com/tr', 'sozcu.com.tr',
  'trtspor.com.tr', 'sporx.com', 'bloomberght.com', 'para.com.tr', 'medicana.com.tr',
  'kristalsoft.com', 'technopat.net', 'ensonhaber.com', 'gazetevatan.com',
  'reuters.com', 'apnews.com', 'dw.com', 'sueddeutsche.de'
];

const paths = [
  '/rss', '/rss.xml', '/rss/anasayfa', '/rss/anasayfa.xml', '/feed', '/feed/', '/rss/feed'
];

async function probe() {
  for (const domain of domains) {
    let found = false;
    for (const p of paths) {
      const url = `https://www.${domain}${p}`;
      try {
        const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (res.status === 200 || res.status === 301 || res.status === 302) {
          console.log(`FOUND: ${url}`);
          found = true;
          break;
        }
      } catch (e) {
      }
    }
    if (!found) {
      console.log(`NOT FOUND for: ${domain}`);
    }
  }
}
probe();

const urls = [
  'https://www.trthaber.com/sondakika.rss',
  'https://www.trthaber.com/manset_articles.rss',
  'https://www.fanatik.com.tr/rss/anasayfa.xml',
  'https://www.sozcu.com.tr/rss/spor.xml',
  'https://www.trtspor.com.tr/rss/sondakika.xml',
  'https://www.sporx.com/rss',
  'https://www.para.com.tr/rss/anasayfa.xml',
  'https://kristalsoft.com/feed',
  'https://www.sabah.com.tr/rss/gundem.xml',
  'https://www.sozcu.com.tr/rss/gundem.xml',
  'https://t24.com.tr/rss',
  'https://www.haberturk.com/rss/kategori/yasam.xml',
  'https://www.gazetevatan.com/rss/yasam.xml',
  'https://rss.dw.com/rdf/rss-de-eco',
  'https://rss.sueddeutsche.de/rss/Topthemen'
];

async function probe() {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`${res.status} ${url}`);
    } catch (e) {
      console.log(`ERR ${url}`);
    }
  }
}
probe();

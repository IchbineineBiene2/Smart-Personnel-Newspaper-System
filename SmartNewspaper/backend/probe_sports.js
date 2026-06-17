const urls = [
  'https://www.trtspor.com.tr/rss/sondakika.xml',
  'https://www.trtspor.com.tr/rss/anasayfa.xml',
  'https://www.fanatik.com.tr/rss/anasayfa.xml',
  'https://www.fanatik.com.tr/rss',
  'https://www.sporx.com/rss.xml',
  'https://www.beinsports.com.tr/rss',
  'https://www.ajansspor.com/rss/anasayfa.xml'
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

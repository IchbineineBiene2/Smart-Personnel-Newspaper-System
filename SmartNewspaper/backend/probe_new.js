const urls = [
  'https://www.mynet.com/haber/rss',
  'https://halktv.com.tr/rss',
  'https://tele1.com.tr/feed/',
  'https://www.krttv.com.tr/rss',
  'https://odatv4.com/rss',
  'https://www.yenicaggazetesi.com.tr/rss'
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

const { fetchAllRssFeeds } = require('./src/collectors/rssCollector');

async function testScrape() {
  console.log('Fetching RSS feeds...');
  const articles = await fetchAllRssFeeds();
  console.log(`Fetched ${articles.length} articles.`);
  
  const sources = new Set(articles.map(a => a.source.name));
  console.log('Sources fetched:', Array.from(sources).join(', '));
}

testScrape().catch(console.error);

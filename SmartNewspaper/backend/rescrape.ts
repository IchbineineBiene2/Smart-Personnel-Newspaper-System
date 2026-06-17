require('dotenv').config();
const { query } = require('./src/db/index');
const scraper = require('./src/collectors/scraper.ts');

async function run() {
  try {
    const res = await query(`SELECT id, url, source_name FROM articles WHERE content IS NULL OR length(content) < 50`);
    console.log(`Found ${res.rowCount} articles with null or short content.`);

    for (const row of res.rows) {
      try {
        const details = await scraper.scrapeArticleDetails(row.url);
        if (details.content) {
          await query('UPDATE articles SET content = $1 WHERE id = $2', [details.content, row.id]);
          console.log(`Updated ${row.id}`);
        }
      } catch (err) {
        console.error(`Error:`, err);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();

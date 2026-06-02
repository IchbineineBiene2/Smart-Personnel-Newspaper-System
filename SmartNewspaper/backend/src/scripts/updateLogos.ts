import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Fix for tsx execution path
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { query } from '../db';
import { RSS_SOURCES } from '../config/sources';

async function main() {
  console.log('[Script] Starting logoUrl update for existing articles...');
  
  let updatedCount = 0;
  
  for (const source of RSS_SOURCES) {
    if (!source.logoUrl) continue;
    
    try {
      const res = await query(
        `UPDATE articles 
         SET source_logo_url = $1 
         WHERE source_name = $2 
           AND (source_logo_url IS NULL OR source_logo_url != $1)`,
        [source.logoUrl, source.name]
      );
      
      if (res.rowCount && res.rowCount > 0) {
        console.log(`Updated ${res.rowCount} articles for source: ${source.name}`);
        updatedCount += res.rowCount;
      }
    } catch (err) {
      console.error(`Error updating source: ${source.name}`, err);
    }
  }
  
  console.log(`[Script] Finished. Total rows updated: ${updatedCount}`);
  process.exit(0);
}

main();

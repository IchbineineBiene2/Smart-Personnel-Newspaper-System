/**
 * End-to-end test for Phase 1 personalization:
 * 1. register/login a test user
 * 2. GET /api/preferences → default değerler
 * 3. PUT /api/preferences → bazı tercihler yaz
 * 4. GET /api/preferences → değişiklikleri doğrula
 * 5. GET /api/news?personalized=1 → filtre uygulandı mı
 * 6. Insert fake article_likes → /api/news/for-you cold→fresh geçer mi
 *
 * Sunucu http://localhost:3000'de çalışıyor olmalı.
 */
import 'dotenv/config';
import { query } from '../db';
import pool from '../db';

const API = 'http://localhost:3000';
const TEST_USER = `testperso_${Date.now()}`;
const TEST_EMAIL = `${TEST_USER}@test.local`;
const TEST_PASS = 'Test1234!';

function ok(msg: string) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg: string, extra?: unknown) {
  console.log(`  \x1b[31m✗ ${msg}\x1b[0m`);
  if (extra !== undefined) console.log('   ', extra);
  process.exitCode = 1;
}
function section(s: string) { console.log(`\n\x1b[1m${s}\x1b[0m`); }

async function http(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function cleanup(userId?: number) {
  if (userId) {
    await query(`DELETE FROM article_likes WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM user_preferences WHERE user_id = $1`, [userId]).catch(() => {});
    await query(`DELETE FROM users WHERE id = $1`, [userId]).catch(() => {});
  }
}

async function main() {
  let userId: number | undefined;
  try {
    section('1. Register + Login');
    const reg = await http('POST', '/api/auth/register', { body: { username: TEST_USER, fullName: 'Test Persona', email: TEST_EMAIL, password: TEST_PASS } });
    if (reg.status !== 200 && reg.status !== 201) {
      fail(`register status ${reg.status}`, reg.body);
      return;
    }
    const token = reg.body?.token;
    if (!token) { fail('register did not return token', reg.body); return; }
    ok(`registered + token len=${String(token).length}`);

    const ur = await query<{ id: number }>(`SELECT id FROM users WHERE username = $1`, [TEST_USER]);
    userId = ur.rows[0]?.id;
    if (!userId) { fail('user not found after register'); return; }
    ok(`user id = ${userId}`);

    section('2. GET /api/preferences (defaults)');
    const g1 = await http('GET', '/api/preferences', { token });
    if (g1.status !== 200) { fail(`status ${g1.status}`, g1.body); return; }
    const required = ['preferredCategories', 'preferredLanguages', 'preferredSources', 'mutedSources'] as const;
    let allOk = true;
    for (const k of required) {
      if (!Array.isArray(g1.body?.[k])) { fail(`field ${k} not array`, g1.body?.[k]); allOk = false; }
    }
    if (allOk) ok(`defaults: prefCat=${g1.body.preferredCategories.length} prefLang=${g1.body.preferredLanguages.length} prefSrc=${g1.body.preferredSources.length} muted=${g1.body.mutedSources.length}`);

    section('3. PUT /api/preferences');
    const patch = {
      preferredCategories: ['siyaset', 'teknoloji'],
      preferredLanguages: ['tr', 'en'],
      preferredSources: ['Cumhuriyet', 'BBC'],
      mutedSources: ['Sabah'],
    };
    const p1 = await http('PUT', '/api/preferences', { token, body: patch });
    if (p1.status !== 200) { fail(`status ${p1.status}`, p1.body); return; }
    if (JSON.stringify(p1.body.preferredCategories) === JSON.stringify(patch.preferredCategories)) ok('preferredCategories saved');
    else fail('preferredCategories mismatch', p1.body.preferredCategories);
    if (JSON.stringify(p1.body.preferredLanguages) === JSON.stringify(patch.preferredLanguages)) ok('preferredLanguages saved');
    else fail('preferredLanguages mismatch', p1.body.preferredLanguages);
    if (JSON.stringify(p1.body.mutedSources) === JSON.stringify(patch.mutedSources)) ok('mutedSources saved');
    else fail('mutedSources mismatch');

    section('4. GET /api/preferences (verify persistence)');
    const g2 = await http('GET', '/api/preferences', { token });
    if (JSON.stringify(g2.body.preferredCategories) === JSON.stringify(patch.preferredCategories)) ok('persisted across requests');
    else fail('persistence broken', g2.body);

    section('5. /api/news?personalized=1 (guest = baseline)');
    const guest = await http('GET', '/api/news?limit=20', {});
    const auth = await http('GET', '/api/news?personalized=1&limit=20', { token });
    if (guest.status === 200 && auth.status === 200) {
      const guestSources = new Set((guest.body.articles ?? []).map((a: any) => a.source?.name).filter(Boolean));
      const authSources = new Set((auth.body.articles ?? []).map((a: any) => a.source?.name).filter(Boolean));
      ok(`guest: ${guest.body.articles?.length} articles, ${guestSources.size} distinct sources`);
      ok(`auth+personalized: ${auth.body.articles?.length} articles, ${authSources.size} distinct sources`);
      // mutedSources içerme yasak
      const leak = (auth.body.articles ?? []).some((a: any) => a.source?.name === 'Sabah');
      if (!leak) ok('Sabah filtered out by mutedSources ✓');
      else fail('mutedSources NOT honored — Sabah still appears');
      // preferredLanguages içine düşmeli (tr/en sadece)
      const wrongLang = (auth.body.articles ?? []).find((a: any) => a.language && !['tr','en'].includes(a.language));
      if (!wrongLang) ok('languages within tr/en ✓');
      else fail(`unexpected language: ${wrongLang.language}`);
      // preferredSources içine düşmeli (Cumhuriyet veya BBC)
      const wrongSrc = (auth.body.articles ?? []).find((a: any) => !['Cumhuriyet','BBC'].includes(a.source?.name));
      if (!wrongSrc) ok('all sources match preferred ✓');
      else fail(`unexpected source: ${wrongSrc.source?.name}`);
    } else { fail(`news endpoints failed`, { guest: guest.status, auth: auth.status }); }

    section('6. /api/news/for-you cold start');
    const cold = await http('GET', '/api/news/for-you?limit=10', { token });
    if (cold.status !== 200) { fail(`status ${cold.status}`, cold.body); }
    else if (cold.body.cold === true && Array.isArray(cold.body.articles)) {
      ok(`cold=true, sampleCount=0, articles=${cold.body.articles.length}`);
    } else { fail('cold start shape unexpected', cold.body); }

    section('7. Seed article_likes → /api/news/for-you fresh');
    // Bilinen embed'li 5 makaleyi like et
    const seedArticles = await query<{ id: string }>(`
      SELECT id FROM articles
      WHERE embedding_v2 IS NOT NULL
        AND published_at >= NOW() - INTERVAL '3 days'
      ORDER BY published_at DESC LIMIT 5
    `);
    if (seedArticles.rowCount === 0) {
      console.log('   (seed bulunamadı — siyaset kategorisinde son 3 gün içinde embedded makale yok)');
    } else {
      for (const r of seedArticles.rows) {
        await query(
          `INSERT INTO article_likes (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, r.id],
        );
      }
      ok(`seeded ${seedArticles.rowCount} likes`);
      const warm = await http('GET', '/api/news/for-you?limit=10', { token });
      if (warm.status === 200 && warm.body.cold === false) {
        ok(`for-you fresh: cold=false sampleCount=${warm.body.sampleCount} articles=${warm.body.articles.length} freshness=${warm.body.freshness}`);
        const firstScore = warm.body.articles[0]?.interest_score;
        if (typeof firstScore === 'number' && firstScore > 0) ok(`first interest_score = ${firstScore.toFixed(3)}`);
        else fail('interest_score missing or zero', firstScore);
      } else { fail('for-you still cold', warm.body); }
    }

  } finally {
    if (userId) await cleanup(userId);
    await pool.end();
  }
}

main();

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// GET /api/proxy/image?url=...
// Harici resim CDN'lerini proxy'ler (hotlink korumasını aşmak için)
router.get('/image', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: 'url parametresi gerekli' });

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        // Referer yok → hotlink korumasını geçer
      },
    });

    const contentType = (response.headers['content-type'] as string) || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(response.data);
  } catch {
    return res.status(404).send();
  }
});

router.get('/page', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send('url parametresi gerekli');
  if (!isSafeHttpUrl(url)) return res.status(400).send('gecersiz url');

  try {
    const response = await axios.get<string>(url, {
      responseType: 'text',
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const finalUrl = response.request?.res?.responseUrl || url;
    const contentType = String(response.headers['content-type'] || '');
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return res.status(415).send('sayfa html olarak acilamadi');
    }

    const baseTag = `<base href="${finalUrl.replace(/"/g, '&quot;')}">`;
    const html = String(response.data || '');
    const withBase = /<head[^>]*>/i.test(html)
      ? html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
      : `${baseTag}${html}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(withBase);
  } catch (error) {
    console.error('[Proxy] Page fetch failed:', url, error instanceof Error ? error.message : String(error));
    return res.status(502).send('kaynak sayfa yuklenemedi');
  }
});

export default router;

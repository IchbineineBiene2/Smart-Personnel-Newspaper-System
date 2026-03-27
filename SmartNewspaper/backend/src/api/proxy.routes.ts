import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

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

export default router;

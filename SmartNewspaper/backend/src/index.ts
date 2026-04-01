import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import newsRouter from './api/news.routes';
import proxyRouter from './api/proxy.routes';
import eventsRouter from './api/events.routes';
import similarityRouter from './api/similarity.routes';
import { startScheduler } from './scheduler/newsScheduler';
import { runMigrations } from './db/migrate';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/news', newsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/events', eventsRouter);
app.use('/api/similarity', similarityRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function bootstrap(): Promise<void> {
  try {
    // DB migration'larını uygula
    await runMigrations();
  } catch (err) {
    console.error('[Bootstrap] Migration hatası:', (err as Error).message);
    console.error('[Bootstrap] Sunucu DB olmadan başlatılamıyor — çıkılıyor.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT} adresinde çalışıyor`);
    startScheduler();
  });
}

bootstrap();

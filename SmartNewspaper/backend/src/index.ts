import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import newsRouter from './api/news.routes';
import proxyRouter from './api/proxy.routes';
import { startScheduler } from './scheduler/newsScheduler';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/news', newsRouter);
app.use('/api/proxy', proxyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] http://localhost:${PORT} adresinde çalışıyor`);
  startScheduler();
});

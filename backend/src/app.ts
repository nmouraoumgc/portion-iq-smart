import express from 'express';
import cors from 'cors';
import householdsRouter from './routes/households';
import foodsRouter from './routes/foods';
import recommendationsRouter from './routes/recommendations';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PortionIQ API' });
});

app.use('/api/households', householdsRouter);
app.use('/api/foods', foodsRouter);
app.use('/api/recommendations', recommendationsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;

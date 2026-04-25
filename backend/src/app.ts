import express from 'express';
import cors from 'cors';
import breakoutRoutes from './routes/breakoutRoutes';
import dividendRoutes from './routes/dividendRoutes';
import optionsRoutes from './routes/optionsRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/breakout', breakoutRoutes);
app.use('/api/dividends', dividendRoutes);
app.use('/api/options', optionsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;

import Fastify from 'fastify';
import cors from '@fastify/cors';
import breakoutRoutes from './routes/breakoutRoutes';
import dividendRoutes from './routes/dividendRoutes';
import optionsRoutes from './routes/optionsRoutes';
import authRoutes from './routes/authRoutes';
import marketRoutes from './routes/marketRoutes';
import tradeRoutes from './routes/tradeRoutes';

const app = Fastify({ logger: true });

// Middleware
app.register(cors);

// Routes
app.register(breakoutRoutes, { prefix: '/api/breakout' });
app.register(dividendRoutes, { prefix: '/api/dividends' });
app.register(optionsRoutes, { prefix: '/api/options' });
app.register(authRoutes, { prefix: '/api/auth' });
app.register(marketRoutes, { prefix: '/api/market' });
app.register(tradeRoutes, { prefix: '/api/trades' });

// Health check
app.get('/api/version', async () => {
  return { version: '1.1.0-ml-integrated', timestamp: new Date().toISOString() };
});

app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

export default app;

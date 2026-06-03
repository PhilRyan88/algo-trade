import Fastify from 'fastify';
import cors from '@fastify/cors';
import breakoutRoutes from '../api/routes/breakoutRoutes';
import dividendRoutes from '../api/routes/dividendRoutes';
import optionsRoutes from '../api/routes/optionsRoutes';
import authRoutes from '../api/routes/authRoutes';
import marketRoutes from '../api/routes/marketRoutes';
import tradeRoutes from '../api/routes/tradeRoutes';

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

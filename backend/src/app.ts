import Fastify from 'fastify';
import cors from '@fastify/cors';
import breakoutRoutes from './routes/breakoutRoutes';
import dividendRoutes from './routes/dividendRoutes';
import optionsRoutes from './routes/optionsRoutes';
import authRoutes from './routes/authRoutes';
import marketRoutes from './routes/marketRoutes';

const app = Fastify({ logger: true });

// Middleware
app.register(cors);

// Routes
app.register(breakoutRoutes, { prefix: '/api/breakout' });
app.register(dividendRoutes, { prefix: '/api/dividends' });
app.register(optionsRoutes, { prefix: '/api/options' });
app.register(authRoutes, { prefix: '/api/auth' });
app.register(marketRoutes, { prefix: '/api/market' });

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

export default app;

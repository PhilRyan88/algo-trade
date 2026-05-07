import Fastify from 'fastify';
import cors from '@fastify/cors';
import breakoutRoutes from './routes/breakoutRoutes';
import dividendRoutes from './routes/dividendRoutes';
import optionsRoutes from './routes/optionsRoutes';

const app = Fastify({ logger: true });

// Middleware
app.register(cors);

// Routes
app.register(breakoutRoutes, { prefix: '/api/breakout' });
app.register(dividendRoutes, { prefix: '/api/dividends' });
app.register(optionsRoutes, { prefix: '/api/options' });

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

export default app;

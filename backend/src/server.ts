import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import fastifyRedis from '@fastify/redis';
import fastifyWebsocket from '@fastify/websocket';
import { setupCronJobs } from './cron/scanner';

import breakoutRoutes from './routes/breakout';

const server = Fastify({ logger: true });

// Register Plugins
server.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/algotrade'
});

server.register(fastifyRedis, {
  host: process.env.REDIS_HOST || '127.0.0.1'
});

server.register(fastifyWebsocket);

// Register Routes
server.register(async function (fastify) {
  fastify.get('/api/ws', { websocket: true }, (connection, req) => {
    connection.socket.on('message', (message: any) => {
      // Logic for real-time options/trade signals
      connection.socket.send(`Received: ${message}`);
    });
  });
});

server.register(breakoutRoutes, { prefix: '/api/breakout' });

// Initialize server
const start = async () => {
  try {
    setupCronJobs(server);
    await server.listen({ port: 3000, host: '0.0.0.0' });
    server.log.info(`Server listening on http://localhost:3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

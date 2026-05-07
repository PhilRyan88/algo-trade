import { WebSocketServer } from 'ws';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { setupCronJobs } from './cron/scanner';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Setup Cron Jobs
    setupCronJobs();

    const wss = new WebSocketServer({ server: app.server, path: '/api/ws' });

    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        // Logic for real-time options/trade signals
        ws.send(`Received: ${message}`);
      });
    });

    // Start Server
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${env.PORT}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

import { WebSocketServer } from 'ws';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { setupCronJobs } from './cron/scanner';

const startServer = async () => {
  console.log('🚀 Server starting process initiated...');
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Setup Cron Jobs
    setupCronJobs();

    // 3. Start Listening (Render needs this to happen quickly)
    const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`✅ Server running at ${address}`);

    // 4. Setup WebSocket (Do this AFTER the server is listening)
    const wss = new WebSocketServer({ server: app.server, path: '/api/ws' });

    wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket connection');
      ws.on('message', (message) => {
        ws.send(`Received: ${message}`);
      });
    });

  } catch (error) {
    console.error('❌ CRITICAL: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

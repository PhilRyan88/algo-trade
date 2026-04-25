import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { setupCronJobs } from './cron/scanner';

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/api/ws' });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Logic for real-time options/trade signals
    ws.send(`Received: ${message}`);
  });
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Setup Cron Jobs
    setupCronJobs();

    // Start Server
    server.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

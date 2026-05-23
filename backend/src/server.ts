import { WebSocketServer } from 'ws';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { setupCronJobs } from './cron/scanner';
import { angelOneService } from './services/angelOneService';
import { strategyEngine } from './services/strategyEngine';

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
      
      const marketDataListener = (data: any) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'market_data', data }));
        }
      };

      const strategyLogListener = (logData: any) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'strategy_log', data: logData }));
        }
      };

      angelOneService.on('market_data', marketDataListener);
      strategyEngine.on('strategy_log', strategyLogListener);

      ws.on('message', (message) => {
        const msg = message.toString();
        if (msg === 'ping') ws.send('pong');
      });

      ws.on('close', () => {
        angelOneService.off('market_data', marketDataListener);
        strategyEngine.off('strategy_log', strategyLogListener);
      });
    });

    // 5. Strategy Engine is ready (Manual start required)
    console.log('🤖 Strategy Engine initialized in STOPPED state. Start it manually from the dashboard.');

    // 6. Start Self-Pinging Health Check to prevent free-tier host (Render) spin-down due to inactivity
    setInterval(() => {
      const http = require('http');
      const port = env.PORT || 5000;
      console.log(`🤖 Self-pinging health check on port ${port} to prevent host spin-down...`);
      http.get(`http://localhost:${port}/health`, (res: any) => {
        res.resume();
      }).on('error', (err: any) => {
        console.warn('⚠️ Self-ping check failed:', err.message);
      });
    }, 10 * 60 * 1000); // 10 minutes

  } catch (error) {
    console.error('❌ CRITICAL: Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
// Restart triggered at 2026-05-14 09:07:00

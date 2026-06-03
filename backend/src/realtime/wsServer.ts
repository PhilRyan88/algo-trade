import { WebSocketServer } from 'ws';
import { angelOneService } from '../market/marketData/angelOneService';
import { strategyEngine } from '../strategy/strategyManager';

export const setupWebSocketServer = (server: any) => {
  const wss = new WebSocketServer({ server, path: '/api/ws' });

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

  return wss;
};

import { FastifyInstance } from 'fastify';
import { PaperTrade } from '../models/PaperTrade';
import { strategyEngine } from '../services/strategyEngine';
import { mlService } from '../services/mlService';
import { backtestService } from '../services/backtestService';
import { getStartingCapital, setStartingCapital } from '../services/settingsService';

export default async function tradeRoutes(fastify: FastifyInstance) {
  console.log('🔌 Registering Trade Routes (including ML endpoints)...');

  // ML Endpoints (at the top to avoid conflicts)
  fastify.get('/ml/status', async () => {
    return { success: true, data: mlService.getStatus() };
  });

  fastify.post('/ml/train/backtest', async () => {
    console.log('🤖 ML: Received backtest training request');
    // Start training in background
    backtestService.runBacktestTraining()
      .then(result => console.log('✅ ML: Backtest training complete:', result))
      .catch(err => console.error('❌ ML: Backtest training failed:', err));

    return { success: true, message: 'Backtest training started in background' };
  });

  // Get all trades (with optional filters)
  fastify.get('/history', async (request, reply) => {
    const { status, symbol, limit, page } = request.query as any;
    const filter: any = {};

    if (status) filter.status = status;
    if (symbol) filter.symbol = symbol;

    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 50;

    const [trades, total] = await Promise.all([
      PaperTrade.find(filter)
        .sort({ openedAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      PaperTrade.countDocuments(filter)
    ]);

    return {
      success: true,
      data: trades,
      pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) }
    };
  });

  // Get today's trades
  fastify.get('/today', async (request, reply) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const trades = await PaperTrade.find({
      openedAt: { $gte: startOfDay }
    }).sort({ openedAt: -1 });

    const openTrades = trades.filter(t => t.status === 'OPEN');
    const closedTrades = trades.filter(t => t.status !== 'OPEN');
    const totalPnl = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
    const winCount = closedTrades.filter(t => t.pnl > 0).length;
    const lossCount = closedTrades.filter(t => t.pnl < 0).length;

    return {
      success: true,
      data: {
        trades,
        summary: {
          totalTrades: trades.length,
          openTrades: openTrades.length,
          closedTrades: closedTrades.length,
          totalPnl,
          winCount,
          lossCount,
          winRate: closedTrades.length > 0 ? ((winCount / closedTrades.length) * 100).toFixed(1) : '0.0'
        }
      }
    };
  });

  // Get overall stats
  fastify.get('/stats', async (request, reply) => {
    const allTrades = await PaperTrade.find({ status: { $ne: 'OPEN' } });
    const totalPnl = allTrades.reduce((acc, t) => acc + t.pnl, 0);
    const wins = allTrades.filter(t => t.pnl > 0);
    const losses = allTrades.filter(t => t.pnl < 0);

    // Strategy breakdown
    const strategyStats: Record<string, { count: number; pnl: number; wins: number }> = {};
    for (const t of allTrades) {
      if (!strategyStats[t.strategy]) {
        strategyStats[t.strategy] = { count: 0, pnl: 0, wins: 0 };
      }
      strategyStats[t.strategy].count++;
      strategyStats[t.strategy].pnl += t.pnl;
      if (t.pnl > 0) strategyStats[t.strategy].wins++;
    }

    const startingCapital = await getStartingCapital();
    const currentBalance = startingCapital + totalPnl;

    return {
      success: true,
      data: {
        totalTrades: allTrades.length,
        totalPnl,
        startingBalance: startingCapital,
        currentBalance,
        winCount: wins.length,
        lossCount: losses.length,
        winRate: allTrades.length > 0 ? ((wins.length / allTrades.length) * 100).toFixed(1) : '0.0',
        avgWin: wins.length > 0 ? (wins.reduce((a, t) => a + t.pnl, 0) / wins.length).toFixed(2) : '0',
        avgLoss: losses.length > 0 ? (losses.reduce((a, t) => a + t.pnl, 0) / losses.length).toFixed(2) : '0',
        strategies: strategyStats,
        openTrades: await PaperTrade.countDocuments({ status: 'OPEN' })
      }
    };
  });

  // Engine control
  fastify.get('/engine/status', async () => {
    return { success: true, isRunning: strategyEngine.getStatus() };
  });

  fastify.post('/engine/start', async () => {
    strategyEngine.start();
    return { success: true, message: 'Strategy engine started' };
  });

  fastify.post('/engine/stop', async () => {
    strategyEngine.stop();
    return { success: true, message: 'Strategy engine stopped' };
  });

  // Settings
  fastify.get('/settings', async () => {
    const startingCapital = await getStartingCapital();
    return { success: true, data: { startingCapital } };
  });

  fastify.post('/settings', async (request, reply) => {
    const { startingCapital } = request.body as any;
    if (typeof startingCapital !== 'number' || startingCapital <= 0) {
      return reply.code(400).send({ success: false, message: 'Starting capital must be a positive number' });
    }
    await setStartingCapital(startingCapital);
    return { success: true, message: 'Starting capital updated successfully' };
  });
}

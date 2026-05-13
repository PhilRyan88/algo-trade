import { angelOneService } from './angelOneService';
import { PaperTrade, IPaperTrade } from '../models/PaperTrade';

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Signal {
  type: 'BUY' | 'SELL';
  strategy: string;
  price: number;
  stopLoss: number;
  target: number;
  confidence: number;
  reason: string;
}

// ─── Helper: EMA calculation ────────────────────────────────────────
function calcEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);

  // First EMA = SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

// ─── Helper: ATR (Average True Range) ──────────────────────────────
function calcATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    const c = candles[candles.length - i];
    const p = candles[candles.length - i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    trSum += tr;
  }
  return trSum / period;
}

// ─── Helper: Find swing highs/lows ──────────────────────────────────
function findSwingHighs(candles: Candle[], lookback: number = 5): { index: number; price: number }[] {
  const swings: { index: number; price: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].high <= candles[i - j].high || candles[i].high <= candles[i + j].high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) swings.push({ index: i, price: candles[i].high });
  }
  return swings;
}

function findSwingLows(candles: Candle[], lookback: number = 5): { index: number; price: number }[] {
  const swings: { index: number; price: number }[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i].low >= candles[i - j].low || candles[i].low >= candles[i + j].low) {
        isLow = false;
        break;
      }
    }
    if (isLow) swings.push({ index: i, price: candles[i].low });
  }
  return swings;
}

// ════════════════════════════════════════════════════════════════════
// STRATEGY 1: Fair Value Gap (FVG)
// ════════════════════════════════════════════════════════════════════
function detectFVG(candles: Candle[], atr: number): Signal[] {
  const signals: Signal[] = [];
  if (candles.length < 10) return signals;

  const last = candles.length - 1;
  const current = candles[last];

  // Look for FVG in recent candles (last 20)
  for (let i = Math.max(2, last - 20); i < last - 1; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG: gap between candle1.high and candle3.low
    if (c1.high < c3.low) {
      const fvgTop = c3.low;
      const fvgBottom = c1.high;
      const fvgMid = (fvgTop + fvgBottom) / 2;

      // Check if current price is entering the FVG zone (retracement)
      if (current.low <= fvgTop && current.close >= fvgBottom && current.close > current.open) {
        const sl = fvgBottom - atr * 0.5;
        const risk = current.close - sl;
        signals.push({
          type: 'BUY',
          strategy: 'FVG',
          price: current.close,
          stopLoss: sl,
          target: current.close + risk * 2, // 1:2 RR
          confidence: 75,
          reason: `Bullish FVG fill at ${fvgMid.toFixed(2)} zone with bullish close`
        });
        break; // One signal per scan
      }
    }

    // Bearish FVG: gap between candle3.high and candle1.low
    if (c1.low > c3.high) {
      const fvgTop = c1.low;
      const fvgBottom = c3.high;
      const fvgMid = (fvgTop + fvgBottom) / 2;

      if (current.high >= fvgBottom && current.close <= fvgTop && current.close < current.open) {
        const sl = fvgTop + atr * 0.5;
        const risk = sl - current.close;
        signals.push({
          type: 'SELL',
          strategy: 'FVG',
          price: current.close,
          stopLoss: sl,
          target: current.close - risk * 2,
          confidence: 75,
          reason: `Bearish FVG fill at ${fvgMid.toFixed(2)} zone with bearish close`
        });
        break;
      }
    }
  }
  return signals;
}

// ════════════════════════════════════════════════════════════════════
// STRATEGY 2: Liquidity Sweep
// ════════════════════════════════════════════════════════════════════
function detectLiquiditySweep(candles: Candle[], atr: number): Signal[] {
  const signals: Signal[] = [];
  if (candles.length < 30) return signals;

  const last = candles.length - 1;
  const current = candles[last];
  const prev = candles[last - 1];

  const swingHighs = findSwingHighs(candles.slice(0, last - 1), 3);
  const swingLows = findSwingLows(candles.slice(0, last - 1), 3);

  // Bearish liquidity sweep: price swept above a swing high but closed below it
  for (const sh of swingHighs.slice(-5)) {
    if (prev.high > sh.price && current.close < sh.price && current.close < current.open) {
      const sl = prev.high + atr * 0.3;
      const risk = sl - current.close;
      signals.push({
        type: 'SELL',
        strategy: 'LIQUIDITY_SWEEP',
        price: current.close,
        stopLoss: sl,
        target: current.close - risk * 2.5,
        confidence: 80,
        reason: `Swept swing high at ${sh.price.toFixed(2)} and rejected — bearish reversal`
      });
      break;
    }
  }

  // Bullish liquidity sweep: price swept below a swing low but closed above it
  for (const sl_point of swingLows.slice(-5)) {
    if (prev.low < sl_point.price && current.close > sl_point.price && current.close > current.open) {
      const sl = prev.low - atr * 0.3;
      const risk = current.close - sl;
      signals.push({
        type: 'BUY',
        strategy: 'LIQUIDITY_SWEEP',
        price: current.close,
        stopLoss: sl,
        target: current.close + risk * 2.5,
        confidence: 80,
        reason: `Swept swing low at ${sl_point.price.toFixed(2)} and recovered — bullish reversal`
      });
      break;
    }
  }

  return signals;
}

// ════════════════════════════════════════════════════════════════════
// STRATEGY 3: Breakout with Momentum
// ════════════════════════════════════════════════════════════════════
function detectBreakoutSignal(candles: Candle[], atr: number): Signal[] {
  const signals: Signal[] = [];
  if (candles.length < 30) return signals;

  const last = candles.length - 1;
  const current = candles[last];
  const consolidationLen = 20;

  // Find consolidation range from recent candles (excluding the last 2)
  const rangeCandles = candles.slice(last - consolidationLen - 2, last - 2);
  const rangeHigh = Math.max(...rangeCandles.map(c => c.high));
  const rangeLow = Math.min(...rangeCandles.map(c => c.low));
  const rangeSize = rangeHigh - rangeLow;

  // Only consider tight consolidations (range < 1.5x ATR)
  if (rangeSize > atr * 1.5) return signals;

  // Bullish breakout: close above range high with strong candle
  if (current.close > rangeHigh && current.close > current.open) {
    const bodySize = Math.abs(current.close - current.open);
    if (bodySize > atr * 0.3) { // Momentum confirmation
      const sl = rangeLow - atr * 0.2;
      signals.push({
        type: 'BUY',
        strategy: 'BREAKOUT',
        price: current.close,
        stopLoss: sl,
        target: current.close + rangeSize * 1.5,
        confidence: 70,
        reason: `Bullish breakout above ${rangeHigh.toFixed(2)} consolidation range`
      });
    }
  }

  // Bearish breakout
  if (current.close < rangeLow && current.close < current.open) {
    const bodySize = Math.abs(current.close - current.open);
    if (bodySize > atr * 0.3) {
      const sl = rangeHigh + atr * 0.2;
      signals.push({
        type: 'SELL',
        strategy: 'BREAKOUT',
        price: current.close,
        stopLoss: sl,
        target: current.close - rangeSize * 1.5,
        confidence: 70,
        reason: `Bearish breakout below ${rangeLow.toFixed(2)} consolidation range`
      });
    }
  }

  return signals;
}

// ════════════════════════════════════════════════════════════════════
// STRATEGY 4: EMA Crossover with Trend Confirmation
// ════════════════════════════════════════════════════════════════════
function detectEMACrossover(candles: Candle[], atr: number): Signal[] {
  const signals: Signal[] = [];
  if (candles.length < 25) return signals;

  const closes = candles.map(c => c.close);
  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);

  const last = candles.length - 1;
  const prev = last - 1;

  if (!ema9[last] || !ema21[last] || !ema9[prev] || !ema21[prev]) return signals;

  const current = candles[last];

  // Bullish crossover: EMA9 crosses above EMA21
  if (ema9[prev] <= ema21[prev] && ema9[last] > ema21[last] && current.close > current.open) {
    const recentLow = Math.min(...candles.slice(last - 5, last + 1).map(c => c.low));
    const sl = recentLow - atr * 0.3;
    const risk = current.close - sl;
    signals.push({
      type: 'BUY',
      strategy: 'EMA_CROSSOVER',
      price: current.close,
      stopLoss: sl,
      target: current.close + risk * 2,
      confidence: 65,
      reason: `EMA 9/21 bullish crossover confirmed with bullish candle`
    });
  }

  // Bearish crossover
  if (ema9[prev] >= ema21[prev] && ema9[last] < ema21[last] && current.close < current.open) {
    const recentHigh = Math.max(...candles.slice(last - 5, last + 1).map(c => c.high));
    const sl = recentHigh + atr * 0.3;
    const risk = sl - current.close;
    signals.push({
      type: 'SELL',
      strategy: 'EMA_CROSSOVER',
      price: current.close,
      stopLoss: sl,
      target: current.close - risk * 2,
      confidence: 65,
      reason: `EMA 9/21 bearish crossover confirmed with bearish candle`
    });
  }

  return signals;
}

// ════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ════════════════════════════════════════════════════════════════════
class StrategyEngine {
  private isRunning = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private symbols: string[] = ['NIFTY', 'BANKNIFTY'];
  private lotSize: Record<string, number> = { NIFTY: 25, BANKNIFTY: 15 };
  private maxOpenTrades = 4; // Max concurrent open trades
  private readonly BROKERAGE_FEE = 45; // Cost of 1 buy + 1 sell lot

  getStatus() {
    return this.isRunning;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 Strategy Engine started — scanning every 5 minutes during market hours');

    // Run immediately, then every 5 minutes
    this.runScan();
    this.scanInterval = setInterval(() => this.runScan(), 5 * 60 * 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('🤖 Strategy Engine stopped');
  }

  private isMarketOpen(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const time = hours * 60 + minutes;

    // Mon-Fri, 9:15 AM to 3:20 PM IST
    if (day === 0 || day === 6) return false;
    return time >= 9 * 60 + 15 && time <= 15 * 60 + 20;
  }

  private async runScan() {
    try {
      // Check if mongoose is connected before any DB operations
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        // DB not connected, skip silently
        return;
      }

      if (!this.isMarketOpen()) {
        // Close any remaining open positions at EOD
        await this.closeAllOpenPositions('Market closed — EOD exit');
        return;
      }

      const isReady = await angelOneService.ensureAuthenticated();
      if (!isReady) {
        console.warn('🤖 Strategy Engine: Not authenticated, skipping scan');
        return;
      }

      // Check balance before taking new trades
      const INITIAL_BALANCE = 15000;
      const closedTrades = await PaperTrade.find({ status: { $ne: 'OPEN' } });
      const totalPnl = closedTrades.reduce((acc, t) => acc + t.pnl, 0);
      const currentBalance = INITIAL_BALANCE + totalPnl;

      if (currentBalance <= 0) {
        console.log('🤖 Strategy Engine: Trading halted due to zero/negative balance.');
        return;
      }

      // Check open trades and manage them (SL/Target monitoring)
      await this.manageOpenTrades();

      // Count open trades
      const openCount = await PaperTrade.countDocuments({ status: 'OPEN' });
      if (openCount >= this.maxOpenTrades) {
        console.log(`🤖 Max open trades reached (${openCount}/${this.maxOpenTrades}), skipping signal scan`);
        return;
      }

      // Scan each symbol for signals
      for (const symbol of this.symbols) {
        try {
          const candles = await angelOneService.getHistoricalData(symbol);
          if (candles.length < 30) {
            console.log(`🤖 Not enough candle data for ${symbol} (${candles.length})`);
            continue;
          }

          const atr = calcATR(candles);
          if (atr === 0) continue;

          // Run all strategies
          const allSignals: Signal[] = [
            ...detectLiquiditySweep(candles, atr),
            ...detectFVG(candles, atr),
            ...detectBreakoutSignal(candles, atr),
            ...detectEMACrossover(candles, atr),
          ];

          // --- CONFLUENCE LOGIC ---
          // Filter signals by direction
          const buySignals = allSignals.filter(s => s.type === 'BUY');
          const sellSignals = allSignals.filter(s => s.type === 'SELL');

          let bestSignal: Signal | null = null;
          
          // Only take trade if at least 2 strategies agree (confluence)
          if (buySignals.length >= 2) {
            bestSignal = buySignals.sort((a, b) => b.confidence - a.confidence)[0];
            bestSignal.reason = `CONFLUENCE (${buySignals.length} strategies): ${buySignals.map(s => s.strategy).join(', ')}`;
          } else if (sellSignals.length >= 2) {
            bestSignal = sellSignals.sort((a, b) => b.confidence - a.confidence)[0];
            bestSignal.reason = `CONFLUENCE (${sellSignals.length} strategies): ${sellSignals.map(s => s.strategy).join(', ')}`;
          }

          if (bestSignal) {
            // Check if expected profit covers brokerage fee
            const qty = this.lotSize[symbol] || 25;
            const expectedProfit = Math.abs(bestSignal.target - bestSignal.price) * qty;
            
            if (expectedProfit <= this.BROKERAGE_FEE * 1.5) {
              console.log(`🤖 Skipping ${symbol} ${bestSignal.type} - Expected profit (₹${expectedProfit.toFixed(2)}) is too low to cover brokerage.`);
              continue;
            }

            // Check for duplicate open trade on same symbol
            const existing = await PaperTrade.findOne({
              symbol,
              status: 'OPEN'
            });

            if (!existing) {
              await this.executeTrade(symbol, bestSignal);
            }
          }
        } catch (err) {
          console.error(`🤖 Error scanning ${symbol}:`, err);
        }
      }
    } catch (err) {
      console.error('🤖 Strategy Engine scan error (non-fatal):', err instanceof Error ? err.message : err);
    }
  }

  private async executeTrade(symbol: string, signal: Signal) {
    const qty = this.lotSize[symbol] || 25;

    const trade = new PaperTrade({
      symbol,
      type: signal.type,
      strategy: signal.strategy,
      entryPrice: signal.price,
      stopLoss: signal.stopLoss,
      target: signal.target,
      quantity: qty,
      pnl: 0,
      status: 'OPEN',
      confidence: signal.confidence,
      reason: signal.reason,
      openedAt: new Date(),
    });

    await trade.save();
    console.log(
      `🤖 TRADE EXECUTED: ${signal.type} ${symbol} @ ${signal.price.toFixed(2)} ` +
      `| SL: ${signal.stopLoss.toFixed(2)} | TP: ${signal.target.toFixed(2)} ` +
      `| Reason: ${signal.reason}`
    );
  }

  private async manageOpenTrades() {
    const openTrades = await PaperTrade.find({ status: 'OPEN' });
    if (openTrades.length === 0) return;

    for (const trade of openTrades) {
      try {
        const candles = await angelOneService.getHistoricalData(trade.symbol);
        if (candles.length === 0) continue;

        const lastCandle = candles[candles.length - 1];
        const currentPrice = lastCandle.close;

        if (trade.type === 'BUY') {
          // Check stop loss
          if (currentPrice <= trade.stopLoss) {
            await this.closeTrade(trade, currentPrice, 'SL_HIT');
          }
          // Check target
          else if (currentPrice >= trade.target) {
            await this.closeTrade(trade, currentPrice, 'TARGET_HIT');
          }
        } else {
          // SELL trade
          if (currentPrice >= trade.stopLoss) {
            await this.closeTrade(trade, currentPrice, 'SL_HIT');
          }
          else if (currentPrice <= trade.target) {
            await this.closeTrade(trade, currentPrice, 'TARGET_HIT');
          }
        }
      } catch (err) {
        console.error(`🤖 Error managing trade ${trade._id}:`, err);
      }
    }
  }

  private async closeTrade(trade: IPaperTrade, exitPrice: number, status: 'TARGET_HIT' | 'SL_HIT' | 'CLOSED') {
    // Gross P&L
    let pnl = trade.type === 'BUY'
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;

    // Deduct brokerage fee (₹45)
    pnl -= this.BROKERAGE_FEE;

    trade.exitPrice = exitPrice;
    trade.pnl = pnl;
    trade.status = status;
    trade.closedAt = new Date();
    await trade.save();

    const emoji = pnl >= 0 ? '💰' : '📉';
    console.log(
      `${emoji} TRADE CLOSED (${status}): ${trade.type} ${trade.symbol} ` +
      `| Entry: ${trade.entryPrice.toFixed(2)} → Exit: ${exitPrice.toFixed(2)} ` +
      `| P&L (Net): ${pnl >= 0 ? '+' : ''}₹${pnl.toFixed(2)} (Incl. ₹${this.BROKERAGE_FEE} fee)`
    );
  }

  private async closeAllOpenPositions(reason: string) {
    const openTrades = await PaperTrade.find({ status: 'OPEN' });
    for (const trade of openTrades) {
      try {
        const candles = await angelOneService.getHistoricalData(trade.symbol);
        const exitPrice = candles.length > 0 ? candles[candles.length - 1].close : trade.entryPrice;
        await this.closeTrade(trade, exitPrice, 'CLOSED');
      } catch (err) {
        console.error(`🤖 Error closing trade ${trade._id}:`, err);
      }
    }
  }
}

export const strategyEngine = new StrategyEngine();

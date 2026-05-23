import mongoose from 'mongoose';
import { EventEmitter } from 'events';
import { angelOneService } from './angelOneService';
import { PaperTrade } from '../models/PaperTrade';
import { indicatorEngine, IndicatorValues } from './strategy/indicatorEngine';
import { signalEngine } from './strategy/signalEngine';
import { scoringEngine } from './strategy/scoringEngine';
import { riskManager } from './strategy/riskManager';
import { orderExecutor } from './strategy/orderExecutor';
import { positionManager, closeAllOpenPositions } from './strategy/positionManager';
import { tradeLogger } from './strategy/tradeLogger';

class StrategyEngine extends EventEmitter {
  constructor() {
    super();
  }
  private isRunning = false;
  private latestSpotPrices: Record<string, number> = {
    NIFTY: 22000,
    BANKNIFTY: 46000
  };
  private lastProcessedCandleTimestamp: Record<string, string> = {
    NIFTY: '',
    BANKNIFTY: ''
  };

  // Event listener reference so we can detach it on stop
  private marketDataListener = async (tick: any) => {
    await this.onTick(tick);
  };

  getStatus(): boolean {
    return this.isRunning;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 Redesigned Strategy Engine started — Listening to WebSocket ticks...');

    // Subscribe to market data ticks
    angelOneService.on('market_data', this.marketDataListener);

    // Automatically trigger background batch retraining on startup
    const { backtestService } = require('./backtestService');
    console.log('🤖 ML: Automatically launching background model retraining on engine start...');
    backtestService.runBacktestTraining()
      .then((res: any) => console.log('✅ ML: Auto-retraining finished successfully on startup:', res))
      .catch((err: any) => console.error('❌ ML: Auto-retraining failed on startup:', err));
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    
    // Detach WebSocket tick listener
    angelOneService.off('market_data', this.marketDataListener);
    
    console.log('🤖 Redesigned Strategy Engine stopped.');
  }

  /**
   * Helper to check market hours in Indian Standard Time (IST)
   * Market open Mon-Fri, 9:15 AM to 3:30 PM IST
   */
  private checkMarketOpen(): { isOpen: boolean; isEodClose: boolean } {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (day === 0 || day === 6) {
      return { isOpen: false, isEodClose: false };
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    
    const [hours, minutes] = formatter.format(now).split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;

    // Open from 9:15 AM to 3:30 PM
    const isOpen = timeInMinutes >= 9 * 60 + 15 && timeInMinutes <= 15 * 60 + 30;
    
    // EOD close at 3:20 PM IST (close all remaining trades before market closes at 3:30)
    const isEodClose = timeInMinutes >= 15 * 60 + 20;

    return { isOpen, isEodClose };
  }

  /**
   * Async-safe WebSocket Tick Event handler
   */
  private async onTick(tick: any): Promise<void> {
    if (!this.isRunning) return;

    try {
      // 0. Database guard
      if (mongoose.connection.readyState !== 1) return;

      // 1. Parse tick data
      const tokenStr = String(tick.token || '');
      const symbol = tokenStr.includes('26000') ? 'NIFTY' : tokenStr.includes('26009') ? 'BANKNIFTY' : null;
      if (!symbol) return;

      const rawLtp = tick.last_traded_price || tick.ltp;
      const ltp = Number(rawLtp) / 100; // Convert paisa to rupees
      if (!ltp || isNaN(ltp)) return;

      // Update latest spot price cache
      this.latestSpotPrices[symbol] = ltp;

      // 2. Check market hours and handle EOD close
      const hoursCheck = this.checkMarketOpen();
      if (hoursCheck.isEodClose) {
        await closeAllOpenPositions(this.latestSpotPrices);
        return;
      }
      if (!hoursCheck.isOpen) return;

      // 3. Fetch historical 1-minute candles from Angel One
      const oneMinCandles = await angelOneService.getHistoricalData(symbol);
      if (oneMinCandles.length < 30) {
        return;
      }

      // 4. Calculate 5-minute indicators
      const indicatorList = indicatorEngine(oneMinCandles);
      if (indicatorList.length < 3) {
        return;
      }

      // Latest completed (closed) candle is at index [length - 2]
      // Index [length - 1] represents the currently forming open candle
      const completedCandle = indicatorList[indicatorList.length - 2];
      const prevCompletedCandle = indicatorList[indicatorList.length - 3];

      // 5. Manage active positions in real-time on every tick
      await positionManager(ltp, prevCompletedCandle);

      // 6. Check if a new 5-minute candle has closed
      const candleTimestamp = completedCandle.timestamp;
      if (candleTimestamp === this.lastProcessedCandleTimestamp[symbol]) {
        // Already processed this candle close, skip strategy scan
        return;
      }

      // Set new processed timestamp
      this.lastProcessedCandleTimestamp[symbol] = candleTimestamp;
      console.log(`🕯️ [CANDLE CLOSE] New 5-minute candle completed for ${symbol} at ${candleTimestamp}`);

      // 7. Run Signal Scans on Closed Candle
      const signalReport = signalEngine(completedCandle);
      const scoreReport = scoringEngine(signalReport);

      const score = scoreReport.selectedScore;
      const signalGenerated = (scoreReport.selectedType === 'CE' ? 'BUY_CE' : scoreReport.selectedType === 'PE' ? 'BUY_PE' : 'NONE') as 'NONE' | 'BUY_CE' | 'BUY_PE';
      
      let rejectedReason = '';
      let optionStrike = 0;
      let optionType: 'CE' | 'PE' | 'NONE' = 'NONE';
      let premiumEntry = 0;

      // Check active positions to prevent double entries on same symbol
      const existingTrade = await PaperTrade.findOne({
        symbol: new RegExp('^' + symbol),
        status: 'OPEN'
      });

      const positionState = existingTrade ? 'OPEN' : 'NO_POSITION';

      if (scoreReport.selectedType !== 'NONE') {
        optionType = scoreReport.selectedType;
        optionStrike = symbol === 'BANKNIFTY' ? Math.round(ltp / 100) * 100 : Math.round(ltp / 50) * 50;
        
        // Approximate option premium for risk management sizing
        premiumEntry = symbol === 'BANKNIFTY' 
          ? Math.max(200, Math.min(450, Math.round(ltp * 0.0075))) 
          : Math.max(90, Math.min(200, Math.round(ltp * 0.0075)));

        if (existingTrade) {
          rejectedReason = 'Active position already exists on this symbol';
        } else {
          // Evaluate risk manager (drawdown limits, time filters, position sizing)
          const riskCheck = await riskManager(symbol, premiumEntry, candleTimestamp);
          if (!riskCheck.allowed) {
            rejectedReason = riskCheck.reason;
          } else {
            // Extract the 25 features representing this setup at entry!
            const { extractFeatures } = require('./featureExtractor');
            const entryFeatures = extractFeatures(oneMinCandles.slice(0, oneMinCandles.length - 1), {
              type: optionType === 'CE' ? 'BUY' : 'SELL',
              strategies: ['WEIGHTED_SCORING'],
              avgConfidence: score,
              entryPrice: ltp,
              stopLoss: ltp * 0.9, // approx SL spot
              target: ltp * 1.1 // approx TP spot
            });

            // Execute trade order!
            const trade = await orderExecutor({
              symbol,
              optionType,
              spotPrice: ltp,
              score,
              quantity: riskCheck.quantity,
              reason: `Weighted score is ${score} based on bullish/bearish alignment`,
              timestamp: candleTimestamp,
              entryFeatures
            });
            console.log(`🚀 [ORDER PLACED] Placed ATM option order: ${trade.symbol} x ${trade.quantity} @ premium ₹${trade.entryPrice.toFixed(2)}`);
          }
        }
      } else {
        rejectedReason = 'Score below threshold of 70';
      }

      const logPayload = {
        timestamp: new Date().toISOString(),
        symbol,
        spotPrice: ltp,
        optionStrike,
        optionType,
        vwap: completedCandle.vwap,
        ema9: completedCandle.ema9,
        rsi: completedCandle.rsi,
        atr: completedCandle.atr,
        volume: completedCandle.volume,
        score,
        signalGenerated,
        rejectedReason,
        positionState
      };

      // 8. Mandatory log format output
      tradeLogger(logPayload);

      // Emit event for WebSocket broadcasting
      this.emit('strategy_log', logPayload);

    } catch (err) {
      console.error('❌ Error inside strategyEngine onTick handler:', err);
    }
  }
}

export const strategyEngine = new StrategyEngine();
export default strategyEngine;

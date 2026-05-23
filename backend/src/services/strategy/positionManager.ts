import { PaperTrade, IPaperTrade } from '../../models/PaperTrade';
import { IndicatorValues } from './indicatorEngine';

const BROKERAGE_FEE = 45;

/**
 * Calculates current simulated premium price using Delta-based approximation
 */
export function getCurrentPremium(trade: IPaperTrade, spotPrice: number): number {
  const spotChange = spotPrice - trade.entrySpotPrice;
  if (trade.symbol.includes('CE')) {
    // Call Delta is ~0.5
    return trade.entryPrice + 0.5 * spotChange;
  } else if (trade.symbol.includes('PE')) {
    // Put Delta is ~-0.5
    return trade.entryPrice - 0.5 * spotChange;
  }
  return trade.entryPrice;
}

/**
 * positionManager
 * Iterates through all open trades to manage trailing stops, targets, and partial exits.
 */
export async function positionManager(
  latestSpot: number, 
  prevCandle: IndicatorValues | null
): Promise<void> {
  const openTrades = await PaperTrade.find({ status: 'OPEN' });
  if (openTrades.length === 0) return;

  for (const trade of openTrades) {
    try {
      // 1. Calculate simulated premium price
      const currentPremium = getCurrentPremium(trade, latestSpot);
      
      // 2. Trailing Stop Loss using previous 5-min candle structure (only if we have candle data)
      if (prevCandle) {
        let structuralSL = trade.trailSL;
        if (trade.symbol.includes('CE')) {
          // CE SL trailed using previous 5-min candle low
          structuralSL = trade.entryPrice + 0.5 * (prevCandle.low - trade.entrySpotPrice);
        } else if (trade.symbol.includes('PE')) {
          // PE SL trailed using previous 5-min candle high
          structuralSL = trade.entryPrice - 0.5 * (prevCandle.high - trade.entrySpotPrice);
        }

        // Only move SL up (or down for short/PE, but since premium is always bought, we want premium SL to go UP)
        // Since we are BUYING options (both CE and PE), their premiums rise when they are profitable.
        // Therefore, we always want the trailed premium SL to move UP (higher premium = locked profit).
        if (structuralSL > trade.trailSL) {
          trade.trailSL = Math.round(structuralSL * 100) / 100;
        }
      }

      // 3. Move SL to Breakeven after 20% gain
      const gained20Percent = currentPremium >= trade.entryPrice * 1.20;
      if (gained20Percent && !trade.hasMoveToBE) {
        trade.trailSL = trade.entryPrice; // Set SL to entry premium
        trade.hasMoveToBE = true;
        console.log(`🛡️ [RISK] Moved stop-loss to breakeven (₹${trade.entryPrice.toFixed(2)}) for ${trade.symbol}`);
      }

      // 4. Partial Exit at 30% gain (sell 50% quantity)
      const gained30Percent = currentPremium >= trade.entryPrice * 1.30;
      if (gained30Percent && !trade.isPartialExited) {
        const exitQty = Math.floor(trade.quantity * 0.5);
        if (exitQty > 0) {
          trade.isPartialExited = true;
          trade.partialExitPrice = currentPremium;
          trade.partialExitQty = exitQty;
          trade.quantity = trade.quantity - exitQty; // Remaining quantity
          console.log(`💰 [PARTIAL EXIT] Exited 50% of ${trade.symbol} (${exitQty} units) at ₹${currentPremium.toFixed(2)} (30% Target Hit)`);
        }
      }

      // 5. Check if Stop Loss (trailed SL or original SL) is hit
      if (currentPremium <= trade.trailSL) {
        await closePosition(trade, trade.trailSL, 'SL_HIT');
        continue;
      }

      // 6. Check if Final 50% Target is hit
      if (currentPremium >= trade.target) {
        await closePosition(trade, trade.target, 'TARGET_HIT');
        continue;
      }

      // 7. Update current running P&L
      let realizedPnl = 0;
      if (trade.isPartialExited && trade.partialExitPrice) {
        realizedPnl = (trade.partialExitPrice - trade.entryPrice) * trade.partialExitQty;
      }
      
      const unrealizedPnl = (currentPremium - trade.entryPrice) * trade.quantity;
      trade.pnl = Math.round((realizedPnl + unrealizedPnl) * 100) / 100;
      
      await trade.save();

    } catch (err) {
      console.error(`❌ Error managing active position ${trade.symbol}:`, err);
    }
  }
}

/**
 * Closes the position and locks in the final profit/loss
 */
export async function closePosition(
  trade: IPaperTrade, 
  exitPrice: number, 
  status: 'TARGET_HIT' | 'SL_HIT' | 'CLOSED'
): Promise<void> {
  let realizedPnl = 0;
  if (trade.isPartialExited && trade.partialExitPrice) {
    realizedPnl = (trade.partialExitPrice - trade.entryPrice) * trade.partialExitQty;
  }

  const remainingQty = trade.quantity;
  const remainingPnl = (exitPrice - trade.entryPrice) * remainingQty;
  
  // Final P&L including brokerage fee (₹45)
  const finalPnl = Math.round((realizedPnl + remainingPnl - BROKERAGE_FEE) * 100) / 100;

  trade.exitPrice = exitPrice;
  trade.pnl = finalPnl;
  trade.status = status;
  trade.closedAt = new Date();
  
  await trade.save();

  // Trigger Online Continuous Self-Training if features exist!
  if (trade.entryFeatures && trade.entryFeatures.length > 0) {
    const outcomeLabel = finalPnl > 0 ? 1 : 0;
    const { mlService } = require('../mlService');
    console.log(`🤖 ML [ONLINE SELF-TRAINING]: Completed trade ${trade.symbol}. Outcome: ${outcomeLabel === 1 ? 'WIN' : 'LOSS'}. Training model incrementally...`);
    mlService.train([trade.entryFeatures], [outcomeLabel])
      .then((res: any) => console.log(`✅ ML [ONLINE SELF-TRAINING]: Model successfully retrained incrementally in real-time.`))
      .catch((err: any) => console.error('❌ ML [ONLINE SELF-TRAINING]: Incremental self-training failed:', err));
  }

  const emoji = finalPnl >= 0 ? '💰' : '📉';
  console.log(
    `${emoji} [POSITION CLOSED] ${trade.symbol} (${status}) ` +
    `| Entry: ₹${trade.entryPrice.toFixed(2)} → Exit: ₹${exitPrice.toFixed(2)} ` +
    `| P&L (Net): ${finalPnl >= 0 ? '+' : ''}₹${finalPnl.toFixed(2)} (Brokerage ₹${BROKERAGE_FEE} deducted)`
  );
}

/**
 * EOD force close for all open positions when market closes
 */
export async function closeAllOpenPositions(spotPriceMap: Record<string, number>): Promise<void> {
  const openTrades = await PaperTrade.find({ status: 'OPEN' });
  for (const trade of openTrades) {
    try {
      // Find matching base index symbol (NIFTY or BANKNIFTY) to get exit spot
      const baseSymbol = trade.symbol.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY';
      const spotPrice = spotPriceMap[baseSymbol] || trade.entrySpotPrice;
      const currentPremium = getCurrentPremium(trade, spotPrice);
      
      await closePosition(trade, currentPremium, 'CLOSED');
    } catch (err) {
      console.error(`❌ Error closing position ${trade.symbol} during EOD close:`, err);
    }
  }
}

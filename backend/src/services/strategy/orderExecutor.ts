import { PaperTrade, IPaperTrade } from '../../models/PaperTrade';

export interface OrderDetails {
  symbol: string;
  optionType: 'CE' | 'PE';
  spotPrice: number;
  score: number;
  quantity: number;
  reason: string;
  timestamp: string;
  entryFeatures?: number[];
}

/**
 * Calculates ATM strike price based on symbol guidelines
 */
export function detectATMStrike(symbol: string, spotPrice: number): number {
  if (symbol.includes('BANKNIFTY')) {
    return Math.round(spotPrice / 100) * 100;
  }
  // Default to NIFTY
  return Math.round(spotPrice / 50) * 50;
}

/**
 * Simulates a realistic starting option premium (LTP)
 * ATM premiums represent approx 0.7% to 1% of index spot value
 */
export function estimateOptionPremium(symbol: string, spotPrice: number): number {
  if (symbol.includes('BANKNIFTY')) {
    // Approx 0.75% of spot, capped between 200 and 450
    const premium = spotPrice * 0.0075;
    return Math.max(200, Math.min(450, Math.round(premium)));
  }
  
  // NIFTY: Approx 0.75% of spot, capped between 90 and 200
  const premium = spotPrice * 0.0075;
  return Math.max(90, Math.min(200, Math.round(premium)));
}

/**
 * orderExecutor
 * Places the paper trade order and inserts it into the database
 */
export async function orderExecutor(details: OrderDetails): Promise<IPaperTrade> {
  const { symbol, optionType, spotPrice, score, quantity, reason, timestamp, entryFeatures } = details;

  // 1. Detect ATM Strike
  const optionStrike = detectATMStrike(symbol, spotPrice);

  // 2. Estimate Option Premium
  const entryPremium = estimateOptionPremium(symbol, spotPrice);

  // 3. Set Targets and Initial Stop Loss
  const stopLoss = Math.round(entryPremium * 0.8 * 100) / 100; // 20% SL
  const target = Math.round(entryPremium * 1.5 * 100) / 100; // 50% target

  // Create option trade contract symbol
  const expiryDate = new Date(timestamp);
  // Find nearest Thursday for option code (weekly contract representation)
  const daysUntilThursday = (4 - expiryDate.getDay() + 7) % 7;
  const thursday = new Date(expiryDate);
  thursday.setDate(expiryDate.getDate() + daysUntilThursday);
  
  const expiryStr = thursday.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');
  const optionSymbol = `${symbol} ${expiryStr} ${optionStrike} ${optionType}`;

  // 4. Create and Save the PaperTrade model
  const trade = new PaperTrade({
    symbol: optionSymbol,
    type: 'BUY',
    strategy: 'WEIGHTED_SCORING',
    entryPrice: entryPremium,
    exitPrice: null,
    stopLoss,
    target,
    quantity,
    pnl: 0,
    status: 'OPEN',
    confidence: score,
    mlScore: 0,
    reason,
    openedAt: new Date(timestamp),
    closedAt: null,
    // Options specific fields
    entrySpotPrice: spotPrice,
    optionStrike,
    optionType,
    trailSL: stopLoss,
    isPartialExited: false,
    partialExitPrice: null,
    partialExitQty: 0,
    initialQuantity: quantity,
    hasMoveToBE: false,
    entryFeatures: entryFeatures || []
  });

  await trade.save();
  return trade;
}

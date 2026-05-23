import { PaperTrade } from '../../models/PaperTrade';
import { getStartingCapital } from '../settingsService';

export interface RiskStatus {
  allowed: boolean;
  reason: string;
  quantity: number;
}

const LOT_SIZES: Record<string, number> = {
  NIFTY: 25,
  BANKNIFTY: 15
};

/**
 * Checks if the current time falls within valid trading windows (IST)
 */
export function checkTimeFilter(dateStr: string): { allowed: boolean; reason: string; isBest: boolean } {
  // Parse timestamp or use current local time
  const date = new Date(dateStr);
  
  // Convert date to Indian Standard Time (IST) components
  // Indian options trading is based on IST.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const formatted = formatter.format(date);
  const [hours, minutes] = formatted.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  // Avoid trades:
  // Before 9:20 AM (9*60 + 20 = 560 minutes)
  // Between 11:30 AM and 1:15 PM (11:30 = 690 mins, 13:15 = 795 mins)
  // After 3:00 PM (15:00 = 900 mins)
  if (timeInMinutes < 9 * 60 + 20) {
    return { allowed: false, reason: 'Time before 9:20 AM IST', isBest: false };
  }
  if (timeInMinutes >= 11 * 60 + 30 && timeInMinutes <= 13 * 60 + 15) {
    return { allowed: false, reason: 'Midday slump window (11:30 AM - 1:15 PM IST)', isBest: false };
  }
  if (timeInMinutes >= 15 * 60) {
    return { allowed: false, reason: 'EOD window (after 3:00 PM IST)', isBest: false };
  }

  // Best trading windows:
  // 9:20 - 10:45 (560 to 645)
  // 1:45 - 3:00 (825 to 900)
  const isBest = 
    (timeInMinutes >= 9 * 60 + 20 && timeInMinutes <= 10 * 60 + 45) ||
    (timeInMinutes >= 13 * 60 + 45 && timeInMinutes < 15 * 60);

  return { allowed: true, reason: '', isBest };
}

/**
 * riskManager
 * Evaluates risk limits and calculates the optimal quantity/lot size
 */
export async function riskManager(
  symbol: string,
  optionPremium: number,
  timestamp: string
): Promise<RiskStatus> {
  // 1. Time Filter
  const timeCheck = checkTimeFilter(timestamp);
  if (!timeCheck.allowed) {
    return { allowed: false, reason: timeCheck.reason, quantity: 0 };
  }

  // Get start of today in local/IST time zone
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch all trades opened today
  const todaysTrades = await PaperTrade.find({
    openedAt: { $gte: startOfToday }
  });

  // 2. Max 5 trades per day
  if (todaysTrades.length >= 5) {
    return { allowed: false, reason: `Max daily trades reached (${todaysTrades.length}/5)`, quantity: 0 };
  }

  // Fetch all historically closed trades to compute current total capital
  const allClosedTrades = await PaperTrade.find({ status: { $ne: 'OPEN' } });
  const totalCumulativePnl = allClosedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const startingCapital = await getStartingCapital();
  const currentCapital = startingCapital + totalCumulativePnl;

  if (currentCapital <= 0) {
    return { allowed: false, reason: 'Zero or negative capital remaining', quantity: 0 };
  }

  // 3. Daily max loss = 5% of current capital
  const todaysClosedTrades = todaysTrades.filter(t => t.status !== 'OPEN');
  const todaysPnl = todaysClosedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const maxDailyLossAllowed = currentCapital * 0.05;

  if (todaysPnl <= -maxDailyLossAllowed) {
    return {
      allowed: false,
      reason: `Daily max drawdown hit (PnL: ₹${todaysPnl.toFixed(2)} / Allowed Loss: ₹${maxDailyLossAllowed.toFixed(2)})`,
      quantity: 0
    };
  }

  // 4. Stop trading after 3 consecutive losses
  // Sort today's closed trades chronologically by close time to check streaks
  const sortedClosed = [...todaysClosedTrades].sort(
    (a, b) => new Date(a.closedAt || 0).getTime() - new Date(b.closedAt || 0).getTime()
  );
  if (sortedClosed.length >= 3) {
    const lastThree = sortedClosed.slice(-3);
    const consecutiveLosses = lastThree.every(t => t.pnl < 0);
    if (consecutiveLosses) {
      return { allowed: false, reason: '3 consecutive losses today protection triggered', quantity: 0 };
    }
  }

  // 5. Position Sizing: Risk max 2% capital per trade
  const maxTradeRisk = currentCapital * 0.02; // e.g. ₹300 for ₹15000 capital
  const stopLossPercent = 0.20; // 20% stop loss
  const stopLossInRupees = optionPremium * stopLossPercent; // E.g. ₹30 for ₹150 premium

  const lotSize = LOT_SIZES[symbol] || 25;
  const singleLotRisk = stopLossInRupees * lotSize; // E.g. ₹30 * 25 = ₹750 risk per NIFTY lot

  // Determine allowed lots
  let allowedLots = Math.floor(maxTradeRisk / singleLotRisk);
  if (allowedLots < 1) {
    // Standard option buying: minimum position size is 1 lot to keep execution alive
    allowedLots = 1;
  }

  const quantity = allowedLots * lotSize;

  return {
    allowed: true,
    reason: '',
    quantity
  };
}

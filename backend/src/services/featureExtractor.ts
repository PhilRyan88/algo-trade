/**
 * Feature Extractor — Converts raw candle data + signal info into 
 * a normalized numeric feature vector for the ML model.
 * 
 * All features are normalized to roughly 0-1 range for training stability.
 */

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalInfo {
  type: 'BUY' | 'SELL';
  strategies: string[];
  avgConfidence: number;
  entryPrice: number;
  stopLoss: number;
  target: number;
}

// ─── Helper: EMA calculation ────────────────────────────────────────
function calcEMA(data: number[], period: number): number[] {
  const ema: number[] = new Array(data.length).fill(0);
  const k = 2 / (period + 1);

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

// ─── Helper: RSI calculation ────────────────────────────────────────
function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50; // neutral

  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// ─── Helper: ATR calculation ────────────────────────────────────────
function calcATR(candles: Candle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  let trSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    trSum += tr;
  }
  return trSum / period;
}

// ─── Helper: VWAP approximation ─────────────────────────────────────
function calcVWAP(candles: Candle[]): number {
  let cumTypPriceVol = 0;
  let cumVol = 0;
  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1; // Avoid division by zero for index data
    cumTypPriceVol += typicalPrice * vol;
    cumVol += vol;
  }
  return cumVol > 0 ? cumTypPriceVol / cumVol : candles[candles.length - 1].close;
}

// ─── Sigmoid normalization ──────────────────────────────────────────
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(val: number, min: number = 0, max: number = 1): number {
  return Math.max(min, Math.min(max, val));
}

// ════════════════════════════════════════════════════════════════════
// MAIN FEATURE EXTRACTION
// ════════════════════════════════════════════════════════════════════
export function extractFeatures(candles: Candle[], signal: SignalInfo): number[] {
  const closes = candles.map(c => c.close);
  const last = candles.length - 1;
  const current = candles[last];

  // ── EMAs ──
  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const currentATR = calcATR(candles, 14);
  const atrNorm = currentATR || 1; // prevent division by zero

  // 1. EMA9 slope (last 3 periods, normalized by ATR)
  const ema9Slope = ema9[last] && ema9[last - 3]
    ? sigmoid((ema9[last] - ema9[last - 3]) / atrNorm)
    : 0.5;

  // 2. EMA21 slope
  const ema21Slope = ema21[last] && ema21[last - 3]
    ? sigmoid((ema21[last] - ema21[last - 3]) / atrNorm)
    : 0.5;

  // 3. EMA gap (EMA9 - EMA21, normalized by ATR)
  const emaGap = ema9[last] && ema21[last]
    ? sigmoid((ema9[last] - ema21[last]) / atrNorm)
    : 0.5;

  // 4. Trend alignment: does signal direction match EMA trend?
  const emaTrend = ema9[last] > ema21[last] ? 'BUY' : 'SELL';
  const trendAlignment = signal.type === emaTrend ? 1.0 : 0.0;

  // ── Volatility ──
  // 5. ATR normalized (current ATR relative to price)
  const atrPct = clamp(currentATR / current.close * 100, 0, 2) / 2; // 0-2% → 0-1

  // 6. ATR ratio (current vs 20-period rolling average ATR)
  const atr20 = calcATR(candles.slice(0, -6), 14) || currentATR || 1;
  const atrRatio = clamp(currentATR / atr20, 0.2, 3) / 3;

  // 7. Range position (where price is in today's high-low range)
  const dayHigh = Math.max(...candles.slice(-50).map(c => c.high));
  const dayLow = Math.min(...candles.slice(-50).map(c => c.low));
  const dayRange = dayHigh - dayLow || 1;
  const rangePosition = clamp((current.close - dayLow) / dayRange);

  // ── Momentum ──
  // 8. RSI(14) normalized to 0-1
  const rsi = calcRSI(closes) / 100;

  // 9. Rate of change (5-candle)
  const roc5 = closes.length >= 6
    ? sigmoid((closes[last] - closes[last - 5]) / atrNorm)
    : 0.5;

  // 10. Body-to-wick ratio of signal candle
  const bodySize = Math.abs(current.close - current.open);
  const totalRange = current.high - current.low || 0.01;
  const bodyWickRatio = clamp(bodySize / totalRange);

  // ── Structure ──
  // 11. Distance from session high (%)
  const distFromHigh = clamp((dayHigh - current.close) / dayRange);

  // 12. Distance from session low (%)
  const distFromLow = clamp((current.close - dayLow) / dayRange);

  // 13. Distance from VWAP (normalized by ATR)
  const vwap = calcVWAP(candles.slice(-50));
  const distFromVwap = sigmoid((current.close - vwap) / atrNorm);

  // 14. Near a swing level? (check if near recent 10-candle high/low)
  const recentHigh = Math.max(...candles.slice(-10).map(c => c.high));
  const recentLow = Math.min(...candles.slice(-10).map(c => c.low));
  const nearResistance = Math.abs(current.close - recentHigh) / atrNorm < 0.5 ? 1 : 0;
  const nearSupport = Math.abs(current.close - recentLow) / atrNorm < 0.5 ? 1 : 0;
  const supportResistScore = (nearResistance + nearSupport) / 2;

  // ── Volume ──
  // 15. Volume ratio (current vs 20-period average)
  const avgVol = candles.slice(-20).reduce((s, c) => s + (c.volume || 0), 0) / 20 || 1;
  const volumeRatio = clamp((current.volume || 0) / avgVol, 0, 5) / 5;

  // 16. Volume trend (is volume increasing over last 5 candles?)
  const recentVols = candles.slice(-5).map(c => c.volume || 0);
  const volSlope = recentVols.length >= 2
    ? sigmoid((recentVols[recentVols.length - 1] - recentVols[0]) / (avgVol || 1))
    : 0.5;

  // ── Time ──
  // 17-18. Time of day features
  let minutesSinceOpen = 0.5;
  let minutesUntilClose = 0.5;
  try {
    const ts = new Date(current.timestamp);
    const h = ts.getHours();
    const m = ts.getMinutes();
    const totalMinutes = h * 60 + m;
    const marketOpen = 9 * 60 + 15;  // 9:15
    const marketClose = 15 * 60 + 30; // 15:30
    const totalSession = marketClose - marketOpen; // 375 minutes

    minutesSinceOpen = clamp((totalMinutes - marketOpen) / totalSession);
    minutesUntilClose = clamp((marketClose - totalMinutes) / totalSession);
  } catch {
    // Keep defaults if timestamp parsing fails
  }

  // ── Signal Meta ──
  // 19. Is BUY (1) or SELL (0)
  const isBuy = signal.type === 'BUY' ? 1 : 0;

  // 20. Confluence count (2-4 → normalized)
  const confluenceCount = clamp((signal.strategies.length - 1) / 3); // 2→0.33, 3→0.67, 4→1.0

  // 21. Average confidence (65-80 → normalized)
  const avgConfidence = clamp((signal.avgConfidence - 50) / 50);

  // 22. Risk-reward ratio
  const riskDistance = Math.abs(signal.entryPrice - signal.stopLoss);
  const rewardDistance = Math.abs(signal.target - signal.entryPrice);
  const riskRewardRatio = clamp(riskDistance > 0 ? rewardDistance / riskDistance / 5 : 0.5);

  // 23. SL distance in ATR units
  const slDistanceAtr = clamp(riskDistance / atrNorm / 3);

  // ── Candle Context ──
  // 24. Consecutive candles in signal direction
  let consecutiveCount = 0;
  for (let i = last; i >= Math.max(0, last - 10); i--) {
    const isUp = candles[i].close >= candles[i].open;
    if ((signal.type === 'BUY' && isUp) || (signal.type === 'SELL' && !isUp)) {
      consecutiveCount++;
    } else break;
  }
  const consecutiveSameDir = clamp(consecutiveCount / 6);

  // 25. Placeholder for recent win rate (will be populated from trade history)
  const recentWinRate = 0.5; // Default: no information

  return [
    ema9Slope,          // 0
    ema21Slope,         // 1
    emaGap,             // 2
    trendAlignment,     // 3
    atrPct,             // 4
    atrRatio,           // 5
    rangePosition,      // 6
    rsi,                // 7
    roc5,               // 8
    bodyWickRatio,      // 9
    distFromHigh,       // 10
    distFromLow,        // 11
    distFromVwap,       // 12
    supportResistScore, // 13
    volumeRatio,        // 14
    volSlope,           // 15
    minutesSinceOpen,   // 16
    minutesUntilClose,  // 17
    isBuy,              // 18
    confluenceCount,    // 19
    avgConfidence,      // 20
    riskRewardRatio,    // 21
    slDistanceAtr,      // 22
    consecutiveSameDir, // 23
    recentWinRate,      // 24
  ];
}

export const FEATURE_NAMES = [
  'ema9_slope', 'ema21_slope', 'ema_gap', 'trend_alignment',
  'atr_pct', 'atr_ratio', 'range_position',
  'rsi', 'rate_of_change', 'body_wick_ratio',
  'dist_from_high', 'dist_from_low', 'dist_from_vwap', 'support_resist_score',
  'volume_ratio', 'volume_trend',
  'minutes_since_open', 'minutes_until_close',
  'is_buy', 'confluence_count', 'avg_confidence', 'risk_reward_ratio', 'sl_distance_atr',
  'consecutive_same_dir', 'recent_win_rate'
];

export const NUM_FEATURES = 25;

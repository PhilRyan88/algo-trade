export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  ema9: number;
  rsi: number;
  atr: number;
  volumeSma20: number;
}

/**
 * Aggregates 1-minute candles into 5-minute candles aligned to market open (e.g. 9:15, 9:20, etc.)
 */
export function aggregateTo5MinCandles(oneMinCandles: Candle[]): Candle[] {
  const fiveMinCandles: Candle[] = [];
  if (oneMinCandles.length === 0) return fiveMinCandles;

  // Sort candles chronologically
  const sorted = [...oneMinCandles].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentBucket: Candle | null = null;
  let currentBucketTime: number = 0;

  for (const c of sorted) {
    const time = new Date(c.timestamp).getTime();
    
    // We group by 5-minute intervals. 
    // To align properly with Indian market open (9:15 AM):
    // E.g., 9:15, 9:16, 9:17, 9:18, 9:19 minutes fall into the 9:15 bucket.
    const date = new Date(c.timestamp);
    const min = date.getMinutes();
    const roundedMin = Math.floor(min / 5) * 5;
    
    const bucketDate = new Date(date);
    bucketDate.setMinutes(roundedMin);
    bucketDate.setSeconds(0);
    bucketDate.setMilliseconds(0);
    
    const bucketTime = bucketDate.getTime();

    if (!currentBucket || currentBucketTime !== bucketTime) {
      if (currentBucket) {
        fiveMinCandles.push(currentBucket);
      }
      currentBucket = {
        timestamp: bucketDate.toISOString(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      };
      currentBucketTime = bucketTime;
    } else {
      currentBucket.high = Math.max(currentBucket.high, c.high);
      currentBucket.low = Math.min(currentBucket.low, c.low);
      currentBucket.close = c.close;
      currentBucket.volume += c.volume;
    }
  }

  if (currentBucket) {
    fiveMinCandles.push(currentBucket);
  }

  return fiveMinCandles;
}

/**
 * Calculates VWAP resetting daily at market open
 */
export function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = [];
  let currentDayStr = '';
  let cumulativePv = 0;
  let cumulativeVol = 0;

  for (const c of candles) {
    const date = new Date(c.timestamp);
    const dayStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    if (dayStr !== currentDayStr) {
      currentDayStr = dayStr;
      cumulativePv = 0;
      cumulativeVol = 0;
    }

    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativePv += typicalPrice * c.volume;
    cumulativeVol += c.volume;

    vwap.push(cumulativeVol > 0 ? cumulativePv / cumulativeVol : c.close);
  }

  return vwap;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;

  const k = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  const initialPeriod = Math.min(period, data.length);
  for (let i = 0; i < initialPeriod; i++) {
    sum += data[i];
  }
  const initialSma = sum / initialPeriod;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(data[i]); // Fill with close until period is reached
    } else if (i === period - 1) {
      ema.push(initialSma);
    } else {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
  }

  return ema;
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's smoothed method
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50); // Default to neutral 50
  if (closes.length < period + 1) return rsi;

  let gains = 0;
  let losses = 0;

  // First RSI calculation
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = new Array(candles.length).fill(0);
  if (candles.length === 0) return atr;

  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - p.close),
        Math.abs(c.low - p.close)
      )
    );
  }

  if (candles.length < period) {
    // Fill with running averages of TR
    let runningSum = 0;
    for (let i = 0; i < candles.length; i++) {
      runningSum += tr[i];
      atr[i] = runningSum / (i + 1);
    }
    return atr;
  }

  // First ATR is average of first 'period' TR values
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += tr[i];
    atr[i] = trSum / (i + 1);
  }
  atr[period - 1] = trSum / period;

  // Wilders smoothing for remaining ATRs
  for (let i = period; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  return atr;
}

/**
 * Calculates Volume Simple Moving Average (SMA)
 */
export function calculateVolumeSMA(candles: Candle[], period: number = 20): number[] {
  const sma: number[] = new Array(candles.length).fill(0);
  if (candles.length === 0) return sma;

  let currentDayStr = '';
  let runningSum = 0;
  let currentDayCount = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const date = new Date(c.timestamp);
    const dayStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    
    if (dayStr !== currentDayStr) {
      currentDayStr = dayStr;
      runningSum = 0;
      currentDayCount = 0;
    }

    runningSum += c.volume;
    currentDayCount++;

    if (currentDayCount <= period) {
      sma[i] = runningSum / currentDayCount;
    } else {
      runningSum -= candles[i - period].volume;
      sma[i] = runningSum / period;
    }
  }

  return sma;
}

/**
 * Main engine entrypoint to aggregate and compute all indicators for a set of candles
 */
export function indicatorEngine(oneMinCandles: Candle[]): IndicatorValues[] {
  const fiveMinCandles = aggregateTo5MinCandles(oneMinCandles);
  if (fiveMinCandles.length === 0) return [];

  const closes = fiveMinCandles.map(c => c.close);
  
  const vwap = calculateVWAP(fiveMinCandles);
  const ema9 = calculateEMA(closes, 9);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(fiveMinCandles, 14);
  const volumeSma20 = calculateVolumeSMA(fiveMinCandles, 20);

  return fiveMinCandles.map((c, i) => ({
    ...c,
    vwap: vwap[i] || c.close,
    ema9: ema9[i] || c.close,
    rsi: rsi[i] ?? 50,
    atr: atr[i] || 0,
    volumeSma20: volumeSma20[i] || 0
  }));
}

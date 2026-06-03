export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BreakoutSignal {
  is_breakout: boolean;
  entry_price?: number;
  target_price?: number;
  stoploss?: number;
  confidence?: number;
}

export const detectBreakout = (candles: Candle[], window: number = 20): BreakoutSignal => {
  if (candles.length < window + 1) {
    return { is_breakout: false };
  }

  const recentData = candles.slice(-(window + 1));
  const currentCandle = recentData[recentData.length - 1];
  const previousCandles = recentData.slice(0, -1);

  // Math.max across all previous candles' high
  const resistanceLevel = Math.max(...previousCandles.map(c => c.high));
  
  // Average volume of previous candles
  const totalVolume = previousCandles.reduce((sum, c) => sum + c.volume, 0);
  const avgVolume = totalVolume / previousCandles.length;

  const isBreakout = (currentCandle.close > resistanceLevel) && (currentCandle.volume > avgVolume * 1.5);

  if (isBreakout) {
    const entryPrice = currentCandle.close;
    const stoploss = resistanceLevel * 0.98; // Place SL slightly below support
    const targetPrice = entryPrice + (entryPrice - stoploss) * 2; // 1:2 Risk Reward

    // Calculate a basic confidence score based on volume surge
    const volumeSurge = Math.min(currentCandle.volume / Math.max(avgVolume, 1), 3.0);
    const confidence = Math.min(70 + (volumeSurge * 10), 99);

    return {
      is_breakout: true,
      entry_price: parseFloat(entryPrice.toFixed(2)),
      target_price: parseFloat(targetPrice.toFixed(2)),
      stoploss: parseFloat(stoploss.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(2))
    };
  }

  return { is_breakout: false };
};

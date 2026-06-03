import { IndicatorValues } from '../market/indicators/indicatorEngine';

export interface SignalCheck {
  vwapAlignment: boolean;
  emaAlignment: boolean;
  rsiConfirmation: boolean;
  volumeSpike: boolean;
  breakoutCandle: boolean;
}

export interface SignalReport {
  long: SignalCheck;
  short: SignalCheck;
  spotPrice: number;
  rsi: number;
  vwap: number;
  ema9: number;
  atr: number;
  volume: number;
  volumeSma20: number;
}

/**
 * signalEngine
 * Evaluates entry rules for both long (CE) and short (PE) setups
 * based on the most recently completed 5-minute candle.
 */
export function signalEngine(latestCandle: IndicatorValues): SignalReport {
  const spotPrice = latestCandle.close;
  const isBullish = latestCandle.close > latestCandle.open;
  const isBearish = latestCandle.close < latestCandle.open;

  return {
    long: {
      vwapAlignment: spotPrice > latestCandle.vwap,
      emaAlignment: spotPrice > latestCandle.ema9,
      rsiConfirmation: latestCandle.rsi > 55,
      volumeSpike: latestCandle.volume > latestCandle.volumeSma20 * 0.8,
      breakoutCandle: isBullish
    },
    short: {
      vwapAlignment: spotPrice < latestCandle.vwap,
      emaAlignment: spotPrice < latestCandle.ema9,
      rsiConfirmation: latestCandle.rsi < 45,
      volumeSpike: latestCandle.volume > latestCandle.volumeSma20 * 0.8,
      breakoutCandle: isBearish
    },
    spotPrice,
    rsi: latestCandle.rsi,
    vwap: latestCandle.vwap,
    ema9: latestCandle.ema9,
    atr: latestCandle.atr,
    volume: latestCandle.volume,
    volumeSma20: latestCandle.volumeSma20
  };
}

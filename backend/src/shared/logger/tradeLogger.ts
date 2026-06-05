export interface LogPayload {
  timestamp: string;
  symbol: string;
  spotPrice: number;
  optionStrike: number;
  optionType: 'CE' | 'PE' | 'NONE';
  vwap: number;
  ema9: number;
  rsi: number;
  atr: number;
  volume: number;
  score: number;
  signalGenerated: 'BUY_CE' | 'BUY_PE' | 'NONE';
  rejectedReason: string;
  positionState: string;
}

/**
 * tradeLogger
 * Outputs strategy scans and execution states to the console in the mandatory JSON format.
 */
export function tradeLogger(payload: LogPayload): void {
  const cleanPayload = {
    timestamp: payload.timestamp,
    symbol: payload.symbol,
    spotPrice: Number(payload.spotPrice.toFixed(2)),
    optionStrike: payload.optionStrike,
    optionType: payload.optionType,
    vwap: Number(payload.vwap.toFixed(2)),
    ema9: Number(payload.ema9.toFixed(2)),
    rsi: Number(payload.rsi.toFixed(2)),
    atr: Number(payload.atr.toFixed(2)),
    volume: payload.volume,
    score: payload.score,
    signalGenerated: payload.signalGenerated,
    rejectedReason: payload.rejectedReason,
    positionState: payload.positionState
  };

  console.log(cleanPayload);
}

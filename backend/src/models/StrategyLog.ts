import mongoose, { Document, Schema } from 'mongoose';

export interface IStrategyLog extends Document {
  timestamp: Date;
  symbol: string;
  spotPrice: number;
  optionStrike: number;
  optionType: string;
  vwap: number;
  ema9: number;
  rsi: number;
  atr: number;
  volume: number;
  score: number;
  signalGenerated: string;
  rejectedReason: string;
  positionState: string;
}

const StrategyLogSchema: Schema = new Schema(
  {
    timestamp: { type: Date, required: true, index: true },
    symbol: { type: String, required: true },
    spotPrice: { type: Number, required: true },
    optionStrike: { type: Number, required: true },
    optionType: { type: String, required: true },
    vwap: { type: Number, required: true },
    ema9: { type: Number, required: true },
    rsi: { type: Number, required: true },
    atr: { type: Number, required: true },
    volume: { type: Number, required: true },
    score: { type: Number, required: true },
    signalGenerated: { type: String, required: true },
    rejectedReason: { type: String },
    positionState: { type: String },
  },
  {
    timestamps: false,
  }
);

export const StrategyLog = mongoose.model<IStrategyLog>('StrategyLog', StrategyLogSchema);

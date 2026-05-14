import mongoose, { Document, Schema } from 'mongoose';

export interface IPaperTrade extends Document {
  symbol: string;
  type: 'BUY' | 'SELL';
  strategy: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number;
  target: number;
  quantity: number;
  pnl: number;
  status: 'OPEN' | 'TARGET_HIT' | 'SL_HIT' | 'CLOSED';
  confidence: number;
  mlScore: number;
  reason: string;
  openedAt: Date;
  closedAt: Date | null;
}

const PaperTradeSchema: Schema = new Schema({
  symbol: { type: String, required: true, index: true },
  type: { type: String, enum: ['BUY', 'SELL'], required: true },
  strategy: { type: String, required: true },
  entryPrice: { type: Number, required: true },
  exitPrice: { type: Number, default: null },
  stopLoss: { type: Number, required: true },
  target: { type: Number, required: true },
  quantity: { type: Number, required: true },
  pnl: { type: Number, default: 0 },
  status: { type: String, enum: ['OPEN', 'TARGET_HIT', 'SL_HIT', 'CLOSED'], default: 'OPEN' },
  confidence: { type: Number, default: 0 },
  mlScore: { type: Number, default: 0 },
  reason: { type: String, default: '' },
  openedAt: { type: Date, default: Date.now },
  closedAt: { type: Date, default: null },
});

// Compound index for querying today's trades efficiently
PaperTradeSchema.index({ openedAt: -1 });
PaperTradeSchema.index({ status: 1, symbol: 1 });

export const PaperTrade = mongoose.model<IPaperTrade>('PaperTrade', PaperTradeSchema);

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
  // Options specific fields
  entrySpotPrice: number;
  optionStrike: number;
  optionType: 'CE' | 'PE' | 'NONE';
  trailSL: number;
  isPartialExited: boolean;
  partialExitPrice: number | null;
  partialExitQty: number;
  initialQuantity: number;
  hasMoveToBE: boolean;
  entryFeatures: number[];
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
  // Options specific fields
  entrySpotPrice: { type: Number, default: 0 },
  optionStrike: { type: Number, default: 0 },
  optionType: { type: String, enum: ['CE', 'PE', 'NONE'], default: 'NONE' },
  trailSL: { type: Number, default: 0 },
  isPartialExited: { type: Boolean, default: false },
  partialExitPrice: { type: Number, default: null },
  partialExitQty: { type: Number, default: 0 },
  initialQuantity: { type: Number, default: 0 },
  hasMoveToBE: { type: Boolean, default: false },
  entryFeatures: { type: [Number], default: [] }
});

// Compound index for querying today's trades efficiently
PaperTradeSchema.index({ openedAt: -1 });
PaperTradeSchema.index({ status: 1, symbol: 1 });

export const PaperTrade = mongoose.model<IPaperTrade>('PaperTrade', PaperTradeSchema);

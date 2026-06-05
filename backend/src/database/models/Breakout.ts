import mongoose, { Document, Schema } from 'mongoose';

export interface IBreakout extends Document {
  symbol: string;
  entry_price: number;
  target_price: number;
  stoploss: number;
  confidence: number;
  createdAt: Date;
}

const BreakoutSchema: Schema = new Schema({
  symbol: { type: String, required: true },
  entry_price: { type: Number, required: true },
  target_price: { type: Number, required: true },
  stoploss: { type: Number, required: true },
  confidence: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: '7d' } // Automatically expire documents after 7 days
});

export const Breakout = mongoose.model<IBreakout>('Breakout', BreakoutSchema);

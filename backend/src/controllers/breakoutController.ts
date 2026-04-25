import { Request, Response } from 'express';
import { Breakout } from '../models/Breakout';

export const getBreakouts = async (req: Request, res: Response) => {
  try {
    const breakouts = await Breakout.find()
      .sort({ createdAt: -1 })
      .limit(50);
      
    const responseData = breakouts.map((r) => ({
      id: r._id,
      symbol: r.symbol,
      entry: r.entry_price,
      target: r.target_price,
      stoploss: r.stoploss,
      confidence: r.confidence
    }));

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching breakouts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

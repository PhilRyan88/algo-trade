import { FastifyRequest, FastifyReply } from 'fastify';
import { Breakout } from '../models/Breakout';

export const getBreakouts = async (request: FastifyRequest, reply: FastifyReply) => {
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

    reply.send(responseData);
  } catch (error) {
    console.error('Error fetching breakouts:', error);
    reply.status(500).send({ error: 'Internal Server Error' });
  }
};

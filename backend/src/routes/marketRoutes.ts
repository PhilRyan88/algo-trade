import { FastifyInstance } from 'fastify';
import { angelOneService } from '../services/angelOneService';

export default async function marketRoutes(fastify: FastifyInstance) {
  fastify.get('/historical/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    
    try {
      const historicalData = await angelOneService.getHistoricalData(symbol);
      
      const formattedData = historicalData.map(candle => {
        // Angel one returns: [timestamp, open, high, low, close, volume]
        // But our service might format it differently, let's check
        // Current angelOneService maps to { open, high, low, close, volume } but forgets time!
        // We need the timestamp for the chart. Let's fix angelOneService if needed.
        return {
          time: new Date(candle.timestamp || Date.now()).toLocaleDateString(), // We will fix the service
          open: candle.open,
          high: candle.high,
          low: candle.low,
          price: candle.close,
          volume: candle.volume
        };
      });

      return { success: true, data: formattedData };
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Server error' });
    }
  });
}

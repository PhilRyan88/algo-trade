import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function breakoutRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Try fetching from Redis Cache first
      const cached = await fastify.redis.get('breakout_stocks_weekly');
      if (cached) {
         return reply.send(JSON.parse(cached));
      }

      // 2. Fallback to DB (or call Python analysis engine directly if real-time)
      const client = await fastify.pg.connect();
      try {
        const { rows } = await client.query(
          'SELECT symbol, entry_price, target_price, stoploss, confidence FROM breakouts ORDER BY created_at DESC LIMIT 50'
        );
        
        const responseData = rows.map((r: any) => ({
           id: r.symbol, // using symbol as id for simplicity
           symbol: r.symbol,
           entry: r.entry_price,
           target: r.target_price,
           stoploss: r.stoploss,
           confidence: r.confidence
        }));

        // Cache the response
        await fastify.redis.set('breakout_stocks_weekly', JSON.stringify(responseData), 'EX', 3600);
        return reply.send(responseData);
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });
}

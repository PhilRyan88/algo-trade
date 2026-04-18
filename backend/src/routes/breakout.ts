import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function breakoutRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 1. Fetch from DB
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

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { nseService } from '../services/nseService';

export default async function dividendRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await nseService.getDividendActions();
      return data;
    } catch (error) {
      console.error('Error fetching dividends:', error);
      reply.status(500).send({ error: 'Failed to fetch dividend data from NSE' });
    }
  });
}

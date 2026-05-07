import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { angelOneService } from '../services/angelOneService';

export default async function optionsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await angelOneService.getOptionsData();
      return data;
    } catch (error) {
      console.error('Error fetching options:', error);
      reply.status(500).send({ error: 'Failed to fetch options data from Smart API' });
    }
  });
}

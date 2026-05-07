import { FastifyInstance } from 'fastify';
import { getBreakouts } from '../controllers/breakoutController';

export default async function breakoutRoutes(fastify: FastifyInstance) {
  fastify.get('/', getBreakouts);
}

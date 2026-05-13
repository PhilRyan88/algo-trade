import { FastifyInstance } from 'fastify';
import { angelOneService } from '../services/angelOneService';
import { env } from '../config/env';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const { clientCode, pin, totpCode } = request.body as any;
    
    // Check if matching provided env (for simplicity) or just try to authenticate
    if (!env.ANGELONE_API_KEY) {
      return reply.code(400).send({ success: false, message: 'AngelOne API Key not configured on backend.' });
    }

    try {
      // Assuming we have a manual authenticate method we can add, or just use the existing one
      // If user provides a totpCode, we could theoretically use it, 
      // but AngelOneService's authenticate() automatically generates it if TOTP_SECRET is provided.
      // We will create a loginWithCredentials method on angelOneService.
      const result = await angelOneService.loginWithCredentials(clientCode, pin, totpCode);
      if (result) {
        return { success: true, message: 'Login successful' };
      } else {
        return reply.code(401).send({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      return reply.code(500).send({ success: false, message: 'Server error' });
    }
  });

  fastify.get('/status', async (request, reply) => {
    // If authenticated but token may be expired, attempt silent re-auth
    const isAuthenticated = await angelOneService.ensureAuthenticated();
    return { isAuthenticated };
  });

  fastify.post('/logout', async (request, reply) => {
    angelOneService.logout();
    return { success: true, message: 'Logged out successfully' };
  });
}

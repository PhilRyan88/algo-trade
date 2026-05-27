import { FastifyInstance } from 'fastify';
import { angelOneService } from '../services/angelOneService';
import { strategyEngine } from '../services/strategyEngine';
import { env } from '../config/env';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const { clientCode, pin, totpCode, totpSecret } = request.body as any;
    
    // Check if matching provided env (for simplicity) or just try to authenticate
    if (!env.ANGELONE_API_KEY) {
      return reply.code(400).send({ success: false, message: 'AngelOne API Key not configured on backend.' });
    }

    try {
      const result = await angelOneService.loginWithCredentials(clientCode, pin, totpCode, totpSecret);
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
    const isAuth = angelOneService.getIsAuthenticated();
    console.log(`[AUTH_STATUS] Returning ${isAuth} to client`);
    return { isAuthenticated: isAuth };
  });

  fastify.post('/logout', async (request, reply) => {
    console.log('[LOGOUT] User initiated disconnect');
    strategyEngine.stop();
    await angelOneService.logout();
    console.log('[LOGOUT] Process complete');
    return { success: true, message: 'Logged out successfully' };
  });
}

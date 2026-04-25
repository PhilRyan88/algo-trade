import { Router } from 'express';
import { getBreakouts } from '../controllers/breakoutController';

const router = Router();

router.get('/', getBreakouts);

export default router;

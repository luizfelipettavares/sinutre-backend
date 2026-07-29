import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import { getMetrics } from '../controllers/metrics.controller';

export const metricsRoutes = Router();

metricsRoutes.use(requireAuth);
metricsRoutes.get('/', asyncHandler(getMetrics));

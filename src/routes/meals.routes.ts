import { Router } from 'express';
import { createMeal, meals } from '../controllers/meals.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';

export const mealsRoutes = Router();

mealsRoutes.use(requireAuth);

mealsRoutes.post('/', asyncHandler(createMeal));
mealsRoutes.get('/', asyncHandler(meals));

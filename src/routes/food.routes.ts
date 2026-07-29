import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import {
  createFood,
  deleteFood,
  getFood,
  listFoods,
  updateFood,
} from '../controllers/food.controller';

export const foodRouter = Router();

foodRouter.use(requireAuth);

foodRouter.get('/', asyncHandler(listFoods));
foodRouter.get('/:id', asyncHandler(getFood));
foodRouter.post('/', asyncHandler(createFood));
foodRouter.put('/:id', asyncHandler(updateFood));
foodRouter.delete('/:id', asyncHandler(deleteFood));

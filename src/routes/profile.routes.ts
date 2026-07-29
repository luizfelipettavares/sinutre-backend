import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import {
  createProfile,
  getProfile,
  updateProfile,
} from '../controllers/profile.controller';

export const profileRoutes = Router();

profileRoutes.use(requireAuth);

profileRoutes.get('/', asyncHandler(getProfile));
profileRoutes.post('/', asyncHandler(createProfile));
profileRoutes.put('/', asyncHandler(updateProfile));

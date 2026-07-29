import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { mealsRoutes } from './routes/meals.routes';
import { foodRouter } from './routes/food.routes';
import { profileRoutes } from './routes/profile.routes';
import { metricsRoutes } from './routes/metrics.routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Requisições sem Origin (curl, health check do Railway) são liberadas.
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, '');

      if (env.frontendUrls.includes(normalized)) {
        return callback(null, true);
      }

      // Libera os domínios de preview gerados pela Vercel para este projeto.
      const isVercelPreview = env.frontendUrls.some((allowed) => {
        if (!allowed.includes('.vercel.app')) return false;
        const project = allowed.replace(/^https?:\/\//, '').split('.')[0];
        return normalized.endsWith('.vercel.app') && normalized.includes(project);
      });

      if (isVercelPreview) return callback(null, true);

      return callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/meals', mealsRoutes);
app.use('/foods', foodRouter);
app.use('/profile', profileRoutes);
app.use('/metrics', metricsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

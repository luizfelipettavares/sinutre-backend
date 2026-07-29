import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { calculateImc, IMC_RANGES } from '../utils/health';
import { lastLocalDateKeys, startOfLocalDayAgo, toLocalDateKey } from '../utils/date';

const WINDOW_DAYS = 7;

// GET /metrics
// Reúne os dados da página de métricas: IMC com faixa (requisito 09) e
// média calórica dos últimos sete dias contra a meta (requisito 10).
export async function getMetrics(req: Request, res: Response) {
  const userId = req.userId!;

  const [healthData, weightLog, meals] = await Promise.all([
    prisma.healthData.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.meal.findMany({
      where: {
        userId,
        eatTime: { gte: startOfLocalDayAgo(WINDOW_DAYS - 1) },
      },
      include: { foods: true },
    }),
  ]);

  // --- IMC (requisito 09) ---
  const imc = weightLog
    ? { ...calculateImc(weightLog.height, weightLog.weight), ranges: IMC_RANGES }
    : null;

  // --- Média calórica dos últimos sete dias (requisito 10) ---
  const target = healthData?.targetDietDaily ?? null;

  const totalsByDay = new Map<string, number>();

  for (const meal of meals) {
    const key = toLocalDateKey(meal.eatTime);
    const mealCalories = meal.foods.reduce((sum, f) => sum + f.calories, 0);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + mealCalories);
  }

  const days = lastLocalDateKeys(WINDOW_DAYS).map((date) => {
    const calories = Math.round(totalsByDay.get(date) ?? 0);

    return {
      date,
      calories,
      exceeded: target !== null && calories > target,
      hasRecord: totalsByDay.has(date),
    };
  });

  // A média considera apenas os dias com refeição registrada. Incluir dias
  // vazios puxaria a média para baixo e daria uma leitura enganosa.
  const daysWithRecord = days.filter((d) => d.hasRecord);

  const average =
    daysWithRecord.length > 0
      ? Math.round(
          daysWithRecord.reduce((sum, d) => sum + d.calories, 0) /
            daysWithRecord.length,
        )
      : 0;

  const difference = target !== null ? average - target : null;

  const percentOfTarget =
    target !== null && target > 0
      ? Math.round((average / target) * 100)
      : null;

  return res.json({
    imc,
    calories: {
      windowDays: WINDOW_DAYS,
      days,
      average,
      target,
      difference,
      percentOfTarget,
      daysWithRecord: daysWithRecord.length,
      daysExceeded: days.filter((d) => d.exceeded).length,
    },
  });
}

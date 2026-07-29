import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Validator } from '../utils/validation';
import { AppError } from '../utils/errors';
import { MEAL_CHOICES } from '../constants/enums';

export async function meals(
  req: Request,
  res: Response,
) {
  const meals = await prisma.meal.findMany({
    where: {
      userId: req.userId,
    },

    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  const result = meals.map((meal) => {
    const totals = meal.foods.reduce(
      (acc, item) => {
        const factor = item.foodG / 100;

        acc.grams += item.foodG;

        acc.calories +=
          item.food.caloriesPer100g *
          factor;

        acc.carbs +=
          item.food.carbsPer100g *
          factor;

        acc.proteins +=
          item.food.proteinPer100g *
          factor;

        acc.fats +=
          item.food.fatPer100g *
          factor;

        return acc;
      },
      {
        grams: 0,
        calories: 0,
        carbs: 0,
        proteins: 0,
        fats: 0,
      },
    );

    return {
      id: meal.id,
      name: meal.description,
      type: meal.type,
      createdAt: meal.createdAt,
      eatTime: meal.eatTime,

      totals,

      items: meal.foods,
    };
  });

  return res.json(result);
}

export async function createMeal(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const body = (req.body ?? {}) as Record<string, unknown>;

  const v = new Validator();

  const type = v.requiredEnum('type', body.type, MEAL_CHOICES);

  const eatTimeRaw = v.requiredString('eatTime', body.eatTime, {
    min: 4,
    max: 40,
  });

  const eatTimeDate = new Date(eatTimeRaw);

  v.check(
    !Number.isNaN(eatTimeDate.getTime()),
    'eatTime',
    'Data e hora da refeição inválidas.',
  );

  const description =
    body.description === undefined || body.description === null
      ? undefined
      : String(body.description).trim().slice(0, 200);

  const rawItems = Array.isArray(body.items) ? body.items : [];

  v.check(
    rawItems.length > 0,
    'items',
    'Adicione ao menos um alimento à refeição.',
  );

  const items = rawItems.map((item, index) => {
    const entry = (item ?? {}) as Record<string, unknown>;

    return {
      foodId: v.id(`items[${index}].foodId`, entry.foodId),
      grams: v.requiredNumber(`items[${index}].grams`, entry.grams, {
        min: 1,
        max: 5000,
      }),
    };
  });

  v.throwIfInvalid();

  const meal = await prisma.$transaction(
    async (tx) => {
      // Busca os alimentos envolvidos
      const foods = await tx.food.findMany({
        where: {
          id: {
            in: items.map((i) => i.foodId),
          },

          userId,
        },
      });

      const foundIds = new Set(foods.map((f) => f.id));

      const missing = items
        .map((i) => i.foodId)
        .filter((id) => !foundIds.has(id));

      if (missing.length > 0) {
        throw new AppError(
          404,
          'Alimento não encontrado ou não pertence a você.',
          missing.map((id) => ({
            field: 'items',
            message: `Alimento ${id} indisponível.`,
          })),
        );
      }

      // Cria a refeição
      const meal = await tx.meal.create({
        data: {
          type,
          eatTime: eatTimeDate,
          description,
          userId,
        },
      });

      // Cria MealFood
      await tx.mealFood.createMany({
        data: items.map(
          (item) => {
            const food = foods.find(
              (f) => f.id === item.foodId,
            )!;

            return {
              mealId: meal.id,

              foodId: food.id,

              foodG: item.grams,

              calories:
                (food.caloriesPer100g *
                  item.grams) /
                100,

              carbs:
                (food.carbsPer100g *
                  item.grams) /
                100,

              protein:
                (food.proteinPer100g *
                  item.grams) /
                100,

              fat:
                (food.fatPer100g *
                  item.grams) /
                100,
            };
          },
        ),
      });

      return meal;
    },
  );

  return res.status(201).json(meal);
}


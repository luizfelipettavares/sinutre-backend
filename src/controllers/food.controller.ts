import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Validator } from '../utils/validation';
import { AppError } from '../utils/errors';

// Limites usados na validação dos macronutrientes (por 100 g).
const MACRO_LIMITS = { min: 0, max: 100 };
const CALORIE_LIMITS = { min: 0, max: 900 };

interface FoodPayload {
  name: string;
  caloriesPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
}

// Valida e normaliza o corpo de criação/alteração de alimento (requisito 03).
function validateFoodPayload(body: unknown): FoodPayload {
  const v = new Validator();
  const data = (body ?? {}) as Record<string, unknown>;

  const name = v.requiredString('name', data.name, { min: 2, max: 80 });

  const caloriesPer100g = v.requiredNumber(
    'caloriesPer100g',
    data.caloriesPer100g,
    CALORIE_LIMITS,
  );

  const carbsPer100g = v.requiredNumber(
    'carbsPer100g',
    data.carbsPer100g,
    MACRO_LIMITS,
  );

  const proteinPer100g = v.requiredNumber(
    'proteinPer100g',
    data.proteinPer100g,
    MACRO_LIMITS,
  );

  const fatPer100g = v.requiredNumber(
    'fatPer100g',
    data.fatPer100g,
    MACRO_LIMITS,
  );

  // Regra de coerência: a soma dos macros não pode passar de 100 g em 100 g
  // de alimento. Pega erros de digitação que passariam pela validação de tipo.
  const totalMacros = carbsPer100g + proteinPer100g + fatPer100g;

  v.check(
    totalMacros <= 100,
    'carbsPer100g',
    `A soma de carboidratos, proteínas e gorduras é ${totalMacros.toFixed(
      1,
    )} g e não pode passar de 100 g por 100 g de alimento.`,
  );

  v.throwIfInvalid();

  return {
    name,
    caloriesPer100g,
    carbsPer100g,
    proteinPer100g,
    fatPer100g,
  };
}

// Garante que o alimento existe e pertence ao usuário logado.
// Evita que um usuário altere ou exclua alimento de outro (IDOR).
async function findOwnedFood(foodId: number, userId: number) {
  const food = await prisma.food.findFirst({
    where: { id: foodId, userId },
  });

  if (!food) {
    throw new AppError(404, 'Alimento não encontrado.');
  }

  return food;
}

// GET /foods?search=
export async function listFoods(req: Request, res: Response) {
  const search = String(req.query.search ?? '').trim();

  const foods = await prisma.food.findMany({
    where: {
      userId: req.userId!,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: { name: 'asc' },
  });

  return res.json(foods);
}

// GET /foods/:id
export async function getFood(req: Request, res: Response) {
  const v = new Validator();
  const id = v.id('id', req.params.id);
  v.throwIfInvalid();

  const food = await findOwnedFood(id, req.userId!);

  return res.json(food);
}

// POST /foods
export async function createFood(req: Request, res: Response) {
  const payload = validateFoodPayload(req.body);

  const food = await prisma.food.create({
    data: { ...payload, userId: req.userId! },
  });

  return res.status(201).json(food);
}

// PUT /foods/:id  (requisito 01)
export async function updateFood(req: Request, res: Response) {
  const v = new Validator();
  const id = v.id('id', req.params.id);
  v.throwIfInvalid();

  await findOwnedFood(id, req.userId!);

  const payload = validateFoodPayload(req.body);

  const food = await prisma.food.update({
    where: { id },
    data: payload,
  });

  return res.json(food);
}

// DELETE /foods/:id?force=true  (requisito 02)
// Por padrão bloqueia a exclusão de alimento já usado em refeições, para não
// corromper o histórico. Com force=true remove também os vínculos.
export async function deleteFood(req: Request, res: Response) {
  const v = new Validator();
  const id = v.id('id', req.params.id);
  v.throwIfInvalid();

  await findOwnedFood(id, req.userId!);

  const linkedMeals = await prisma.mealFood.count({
    where: { foodId: id },
  });

  const force = String(req.query.force ?? '') === 'true';

  if (linkedMeals > 0 && !force) {
    throw new AppError(
      409,
      `Este alimento está em ${linkedMeals} refeição(ões) já registrada(s). ` +
        'Confirme para excluir o alimento e removê-lo dessas refeições.',
      [{ field: 'id', message: `Vinculado a ${linkedMeals} refeição(ões).` }],
    );
  }

  await prisma.$transaction(async (tx) => {
    if (linkedMeals > 0) {
      await tx.mealFood.deleteMany({ where: { foodId: id } });
    }
    await tx.food.delete({ where: { id } });
  });

  return res.status(204).send();
}

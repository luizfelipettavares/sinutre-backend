import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { Validator } from '../utils/validation';
import { AppError } from '../utils/errors';
import { LEVEL_CHOICES } from '../constants/enums';
import { calculateImc } from '../utils/health';
import { toLocalDateKey } from '../utils/date';

interface ProfilePayload {
  targetDietDaily: number;
  levelActivity: string;
  height: number;
  weight: number;
}

// Validação dos dados complementares do usuário (requisitos 04 e 05).
function validateProfilePayload(body: unknown): ProfilePayload {
  const v = new Validator();
  const data = (body ?? {}) as Record<string, unknown>;

  const targetDietDaily = v.requiredNumber(
    'targetDietDaily',
    data.targetDietDaily,
    { min: 500, max: 10000, integer: true },
  );

  const levelActivity = v.requiredEnum(
    'levelActivity',
    data.levelActivity,
    LEVEL_CHOICES,
  );

  // Altura aceita em metros (1,75) ou centímetros (175).
  const heightRaw = v.requiredNumber('height', data.height, {
    min: 0.5,
    max: 250,
  });

  const height = heightRaw > 3 ? heightRaw / 100 : heightRaw;

  v.check(
    height >= 0.5 && height <= 2.5,
    'height',
    'Altura deve estar entre 0,50 m e 2,50 m.',
  );

  const weight = v.requiredNumber('weight', data.weight, {
    min: 20,
    max: 500,
  });

  v.throwIfInvalid();

  return { targetDietDaily, levelActivity, height, weight };
}

// Lê os dados complementares ativos do usuário.
async function loadProfile(userId: number) {
  const [healthData, weightLog] = await Promise.all([
    prisma.healthData.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { healthData, weightLog };
}

function serializeProfile(
  healthData: Awaited<ReturnType<typeof loadProfile>>['healthData'],
  weightLog: Awaited<ReturnType<typeof loadProfile>>['weightLog'],
) {
  const configured = Boolean(healthData && weightLog);

  return {
    configured,
    targetDietDaily: healthData?.targetDietDaily ?? null,
    levelActivity: healthData?.levelActivity ?? null,
    height: weightLog?.height ?? null,
    weight: weightLog?.weight ?? null,
    imc:
      weightLog !== null && weightLog !== undefined
        ? calculateImc(weightLog.height, weightLog.weight)
        : null,
    updatedAt: healthData?.createdAt ?? null,
  };
}

// GET /profile  (alimenta o requisito 06 — meta calórica vinda do banco)
export async function getProfile(req: Request, res: Response) {
  const { healthData, weightLog } = await loadProfile(req.userId!);

  return res.json(serializeProfile(healthData, weightLog));
}

// POST /profile  (requisito 04 — cadastrar dados complementares)
export async function createProfile(req: Request, res: Response) {
  const userId = req.userId!;
  const { healthData } = await loadProfile(userId);

  if (healthData) {
    throw new AppError(
      409,
      'Dados complementares já cadastrados. Use a alteração para atualizá-los.',
    );
  }

  const payload = validateProfilePayload(req.body);

  const created = await prisma.$transaction(async (tx) => {
    const health = await tx.healthData.create({
      data: {
        targetDietDaily: payload.targetDietDaily,
        levelActivity: payload.levelActivity,
        userId,
      },
    });

    const weight = await tx.weightLog.create({
      data: {
        height: payload.height,
        weight: payload.weight,
        userId,
      },
    });

    return { health, weight };
  });

  return res.status(201).json(serializeProfile(created.health, created.weight));
}

// PUT /profile  (requisito 05 — alterar dados complementares)
export async function updateProfile(req: Request, res: Response) {
  const userId = req.userId!;
  const { healthData, weightLog } = await loadProfile(userId);

  if (!healthData) {
    throw new AppError(
      404,
      'Nenhum dado complementar cadastrado ainda. Cadastre antes de alterar.',
    );
  }

  const payload = validateProfilePayload(req.body);

  const updated = await prisma.$transaction(async (tx) => {
    const health = await tx.healthData.update({
      where: { id: healthData.id },
      data: {
        targetDietDaily: payload.targetDietDaily,
        levelActivity: payload.levelActivity,
      },
    });

    // Mantém histórico de peso por dia: atualiza o registro de hoje se já
    // existir, senão cria um novo (útil para acompanhar a evolução).
    const isFromToday =
      weightLog !== null &&
      weightLog !== undefined &&
      toLocalDateKey(weightLog.createdAt) === toLocalDateKey(new Date());

    const weight = isFromToday
      ? await tx.weightLog.update({
          where: { id: weightLog!.id },
          data: { height: payload.height, weight: payload.weight },
        })
      : await tx.weightLog.create({
          data: {
            height: payload.height,
            weight: payload.weight,
            userId,
          },
        });

    return { health, weight };
  });

  return res.json(serializeProfile(updated.health, updated.weight));
}

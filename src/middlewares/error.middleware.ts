import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';

// Erros conhecidos do Prisma trazem um `code` no formato P####. Verificamos
// pela forma do objeto em vez de importar a classe: assim o tratamento não
// depende da versão do client nem exige o client gerado para compilar.
interface PrismaKnownError {
  code: string;
  meta?: unknown;
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    /^P\d{4}$/.test((err as { code: string }).code)
  );
}

// Envolve controllers async para que exceções cheguem ao errorHandler
// em vez de virarem "unhandled rejection" e derrubarem a requisição.
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Tratador central de erros. Converte AppError e erros conhecidos do Prisma
// em respostas JSON previsíveis para o frontend.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details ?? [],
    });
  }

  if (isPrismaKnownError(err)) {
    // P2025: registro não encontrado
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro não encontrado.',
        details: [],
      });
    }

    // P2003: violação de chave estrangeira
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: 'Registro está em uso e não pode ser removido.',
        details: [],
      });
    }

    // P2002: violação de restrição de unicidade
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Já existe um registro com esses dados.',
        details: [],
      });
    }
  }

  console.error('[erro nao tratado]', err);

  return res.status(500).json({
    error: 'Erro interno do servidor.',
    details: [],
  });
}

// 404 para rotas inexistentes.
export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({ error: 'Rota não encontrada.', details: [] });
}

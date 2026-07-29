import { AppError, FieldError } from './errors';

// Acumulador de erros de validação: valida todos os campos e devolve
// a lista completa de problemas de uma só vez, em vez de parar no primeiro.
export class Validator {
  private errors: FieldError[] = [];

  private fail(field: string, message: string) {
    this.errors.push({ field, message });
  }

  // String obrigatória, com limites de tamanho.
  requiredString(
    field: string,
    value: unknown,
    opts: { min?: number; max?: number } = {},
  ): string {
    const { min = 1, max = 120 } = opts;

    if (value === undefined || value === null || value === '') {
      this.fail(field, 'Campo obrigatório.');
      return '';
    }

    if (typeof value !== 'string') {
      this.fail(field, 'Deve ser um texto.');
      return '';
    }

    const trimmed = value.trim();

    if (trimmed.length < min) {
      this.fail(field, `Deve ter no mínimo ${min} caractere(s).`);
      return trimmed;
    }

    if (trimmed.length > max) {
      this.fail(field, `Deve ter no máximo ${max} caracteres.`);
      return trimmed;
    }

    return trimmed;
  }

  // Número obrigatório, com faixa permitida. Aceita string numérica
  // (formulários HTML mandam string) mas rejeita texto não numérico.
  requiredNumber(
    field: string,
    value: unknown,
    opts: { min?: number; max?: number; integer?: boolean } = {},
  ): number {
    const { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = opts;

    if (value === undefined || value === null || value === '') {
      this.fail(field, 'Campo obrigatório.');
      return 0;
    }

    const parsed = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
      this.fail(field, 'Deve ser um número válido.');
      return 0;
    }

    if (integer && !Number.isInteger(parsed)) {
      this.fail(field, 'Deve ser um número inteiro.');
      return parsed;
    }

    if (parsed < min) {
      this.fail(field, `Deve ser maior ou igual a ${min}.`);
      return parsed;
    }

    if (parsed > max) {
      this.fail(field, `Deve ser menor ou igual a ${max}.`);
      return parsed;
    }

    return parsed;
  }

  // Valor obrigatório dentro de uma lista fechada (substitui enum no SQL).
  requiredEnum<T extends string>(
    field: string,
    value: unknown,
    allowed: readonly T[],
  ): T {
    if (value === undefined || value === null || value === '') {
      this.fail(field, 'Campo obrigatório.');
      return allowed[0];
    }

    if (typeof value !== 'string' || !allowed.includes(value as T)) {
      this.fail(field, `Valor inválido. Aceitos: ${allowed.join(', ')}.`);
      return allowed[0];
    }

    return value as T;
  }

  // ID numérico vindo de req.params.
  id(field: string, value: unknown): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      this.fail(field, 'Identificador inválido.');
      return 0;
    }

    return parsed;
  }

  // Regra de negócio arbitrária, avaliada só se ainda não há erro no campo.
  check(condition: boolean, field: string, message: string): void {
    if (!condition) this.fail(field, message);
  }

  // Dispara 400 com a lista completa de erros, se houver algum.
  throwIfInvalid(): void {
    if (this.errors.length > 0) {
      throw new AppError(400, 'Dados inválidos.', this.errors);
    }
  }
}

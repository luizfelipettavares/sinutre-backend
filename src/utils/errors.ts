// Erro de aplicação com status HTTP e detalhes de validação por campo.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: FieldError[];

  constructor(statusCode: number, message: string, details?: FieldError[]) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface FieldError {
  field: string;
  message: string;
}

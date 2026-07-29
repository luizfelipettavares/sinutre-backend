import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

// FRONTEND_URL aceita uma lista separada por vírgula. Em produção a Vercel
// gera domínios de preview além do domínio principal, e o CORS precisa
// liberar todos eles.
function parseOrigins(): string[] {
  return (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const origins = parseOrigins();

export const env = {
  port: Number(process.env.PORT ?? 3333),
  jwtSecret: required('JWT_SECRET'),
  frontendUrl: origins[0],
  frontendUrls: origins,
  github: {
    clientId: required('GITHUB_CLIENT_ID'),
    clientSecret: required('GITHUB_CLIENT_SECRET'),
    callbackUrl: required('GITHUB_CALLBACK_URL'),
  },
};

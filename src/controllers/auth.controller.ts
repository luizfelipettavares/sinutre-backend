import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { env } from '../config/env';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

// GET /auth/github
// Redireciona o navegador para a tela de autorização do GitHub.
export async function redirectToGithub(_req: Request, res: Response) {
  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: env.github.callbackUrl,
    scope: 'read:user',
  });
  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
}

// GET /auth/github/callback?code=...
// 1) troca o code pelo access_token
// 2) busca dados do usuário no GitHub
// 3) cria ou atualiza o User
// 4) emite um JWT e redireciona ao frontend
export async function githubCallback(req: Request, res: Response) {
  const code = req.query.code as string | undefined;
  if (!code) {
    return res.status(400).json({ error: 'Parâmetro "code" ausente.' });
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
      redirect_uri: env.github.callbackUrl,
    }),
  });

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenData.access_token) {
    return res
      .status(401)
      .json({ error: 'Falha ao obter access_token do GitHub.' });
  }

  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'sinutre-back',
    },
  });

  const githubUser = (await userResponse.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
  };

  const user = await prisma.user.upsert({
    where: { githubId: String(githubUser.id) },
    update: {
      githubLogin: githubUser.login,
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url ?? undefined,
    },
    create: {
      githubId: String(githubUser.id),
      githubLogin: githubUser.login,
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url ?? undefined,
    },
  });

  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '7d' });

  res.redirect(`${env.frontendUrl}/?token=${token}`);
}

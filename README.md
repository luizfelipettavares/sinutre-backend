# sinutre-back

Backend do **SiNutre — Sistema de Ingestão de Macronutrientes**.

Stack: **TypeScript + Express + Prisma + PostgreSQL**.

> Projeto final da Formação em Desenvolvimento Web Moderno. Cobre:
> - Login via GitHub OAuth (JWT)
> - Cadastro, alteração e exclusão de alimentos
> - Cadastro de refeições
> - Dados complementares do usuário (meta calórica, altura, peso)
> - Métricas: IMC e média calórica dos últimos 7 dias

Estrutura mínima: **rotas**, **controllers**, **middlewares** e **utils** (sem testes).

O provider foi migrado de SQLite para PostgreSQL: o sistema de arquivos do
Railway é efêmero e o arquivo `dev.db` seria apagado a cada novo deploy.

## Setup

```bash
npm install
cp .env.example .env          # preencha DATABASE_URL, GITHUB_CLIENT_ID/SECRET e JWT_SECRET
npx prisma migrate dev        # aplica as migrations num Postgres local ou remoto
npm run dev
```

`DATABASE_URL` deve apontar para um banco PostgreSQL (local ou, por exemplo, a
"Public Network URL" do Postgres do Railway). Em produção, `npm start` roda
`prisma migrate deploy`, que aplica as migrations versionadas em
`prisma/migrations/` — sem esse diretório commitado, o deploy sobe o servidor
mas nunca cria as tabelas.

## Deploy (Railway)

1. Crie um serviço PostgreSQL no Railway e um serviço apontando para este
   repositório.
2. Configure as variáveis de ambiente do serviço da API (veja `.env.example`):
   `DATABASE_URL` (referência ao Postgres do Railway), `JWT_SECRET`,
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` (com o
   domínio público do Railway) e `FRONTEND_URL` (domínio do frontend na
   Vercel).
3. Atualize a Callback URL do OAuth App no GitHub para
   `https://SEU-BACK.up.railway.app/auth/github/callback`.

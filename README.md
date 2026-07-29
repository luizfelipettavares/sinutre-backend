# sinutre-back

Backend do **SiNutre — Sistema de Ingestão de Macronutrientes**.

Stack: **TypeScript + Express + Prisma + SQLite**.

> Versão didática usada em aula. Por enquanto cobre apenas:
> - Login via GitHub OAuth
> - Cadastro de uma refeição

Estrutura mínima: apenas **rotas** e **controllers** (sem testes).

## Setup

```bash
npm install
cp .env.example .env          # preencha GITHUB_CLIENT_ID/SECRET e JWT_SECRET
npx prisma migrate dev        # cria prisma/dev.db e aplica as tabelas
npm run dev
```

O banco é um único arquivo em `prisma/dev.db` (ignorado pelo git). Para zerar,
basta apagar o arquivo e rodar `npx prisma migrate dev` de novo.

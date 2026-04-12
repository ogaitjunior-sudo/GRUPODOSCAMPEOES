# Grupo de Campeoes - EAFC

Portal frontend em React + Vite para vitrine de campeonatos, ligas, ranking, campeoes e paginas de apoio da comunidade.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase (Postgres + Data API)
- Prisma para documentar o schema do banco

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`

## Banco de dados

O projeto agora tem as tabelas `public.championships` e `public.championship_workspaces` preparadas para o Supabase.

- Migration SQL: `supabase/migrations/20260407195000_create_championships.sql`
- Migration SQL: `supabase/migrations/20260409113000_create_championship_workspaces.sql`
- Schema Prisma: `prisma/schema.prisma`
- Runtime no frontend: `src/lib/supabase.ts`, `src/lib/championship-store.ts` e `src/lib/championship-workspace-store.ts`

### Variaveis de ambiente

Use o arquivo `.env.example` como base.

- `DATABASE_URL`: string de conexao Postgres do projeto Supabase
- `DIRECT_DATABASE_URL`: conexao direta `db.<project-ref>.supabase.co` para migrations do Prisma
- `VITE_SUPABASE_URL`: URL publica do projeto
- `VITE_SUPABASE_ANON_KEY`: chave anon/publica do Supabase
- `VITE_ADMIN_USERNAME`: usuario exibido no login administrativo local
- `VITE_ADMIN_PASSWORD_HASH`: hash SHA-256 da senha admin local

Se a sua string de conexao foi copiada do painel do Supabase com colchetes em volta da senha, remova os colchetes antes de executar migrations.

### Como aplicar a migration no Supabase

1. Preencha `DATABASE_URL` e `DIRECT_DATABASE_URL` no `.env`.
2. Execute o SQL de `supabase/migrations/20260407195000_create_championships.sql` e `supabase/migrations/20260409113000_create_championship_workspaces.sql` no SQL Editor do Supabase, ou use uma ferramenta de migrate apontando para o mesmo banco.
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Rode `npm run dev` ou `npm run build` para validar o frontend.

## Fluxo do campeonato

- Crie o campeonato em `/admin/campeonatos/novo`.
- Apos salvar, o portal abre a rota detalhada `/campeonatos/:id`.
- Na aba `Grupos`, edite equipes e resultados da classificacao.
- Na aba `Finais`, configure a fase final e gere o chaveamento.
- Na aba `Ajustes pontuacao`, ajuste pontos padrao e bonus ou punicoes por equipe.

### Politicas de acesso

- Leitura: liberada para `anon` e `authenticated`
- Escrita: liberada apenas para `authenticated`

Isso foi mantido assim para evitar escrita publica aberta. Se voce quiser salvar campeonatos direto do painel admin no navegador, o proximo passo recomendado e integrar o login administrativo com Supabase Auth.

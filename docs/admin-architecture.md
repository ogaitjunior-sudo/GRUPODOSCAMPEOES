# Admin Architecture

## Stack escolhida

- Front-end: React + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui + Recharts
- Estado administrativo atual: `AdminPanelProvider` com persistencia local para prototipacao funcional
- Contrato de API: `src/admin/config/api-routes.ts`
- Banco: PostgreSQL
- Modelagem: Prisma
- Autenticacao administrativa: contexto dedicado com protecao de rotas e permissoes por papel

## Decisao de arquitetura

O projeto atual ja existe em React/Vite, entao a base administrativa foi criada sobre a stack existente para acelerar entrega sem introduzir uma migracao completa para outro framework. A estrutura foi organizada para separar:

- apresentacao do painel
- regras de permissao
- estado administrativo
- contratos de API
- modelagem persistente

Isso permite trocar o estado mockado por chamadas reais de API sem reescrever as telas.

## Estrutura de pastas

```text
src/
  admin/
    components/
    config/
      api-routes.ts
      navigation.ts
      security.ts
    context/
      AdminPanelContext.tsx
      adminSeed.ts
    layout/
      AdminLayout.tsx
      AdminRouteGuards.tsx
    pages/
      AdminDashboardPage.tsx
      AdminUsersPage.tsx
      AdminPlayersPage.tsx
      AdminTeamsPage.tsx
      AdminChampionshipsPage.tsx
      AdminImageRequestsPage.tsx
      AdminLanguagesPage.tsx
      AdminSupportPage.tsx
      AdminLogsPage.tsx
      AdminSettingsPage.tsx
    types.ts
    utils/
  contexts/
    AdminAuthContext.tsx
```

## Fluxo de seguranca

1. O administrador entra por `/admin/login`.
2. `AdminAuthContext` valida credenciais e gera sessao local.
3. `RequireAdminAccess` protege toda a arvore `/admin`.
4. `RequireAdminPermission` controla modulo por modulo.
5. `AdminPanelContext` registra auditoria a cada alteracao relevante.

## Modulos implementados

- Dashboard executivo
- Usuarios
- Jogadores
- Times
- Campeonatos
- Solicitacoes de imagem
- Idiomas
- Suporte
- Logs e monitoramento
- Configuracoes gerais

## Contrato de API sugerido

### Dashboard

- `GET /api/admin/dashboard/overview`
- `GET /api/admin/dashboard/activity`
- `GET /api/admin/dashboard/errors`

### Usuarios

- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/users/:id`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/permissions`
- `GET /api/admin/users/:id/history`
- `DELETE /api/admin/users/:id`

### Jogadores

- `GET /api/admin/players`
- `POST /api/admin/players`
- `GET /api/admin/players/:id`
- `PATCH /api/admin/players/:id`
- `PATCH /api/admin/players/:id/status`
- `GET /api/admin/players/:id/participation`

### Times

- `GET /api/admin/teams`
- `POST /api/admin/teams`
- `GET /api/admin/teams/:id`
- `PATCH /api/admin/teams/:id`
- `PATCH /api/admin/teams/:id/status`
- `GET /api/admin/teams/:id/members`
- `DELETE /api/admin/teams/:id`

### Campeonatos

- `GET /api/admin/championships`
- `POST /api/admin/championships`
- `GET /api/admin/championships/:id`
- `PATCH /api/admin/championships/:id`
- `GET /api/admin/championships/:id/phases`
- `GET /api/admin/championships/:id/registrations`
- `DELETE /api/admin/championships/:id`

### Solicitacoes de imagem

- `GET /api/admin/image-requests`
- `GET /api/admin/image-requests/:id`
- `PATCH /api/admin/image-requests/:id/moderate`

### Idiomas

- `GET /api/admin/languages`
- `POST /api/admin/languages`
- `GET /api/admin/languages/:id`
- `PATCH /api/admin/languages/:id`
- `GET /api/admin/languages/:id/translations`

### Suporte

- `GET /api/admin/tickets`
- `GET /api/admin/tickets/:id`
- `PATCH /api/admin/tickets/:id`
- `POST /api/admin/tickets/:id/reply`

### Logs

- `GET /api/admin/logs/audit`
- `GET /api/admin/logs/errors`
- `GET /api/admin/logs/audit/export`
- `GET /api/admin/logs/errors/export`

### Configuracoes

- `GET /api/admin/settings/site`
- `PATCH /api/admin/settings/site`
- `GET /api/admin/settings/banners`
- `PATCH /api/admin/settings/banners`
- `GET /api/admin/settings/static-pages`
- `PATCH /api/admin/settings/static-pages`

## Como evoluir para producao

1. Substituir o `AdminPanelProvider` por services conectados a API.
2. Implementar backend Node com controllers e services usando o schema Prisma.
3. Mover autenticacao admin para sessao segura com cookie httpOnly.
4. Persistir auditoria, tickets e logs no banco real.
5. Adicionar validacao Zod na fronteira da API.

## Como rodar localmente

1. Instale dependencias com `npm install`.
2. Preencha as variaveis de ambiente em `.env`.
3. Rode `npm run dev`.
4. Acesse `/admin/login`.
5. Para build de producao, use `npm run build`.

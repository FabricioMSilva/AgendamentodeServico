# IBeleza / VIP Space

Aplicacao Next.js para cadastro, busca e agendamento em estabelecimentos de beleza e bem-estar. O projeto usa Supabase para autenticacao, dados e storage, alem de rotas internas para lembretes e confirmacoes por WhatsApp.

## Stack

- Next.js 16 com App Router e React 19
- TypeScript
- Tailwind CSS 4
- Supabase SSR e Supabase JS
- Evolution API como provedor de WhatsApp
- PWA via `next-pwa`

## Primeiros Passos

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` a partir de `.env.local.example` e preencha as chaves reais.

3. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse `http://localhost:3000`.

## Variaveis de Ambiente

Obrigatorias para Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPER_ADMIN_EMAILS=
```

Opcionais ou dependentes de recurso:

```bash
CORREIOS_API_TOKEN=
CRON_SECRET=
WHATSAPP_WEBHOOK_SECRET=
WHATSAPP_PROVIDER=evolution
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
```

Notas:

- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CRON_SECRET`, `WHATSAPP_WEBHOOK_SECRET` e chaves da Evolution API nunca devem receber prefixo `NEXT_PUBLIC_`.
- Se `CORREIOS_API_TOKEN` faltar, a rota de CEP tenta fallback via ViaCEP.
- Sem `CRON_SECRET`, as rotas de automacao de WhatsApp retornam `401`.
- Sem as variaveis `EVOLUTION_*`, mensagens de WhatsApp nao sao enviadas.

## Supabase

Os arquivos de banco ficam em `supabase/`:

- `supabase/migrations/`: schema incremental, RLS, funcoes, dashboards e ajustes de performance.
- `supabase/setup.sql`: setup consolidado.
- `supabase/seed.sql`: dados SQL auxiliares.
- `scripts/seed-demo.mjs`: seed demo usando `SUPABASE_SERVICE_ROLE_KEY`.

Para popular dados demo:

```bash
npm run seed:demo
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run check
npm run audit:prod
npm run env:check
npm run seed:demo
```

`npm run check` roda TypeScript e build de producao. `npm run audit:prod` verifica vulnerabilidades nas dependencias de runtime. `npm run env:check` valida as variaveis locais sem imprimir segredos.

## Rotas Internas

Rotas de automacao protegidas por `CRON_SECRET`:

- `GET|POST /api/whatsapp/queue-reminders`
- `GET|POST /api/whatsapp/send-queued`

Webhook protegido por `WHATSAPP_WEBHOOK_SECRET` ou fallback para `CRON_SECRET`:

- `POST /api/whatsapp/webhook`

As chamadas aceitam `Authorization: Bearer <secret>` ou os headers internos correspondentes (`x-cron-secret` e `x-webhook-secret`).

## Evolution API Local

O projeto inclui um compose local para subir Evolution API, Postgres e Redis. Em algumas versoes do Docker Desktop no Windows, use `DOCKER_API_VERSION=1.51` na sessao antes dos comandos Docker.

```bash
docker compose -f docker-compose.evolution.yml up -d
```

A chave local fica em `.env.evolution` e deve ser a mesma de `EVOLUTION_API_KEY` no `.env.local`. A instancia configurada para desenvolvimento e `ibeleza-local`; depois de subir a Evolution, crie/conecte essa instancia no painel/API antes de testar envios. O manager fica em `http://localhost:8080/manager`.

Para parar:

```bash
docker compose -f docker-compose.evolution.yml down
```

## Observacoes de Seguranca

- O projeto tem CSP e headers de seguranca em `next.config.ts`.
- O PWA usa `next-pwa`; atualmente `npm audit` aponta vulnerabilidades transitivas em Workbox/terser por essa dependencia. Revise antes de deploy publico ou considere trocar/remover a camada PWA.
- Mantenha `.env.local` fora do Git. O template `.env.local.example` existe apenas como referencia.

alter table public.estabelecimentos
  add column if not exists status_aprovacao text not null default 'aprovado',
  add column if not exists aprovado_em timestamptz,
  add column if not exists aprovado_por uuid references public.usuarios(id) on delete set null;

alter table public.estabelecimentos
  drop constraint if exists estabelecimentos_status_aprovacao_check;

alter table public.estabelecimentos
  add constraint estabelecimentos_status_aprovacao_check
  check (status_aprovacao in ('pendente', 'aprovado', 'reprovado'));

create index if not exists estabelecimentos_status_aprovacao_idx
  on public.estabelecimentos (status_aprovacao, bloqueado, criado_em);

update public.estabelecimentos
set status_aprovacao = 'aprovado'
where status_aprovacao is null;

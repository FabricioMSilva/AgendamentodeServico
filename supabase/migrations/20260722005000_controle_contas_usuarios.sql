alter table public.usuarios
  add column if not exists conta_bloqueada boolean not null default false,
  add column if not exists bloqueado_em timestamptz,
  add column if not exists bloqueado_por uuid references public.usuarios(id) on delete set null;

create index if not exists usuarios_conta_bloqueada_idx
  on public.usuarios (conta_bloqueada, nivel_acesso, tipo_cadastro);

-- IBeleza - reset limpo do Supabase public schema.
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- Ele apaga SOMENTE tabelas/funcoes/types do schema public.
-- Nao apaga auth.users, pois essa tabela e interna do Supabase Auth.

begin;

create extension if not exists pgcrypto;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.criar_usuario_por_auth() cascade;
drop function if exists public.atualizar_atualizado_em() cascade;

drop table if exists public.appointment_events cascade;
drop table if exists public.appointment_items cascade;
drop table if exists public.appointments cascade;
drop table if exists public.establishment_media cascade;
drop table if exists public.establishment_schedule_exceptions cascade;
drop table if exists public.establishments cascade;
drop table if exists public.login_codes cascade;
drop table if exists public.notifications cascade;
drop table if exists public.payments cascade;
drop table if exists public.profiles cascade;
drop table if exists public.service_catalog cascade;
drop table if exists public.service_suggestions cascade;
drop table if exists public.services cascade;
drop table if exists public.staff_members cascade;
drop table if exists public.staff_services cascade;
drop table if exists public.super_admins cascade;
drop table if exists public.whatsapp_messages cascade;

drop table if exists public.administradores_globais cascade;
drop table if exists public.agendamentos cascade;
drop table if exists public.catalogo_servicos cascade;
drop table if exists public.codigos_login cascade;
drop table if exists public.estabelecimentos cascade;
drop table if exists public.eventos_agendamento cascade;
drop table if exists public.excecoes_horario_estabelecimento cascade;
drop table if exists public.funcionarios cascade;
drop table if exists public.itens_agendamento cascade;
drop table if exists public.movimentos_agendamento cascade;
drop table if exists public.tipos_movimento_agendamento cascade;
drop table if exists public.mensagens_whatsapp cascade;
drop table if exists public.midias_estabelecimento cascade;
drop table if exists public.notificacoes cascade;
drop table if exists public.pagamentos cascade;
drop table if exists public.servicos cascade;
drop table if exists public.servicos_funcionarios cascade;
drop table if exists public.sugestoes_servicos cascade;
drop table if exists public.usuarios cascade;

drop type if exists public.nivel_acesso_usuario cascade;
drop type if exists public.status_agendamento cascade;
drop sequence if exists public.agendamento_codigo_seq cascade;
drop type if exists public.tipo_preco cascade;
drop type if exists public.status_pagamento cascade;
drop type if exists public.status_notificacao cascade;

create type public.nivel_acesso_usuario as enum (
  'cliente',
  'profissional',
  'administrador'
);

create type public.status_agendamento as enum (
  'pendente',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
  'nao_compareceu'
);

create sequence public.agendamento_codigo_seq;

create or replace function public.gerar_codigo_agendamento()
returns text
language plpgsql
as $$
declare
  novo_codigo text;
begin
  loop
    novo_codigo := 'IBZ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.agendamento_codigo_seq')::text, 6, '0');
    exit when not exists (
      select 1
      from public.agendamentos
      where codigo = novo_codigo
    );
  end loop;

  return novo_codigo;
end;
$$;

create type public.tipo_preco as enum (
  'fixo',
  'variavel'
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nivel_acesso public.nivel_acesso_usuario not null default 'cliente',
  nome text,
  telefone text unique,
  email text unique,
  avatar_url text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  latitude double precision,
  longitude double precision,
  senha_definida boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.administradores_globais (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  telefone text unique,
  criado_em timestamptz not null default now()
);

create table public.codigos_login (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  codigo_hash text not null,
  tentativas integer not null default 0,
  expira_em timestamptz not null,
  consumido_em timestamptz,
  criado_em timestamptz not null default now()
);

create table public.estabelecimentos (
  id uuid primary key default gen_random_uuid(),
  usuario_admin_id uuid references public.usuarios(id) on delete set null,
  slug text not null unique,
  nome text not null,
  descricao text,
  tipo_negocio text not null default 'beleza',
  telefone text,
  whatsapp text,
  email text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  tiktok_url text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  endereco text,
  latitude double precision,
  longitude double precision,
  logo_url text,
  horarios_funcionamento jsonb not null default '{}'::jsonb,
  vagas_por_horario integer not null default 1,
  bloqueado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.midias_estabelecimento (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  url text not null,
  tipo text not null default 'imagem',
  titulo text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create table public.excecoes_horario_estabelecimento (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('bloqueio', 'extra', 'fechado')),
  inicio time,
  fim time,
  motivo text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (
    tipo = 'fechado'
    or (
      inicio is not null
      and fim is not null
      and inicio < fim
    )
  )
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  nome text not null,
  categoria text not null default 'Geral',
  descricao text,
  tipo_preco public.tipo_preco not null default 'fixo',
  preco numeric(10,2),
  duracao_minutos integer not null default 60,
  imagem_url text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null default public.gerar_codigo_agendamento(),
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  cliente_id uuid references public.usuarios(id) on delete set null,
  nome_cliente text,
  telefone_cliente text,
  horario timestamptz not null,
  status public.status_agendamento not null default 'pendente',
  preco_total numeric(10,2) not null default 0,
  duracao_total_minutos integer not null default 0,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.itens_agendamento (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  servico_id uuid references public.servicos(id) on delete set null,
  nome_servico text not null,
  tipo_preco public.tipo_preco not null default 'fixo',
  preco numeric(10,2),
  duracao_minutos integer not null default 60
);

create table public.tipos_movimento_agendamento (
  codigo text primary key,
  descricao text not null,
  categoria text not null default 'agenda',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.movimentos_agendamento (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  codigo_agendamento text not null,
  codigo_movimento text not null references public.tipos_movimento_agendamento(codigo),
  usuario_id uuid references public.usuarios(id) on delete set null,
  estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
  status_anterior public.status_agendamento,
  status_novo public.status_agendamento,
  metadata jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index usuarios_telefone_idx on public.usuarios (telefone);
create index usuarios_email_idx on public.usuarios (email);
create index usuarios_nivel_acesso_idx on public.usuarios (nivel_acesso);
create index codigos_login_telefone_idx on public.codigos_login (telefone);
create index codigos_login_expira_em_idx on public.codigos_login (expira_em);
create index estabelecimentos_slug_idx on public.estabelecimentos (slug);
create index midias_estabelecimento_idx on public.midias_estabelecimento (estabelecimento_id, ordem);
create index excecoes_horario_estabelecimento_lookup_idx on public.excecoes_horario_estabelecimento (estabelecimento_id, data);
create index servicos_estabelecimento_idx on public.servicos (estabelecimento_id, ativo, nome);
create index agendamentos_estabelecimento_horario_idx on public.agendamentos (estabelecimento_id, horario);
create index agendamentos_cliente_idx on public.agendamentos (cliente_id);
create unique index agendamentos_codigo_key on public.agendamentos (codigo);
create index movimentos_agendamento_agendamento_idx on public.movimentos_agendamento (agendamento_id, criado_em desc);
create index movimentos_agendamento_estabelecimento_idx on public.movimentos_agendamento (estabelecimento_id, criado_em desc);
create index movimentos_agendamento_codigo_idx on public.movimentos_agendamento (codigo_agendamento);
create index movimentos_agendamento_tipo_idx on public.movimentos_agendamento (codigo_movimento, criado_em desc);

create or replace function public.atualizar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger usuarios_atualizado_em
before update on public.usuarios
for each row execute function public.atualizar_atualizado_em();

create trigger estabelecimentos_atualizado_em
before update on public.estabelecimentos
for each row execute function public.atualizar_atualizado_em();

create trigger excecoes_horario_estabelecimento_atualizado_em
before update on public.excecoes_horario_estabelecimento
for each row execute function public.atualizar_atualizado_em();

create trigger servicos_atualizado_em
before update on public.servicos
for each row execute function public.atualizar_atualizado_em();

create trigger agendamentos_atualizado_em
before update on public.agendamentos
for each row execute function public.atualizar_atualizado_em();

insert into public.tipos_movimento_agendamento (codigo, descricao, categoria)
values
  ('AGENDAMENTO_CRIADO', 'Cliente criou solicitação de agendamento e enviou para aprovação.', 'agendamento'),
  ('APROVADO_SALAO', 'Salão aprovou o agendamento.', 'aprovacao'),
  ('RECUSADO_SALAO', 'Salão recusou o agendamento.', 'aprovacao'),
  ('CANCELADO_CLIENTE', 'Cliente cancelou o agendamento.', 'cancelamento'),
  ('CANCELADO_COMERCIANTE', 'Comerciante cancelou o agendamento.', 'cancelamento'),
  ('CONCLUIDO', 'Atendimento foi concluído.', 'finalizacao'),
  ('NAO_COMPARECEU', 'Cliente não compareceu ao atendimento.', 'finalizacao'),
  ('WHATSAPP_ENVIADO', 'Mensagem de WhatsApp foi enviada sobre o agendamento.', 'comunicacao');

create or replace function public.registrar_movimento_agendamento(
  p_agendamento_id uuid,
  p_codigo_movimento text,
  p_usuario_id uuid default auth.uid(),
  p_status_anterior public.status_agendamento default null,
  p_status_novo public.status_agendamento default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  agendamento_row record;
  movimento_id uuid;
begin
  select id, codigo, estabelecimento_id
    into agendamento_row
  from public.agendamentos
  where id = p_agendamento_id;

  if not found then
    raise exception 'Agendamento não encontrado para registrar movimento.';
  end if;

  if not exists (
    select 1
    from public.tipos_movimento_agendamento
    where codigo = p_codigo_movimento
      and ativo = true
  ) then
    raise exception 'Código de movimento inválido: %', p_codigo_movimento;
  end if;

  insert into public.movimentos_agendamento (
    agendamento_id,
    codigo_agendamento,
    codigo_movimento,
    usuario_id,
    estabelecimento_id,
    status_anterior,
    status_novo,
    metadata
  )
  values (
    agendamento_row.id,
    agendamento_row.codigo,
    p_codigo_movimento,
    p_usuario_id,
    agendamento_row.estabelecimento_id,
    p_status_anterior,
    p_status_novo,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into movimento_id;

  return movimento_id;
end;
$$;

create or replace function public.registrar_criacao_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.registrar_movimento_agendamento(
    new.id,
    'AGENDAMENTO_CRIADO',
    new.cliente_id,
    null,
    new.status,
    jsonb_build_object(
      'origem', 'trigger',
      'horario', new.horario,
      'nome_cliente', new.nome_cliente,
      'telefone_cliente', new.telefone_cliente,
      'preco_total', new.preco_total,
      'duracao_total_minutos', new.duracao_total_minutos
    )
  );

  return new;
end;
$$;

create trigger agendamentos_registrar_criacao
after insert on public.agendamentos
for each row execute function public.registrar_criacao_agendamento();

create or replace function public.criar_usuario_por_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  telefone_usuario text := regexp_replace(coalesce(new.phone, new.raw_user_meta_data->>'phone', ''), '\D', '', 'g');
  email_usuario text := nullif(lower(coalesce(new.email, '')), '');
  nivel_usuario public.nivel_acesso_usuario := 'cliente';
begin
  if exists (
    select 1
    from public.administradores_globais a
    where (a.email is not null and lower(a.email) = email_usuario)
       or (
         a.telefone is not null
         and regexp_replace(a.telefone, '\D', '', 'g') = telefone_usuario
       )
  ) then
    nivel_usuario := 'administrador';
  end if;

  insert into public.usuarios (
    id,
    nivel_acesso,
    nome,
    telefone,
    email,
    avatar_url,
    cep,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    senha_definida
  )
  values (
    new.id,
    nivel_usuario,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), ''),
    nullif(telefone_usuario, ''),
    email_usuario,
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'zip_code', ''),
    nullif(new.raw_user_meta_data->>'street', ''),
    nullif(new.raw_user_meta_data->>'number', ''),
    nullif(new.raw_user_meta_data->>'complement', ''),
    nullif(new.raw_user_meta_data->>'neighborhood', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'state', ''),
    true
  )
  on conflict (id) do update set
    nivel_acesso = case
      when usuarios.nivel_acesso = 'administrador' then usuarios.nivel_acesso
      else excluded.nivel_acesso
    end,
    nome = excluded.nome,
    telefone = excluded.telefone,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    cep = excluded.cep,
    rua = excluded.rua,
    numero = excluded.numero,
    complemento = excluded.complemento,
    bairro = excluded.bairro,
    cidade = excluded.cidade,
    estado = excluded.estado,
    atualizado_em = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.criar_usuario_por_auth();

alter table public.usuarios enable row level security;
alter table public.administradores_globais enable row level security;
alter table public.codigos_login enable row level security;
alter table public.estabelecimentos enable row level security;
alter table public.midias_estabelecimento enable row level security;
alter table public.excecoes_horario_estabelecimento enable row level security;
alter table public.servicos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.itens_agendamento enable row level security;
alter table public.tipos_movimento_agendamento enable row level security;
alter table public.movimentos_agendamento enable row level security;

create policy usuarios_select_proprio
  on public.usuarios
  for select
  to authenticated
  using (id = auth.uid());

create policy usuarios_update_proprio
  on public.usuarios
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and nivel_acesso = (
      select u.nivel_acesso
      from public.usuarios u
      where u.id = auth.uid()
    )
  );

create policy estabelecimentos_select_publico
  on public.estabelecimentos
  for select
  to anon, authenticated
  using (bloqueado = false);

create policy midias_estabelecimento_select_publico
  on public.midias_estabelecimento
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.estabelecimentos e
      where e.id = midias_estabelecimento.estabelecimento_id
        and e.bloqueado = false
    )
  );

create policy excecoes_horario_select_publico
  on public.excecoes_horario_estabelecimento
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.estabelecimentos e
      where e.id = excecoes_horario_estabelecimento.estabelecimento_id
        and e.bloqueado = false
    )
  );

create policy excecoes_horario_comerciante_gerencia
  on public.excecoes_horario_estabelecimento
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.estabelecimentos e
      where e.id = excecoes_horario_estabelecimento.estabelecimento_id
        and e.usuario_admin_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.estabelecimentos e
      where e.id = excecoes_horario_estabelecimento.estabelecimento_id
        and e.usuario_admin_id = auth.uid()
    )
  );

create policy servicos_select_publico
  on public.servicos
  for select
  to anon, authenticated
  using (
    ativo = true
    and exists (
      select 1
      from public.estabelecimentos e
      where e.id = servicos.estabelecimento_id
        and e.bloqueado = false
    )
  );

create policy tipos_movimento_select_autenticado
  on public.tipos_movimento_agendamento
  for select
  to authenticated
  using (true);

create policy movimentos_select_cliente_ou_comerciante
  on public.movimentos_agendamento
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.agendamentos a
      where a.id = movimentos_agendamento.agendamento_id
        and a.cliente_id = auth.uid()
    )
    or exists (
      select 1
      from public.estabelecimentos e
      where e.id = movimentos_agendamento.estabelecimento_id
        and e.usuario_admin_id = auth.uid()
    )
  );

grant execute on function public.registrar_movimento_agendamento(
  uuid,
  text,
  uuid,
  public.status_agendamento,
  public.status_agendamento,
  jsonb
) to authenticated, service_role;

insert into public.administradores_globais (telefone)
values ('5524993081222')
on conflict do nothing;

commit;

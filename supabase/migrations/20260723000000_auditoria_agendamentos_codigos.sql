create sequence if not exists public.agendamento_codigo_seq;

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

alter table public.agendamentos
  add column if not exists codigo text;

update public.agendamentos
set codigo = public.gerar_codigo_agendamento()
where codigo is null;

alter table public.agendamentos
  alter column codigo set default public.gerar_codigo_agendamento(),
  alter column codigo set not null;

create unique index if not exists agendamentos_codigo_key
  on public.agendamentos (codigo);

create table if not exists public.tipos_movimento_agendamento (
  codigo text primary key,
  descricao text not null,
  categoria text not null default 'agenda',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.tipos_movimento_agendamento (codigo, descricao, categoria)
values
  ('AGENDAMENTO_CRIADO', 'Cliente criou solicitação de agendamento e enviou para aprovação.', 'agendamento'),
  ('APROVADO_SALAO', 'Salão aprovou o agendamento.', 'aprovacao'),
  ('RECUSADO_SALAO', 'Salão recusou o agendamento.', 'aprovacao'),
  ('CANCELADO_CLIENTE', 'Cliente cancelou o agendamento.', 'cancelamento'),
  ('CANCELADO_COMERCIANTE', 'Comerciante cancelou o agendamento.', 'cancelamento'),
  ('CONCLUIDO', 'Atendimento foi concluído.', 'finalizacao'),
  ('NAO_COMPARECEU', 'Cliente não compareceu ao atendimento.', 'finalizacao'),
  ('WHATSAPP_ENVIADO', 'Mensagem de WhatsApp foi enviada sobre o agendamento.', 'comunicacao')
on conflict (codigo) do update
set
  descricao = excluded.descricao,
  categoria = excluded.categoria,
  ativo = true;

create table if not exists public.movimentos_agendamento (
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

create index if not exists movimentos_agendamento_agendamento_idx
  on public.movimentos_agendamento (agendamento_id, criado_em desc);

create index if not exists movimentos_agendamento_estabelecimento_idx
  on public.movimentos_agendamento (estabelecimento_id, criado_em desc);

create index if not exists movimentos_agendamento_codigo_idx
  on public.movimentos_agendamento (codigo_agendamento);

create index if not exists movimentos_agendamento_tipo_idx
  on public.movimentos_agendamento (codigo_movimento, criado_em desc);

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

drop trigger if exists agendamentos_registrar_criacao on public.agendamentos;

create trigger agendamentos_registrar_criacao
after insert on public.agendamentos
for each row execute function public.registrar_criacao_agendamento();

insert into public.movimentos_agendamento (
  agendamento_id,
  codigo_agendamento,
  codigo_movimento,
  usuario_id,
  estabelecimento_id,
  status_anterior,
  status_novo,
  metadata,
  criado_em
)
select
  a.id,
  a.codigo,
  'AGENDAMENTO_CRIADO',
  a.cliente_id,
  a.estabelecimento_id,
  null,
  a.status,
  jsonb_build_object(
    'origem', 'backfill_migration',
    'horario', a.horario,
    'nome_cliente', a.nome_cliente,
    'telefone_cliente', a.telefone_cliente,
    'preco_total', a.preco_total,
    'duracao_total_minutos', a.duracao_total_minutos
  ),
  coalesce(a.criado_em, now())
from public.agendamentos a
where not exists (
  select 1
  from public.movimentos_agendamento m
  where m.agendamento_id = a.id
    and m.codigo_movimento = 'AGENDAMENTO_CRIADO'
);

alter table public.tipos_movimento_agendamento enable row level security;
alter table public.movimentos_agendamento enable row level security;

drop policy if exists "Tipos de movimento visiveis para autenticados" on public.tipos_movimento_agendamento;
create policy "Tipos de movimento visiveis para autenticados"
on public.tipos_movimento_agendamento
for select
to authenticated
using (true);

drop policy if exists "Movimentos visiveis para cliente ou comerciante" on public.movimentos_agendamento;
create policy "Movimentos visiveis para cliente ou comerciante"
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

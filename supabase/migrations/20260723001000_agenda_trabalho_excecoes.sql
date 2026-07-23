create table if not exists public.excecoes_horario_estabelecimento (
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

create index if not exists excecoes_horario_estabelecimento_lookup_idx
  on public.excecoes_horario_estabelecimento (estabelecimento_id, data);

create or replace function public.atualizar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists excecoes_horario_estabelecimento_atualizado_em on public.excecoes_horario_estabelecimento;

create trigger excecoes_horario_estabelecimento_atualizado_em
before update on public.excecoes_horario_estabelecimento
for each row execute function public.atualizar_atualizado_em();

alter table public.excecoes_horario_estabelecimento enable row level security;

drop policy if exists "Excecoes de horario visiveis para publico" on public.excecoes_horario_estabelecimento;
create policy "Excecoes de horario visiveis para publico"
on public.excecoes_horario_estabelecimento
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.estabelecimentos e
    where e.id = excecoes_horario_estabelecimento.estabelecimento_id
      and e.bloqueado = false
      and e.status_aprovacao = 'aprovado'
  )
);

drop policy if exists "Comerciante gerencia excecoes de horario" on public.excecoes_horario_estabelecimento;
create policy "Comerciante gerencia excecoes de horario"
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

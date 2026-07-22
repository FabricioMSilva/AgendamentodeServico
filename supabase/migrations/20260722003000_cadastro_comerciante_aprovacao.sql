alter table public.usuarios
  add column if not exists tipo_cadastro text not null default 'usuario',
  add column if not exists cpf text,
  add column if not exists cnpj text,
  add column if not exists comerciante_status text not null default 'nao_solicitado',
  add column if not exists comerciante_ativo boolean not null default false,
  add column if not exists comerciante_aprovado_em timestamptz,
  add column if not exists comerciante_aprovado_por uuid references public.usuarios(id) on delete set null;

alter table public.usuarios
  drop constraint if exists usuarios_tipo_cadastro_check;

alter table public.usuarios
  add constraint usuarios_tipo_cadastro_check
  check (tipo_cadastro in ('usuario', 'comerciante'));

alter table public.usuarios
  drop constraint if exists usuarios_comerciante_status_check;

alter table public.usuarios
  add constraint usuarios_comerciante_status_check
  check (comerciante_status in ('nao_solicitado', 'pendente', 'aprovado', 'reprovado'));

create index if not exists usuarios_comerciante_status_idx
  on public.usuarios (comerciante_status, comerciante_ativo, criado_em);

update public.usuarios
set
  tipo_cadastro = case
    when nivel_acesso = 'profissional' then 'comerciante'
    else tipo_cadastro
  end,
  comerciante_status = case
    when nivel_acesso = 'profissional' then 'aprovado'
    else comerciante_status
  end,
  comerciante_ativo = case
    when nivel_acesso = 'profissional' then true
    else comerciante_ativo
  end
where nivel_acesso = 'profissional';

create table if not exists public.categorias_servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.catalogo_servicos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias_servico(id) on delete cascade,
  nome text not null,
  duracao_minutos_padrao integer not null default 30,
  preco_padrao numeric,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (categoria_id, nome)
);

create index if not exists categorias_servico_ativo_ordem_idx
  on public.categorias_servico (ativo, ordem, nome);

create index if not exists catalogo_servicos_categoria_ativo_nome_idx
  on public.catalogo_servicos (categoria_id, ativo, nome);

insert into public.categorias_servico (nome, ordem)
values
  ('Cabelo', 1),
  ('Unhas', 2),
  ('Pele', 3)
on conflict (nome) do update set
  ordem = excluded.ordem,
  ativo = true;

with categorias as (
  select id, nome from public.categorias_servico
)
insert into public.catalogo_servicos (categoria_id, nome, duracao_minutos_padrao, preco_padrao)
select c.id, s.nome, s.duracao_minutos_padrao, s.preco_padrao
from categorias c
join (
  values
    ('Cabelo', 'Corte feminino', 40, 45),
    ('Cabelo', 'Corte masculino', 30, 40),
    ('Cabelo', 'Corte infantil', 30, 35),
    ('Cabelo', 'Barba', 20, 25),
    ('Cabelo', 'Barboterapia', 45, 60),
    ('Cabelo', 'Pezinho', 10, 15),
    ('Cabelo', 'Sobrancelha', 15, 20),
    ('Cabelo', 'Escova', 40, 50),
    ('Cabelo', 'Hidratação', 45, 60),
    ('Cabelo', 'Coloração', 90, 120),
    ('Cabelo', 'Mechas', 150, 220),
    ('Cabelo', 'Luzes', 150, 220),
    ('Cabelo', 'Progressiva', 150, 180),
    ('Cabelo', 'Selagem', 120, 150),
    ('Cabelo', 'Alisamento', 150, 180),
    ('Cabelo', 'Penteado', 60, 90),
    ('Cabelo', 'Tranças', 120, 160),
    ('Cabelo', 'Pigmentação', 40, 50),
    ('Unhas', 'Manicure', 45, 30),
    ('Unhas', 'Pedicure', 45, 35),
    ('Unhas', 'Mão e pé', 90, 65),
    ('Unhas', 'Esmaltação', 25, 20),
    ('Unhas', 'Esmaltação em gel', 60, 60),
    ('Unhas', 'Alongamento de unhas', 120, 140),
    ('Unhas', 'Banho de gel', 90, 90),
    ('Unhas', 'Blindagem', 60, 70),
    ('Unhas', 'Spa dos pés', 60, 70),
    ('Unhas', 'Podologia', 60, 90),
    ('Unhas', 'Remoção de alongamento', 45, 50),
    ('Unhas', 'Nail art', 30, 25),
    ('Pele', 'Limpeza de pele', 60, 120),
    ('Pele', 'Limpeza facial', 45, 90),
    ('Pele', 'Hidratação facial', 45, 85),
    ('Pele', 'Peeling superficial', 50, 140),
    ('Pele', 'Microagulhamento', 60, 180),
    ('Pele', 'Dermaplaning', 45, 120),
    ('Pele', 'Design de sobrancelha', 30, 35),
    ('Pele', 'Depilação com cera', 30, 50),
    ('Pele', 'Depilação facial', 20, 35),
    ('Pele', 'Depilação a laser', 30, 120),
    ('Pele', 'Massagem relaxante', 50, 90),
    ('Pele', 'Massagem modeladora', 50, 100),
    ('Pele', 'Drenagem linfática', 50, 100),
    ('Pele', 'Tratamento de acne', 60, 140),
    ('Pele', 'Revitalização facial', 50, 110),
    ('Pele', 'Tatuagem pequena', 90, 180),
    ('Pele', 'Piercing', 30, 80)
) as s(categoria_nome, nome, duracao_minutos_padrao, preco_padrao)
  on s.categoria_nome = c.nome
on conflict (categoria_id, nome) do update set
  duracao_minutos_padrao = excluded.duracao_minutos_padrao,
  preco_padrao = excluded.preco_padrao,
  ativo = true;

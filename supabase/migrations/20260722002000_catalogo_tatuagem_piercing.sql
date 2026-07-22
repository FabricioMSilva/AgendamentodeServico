insert into public.categorias_servico (nome, ordem)
values
  ('Tatuagem', 4),
  ('Piercing', 5)
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
    ('Tatuagem', 'Orçamento de tatuagem', 30, 0),
    ('Tatuagem', 'Tatuagem pequena', 90, 180),
    ('Tatuagem', 'Tatuagem média', 150, 350),
    ('Tatuagem', 'Tatuagem grande', 240, 700),
    ('Tatuagem', 'Flash tattoo', 60, 120),
    ('Tatuagem', 'Cobertura de tatuagem', 180, 450),
    ('Tatuagem', 'Retoque de tatuagem', 60, 0),
    ('Tatuagem', 'Tatuagem fine line', 120, 250),
    ('Tatuagem', 'Tatuagem colorida', 180, 450),
    ('Tatuagem', 'Tatuagem realista', 240, 800),
    ('Tatuagem', 'Fechamento de braço', 300, 1000),
    ('Piercing', 'Aplicação de piercing', 30, 80),
    ('Piercing', 'Body piercing', 30, 80),
    ('Piercing', 'Piercing na orelha', 20, 70),
    ('Piercing', 'Piercing no nariz', 20, 80),
    ('Piercing', 'Piercing no umbigo', 30, 90),
    ('Piercing', 'Piercing na sobrancelha', 30, 90),
    ('Piercing', 'Piercing labial', 30, 90),
    ('Piercing', 'Piercing na língua', 30, 120),
    ('Piercing', 'Troca de joia', 15, 30),
    ('Piercing', 'Remoção de piercing', 15, 30),
    ('Piercing', 'Avaliação de cicatrização', 20, 0)
) as s(categoria_nome, nome, duracao_minutos_padrao, preco_padrao)
  on s.categoria_nome = c.nome
on conflict (categoria_id, nome) do update set
  duracao_minutos_padrao = excluded.duracao_minutos_padrao,
  preco_padrao = excluded.preco_padrao,
  ativo = true;

delete from public.catalogo_servicos cs
using public.categorias_servico c
where cs.categoria_id = c.id
  and c.nome = 'Pele'
  and cs.nome in ('Tatuagem pequena', 'Piercing');

update public.servicos
set categoria = 'Tatuagem'
where categoria = 'Pele'
  and (
    nome ilike '%tatuagem%'
    or nome ilike '%tattoo%'
    or nome ilike '%retoque%'
    or nome ilike '%flash%'
  );

update public.servicos
set categoria = 'Piercing'
where categoria = 'Pele'
  and (
    nome ilike '%piercing%'
    or nome ilike '%joia%'
    or nome ilike '%jóia%'
  );

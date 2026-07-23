-- Seed de teste IBeleza - Volta Redonda/RJ
-- Cria 3 estabelecimentos aprovados e cadastra todos os servicos do catalogo em cada um.
-- Pode rodar mais de uma vez: os slugs abaixo sao removidos e recriados.

begin;

delete from public.estabelecimentos
where slug in (
  'studio-bella-vr',
  'espaco-glow-vr',
  'ink-beauty-vr'
);

with estabelecimentos_seed as (
  select *
  from (
    values
      (
        '11111111-1111-4111-8111-111111111111'::uuid,
        'studio-bella-vr',
        'Studio Bella VR',
        'Salao completo para cabelo, unhas e cuidados de beleza no Aterrado.',
        'salao_feminino',
        '(24) 99901-1001',
        '5524999011001',
        'contato@studiobellavr.com',
        'Rua Vereador Acacio da Rocha, 145 - Aterrado, Volta Redonda - RJ',
        'Rua Vereador Acacio da Rocha',
        '145',
        'Loja 02',
        'Aterrado',
        'Volta Redonda',
        'RJ',
        '27213-540',
        -22.5108::double precision,
        -44.0939::double precision,
        1.00::numeric
      ),
      (
        '22222222-2222-4222-8222-222222222222'::uuid,
        'espaco-glow-vr',
        'Espaco Glow VR',
        'Clinica de estetica, unhas e bem-estar em Vila Santa Cecilia.',
        'estetica',
        '(24) 99902-2002',
        '5524999022002',
        'agenda@espacoglowvr.com',
        'Rua 14, 88 - Vila Santa Cecilia, Volta Redonda - RJ',
        'Rua 14',
        '88',
        'Sala 305',
        'Vila Santa Cecilia',
        'Volta Redonda',
        'RJ',
        '27260-140',
        -22.5216::double precision,
        -44.1047::double precision,
        1.08::numeric
      ),
      (
        '33333333-3333-4333-8333-333333333333'::uuid,
        'ink-beauty-vr',
        'Ink Beauty VR',
        'Studio de tatuagem, piercing e beleza urbana no Retiro.',
        'studio_tattoo',
        '(24) 99903-3003',
        '5524999033003',
        'hello@inkbeautyvr.com',
        'Avenida Sávio Gama, 720 - Retiro, Volta Redonda - RJ',
        'Avenida Sávio Gama',
        '720',
        'Sobreloja',
        'Retiro',
        'Volta Redonda',
        'RJ',
        '27281-420',
        -22.4888::double precision,
        -44.0878::double precision,
        1.15::numeric
      )
  ) as e(
    id,
    slug,
    nome,
    descricao,
    tipo_negocio,
    telefone,
    whatsapp,
    email,
    endereco,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    latitude,
    longitude,
    fator_preco
  )
),
estabelecimentos_insert as (
  insert into public.estabelecimentos (
    id,
    usuario_admin_id,
    slug,
    nome,
    descricao,
    tipo_negocio,
    telefone,
    whatsapp,
    email,
    endereco,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    latitude,
    longitude,
    horarios_funcionamento,
    vagas_por_horario,
    bloqueado,
    status_aprovacao,
    aprovado_em
  )
  select
    id,
    null,
    slug,
    nome,
    descricao,
    tipo_negocio,
    telefone,
    whatsapp,
    email,
    endereco,
    rua,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    latitude,
    longitude,
    '{
      "1": [{"abre": "08:00", "fecha": "18:00"}],
      "2": [{"abre": "08:00", "fecha": "18:00"}],
      "3": [{"abre": "08:00", "fecha": "18:00"}],
      "4": [{"abre": "08:00", "fecha": "18:00"}],
      "5": [{"abre": "08:00", "fecha": "19:00"}],
      "6": [{"abre": "08:00", "fecha": "14:00"}]
    }'::jsonb,
    2,
    false,
    'aprovado',
    now()
  from estabelecimentos_seed
  returning id
),
servicos_seed as (
  select *
  from (
    values
      ('Cabelo', 'Corte feminino', 'fixo'::public.tipo_preco, 60, 70.00),
      ('Cabelo', 'Corte masculino', 'fixo'::public.tipo_preco, 45, 45.00),
      ('Cabelo', 'Corte infantil', 'fixo'::public.tipo_preco, 40, 40.00),
      ('Cabelo', 'Barba', 'fixo'::public.tipo_preco, 30, 35.00),
      ('Cabelo', 'Barboterapia', 'fixo'::public.tipo_preco, 45, 55.00),
      ('Cabelo', 'Pezinho', 'fixo'::public.tipo_preco, 20, 25.00),
      ('Cabelo', 'Sobrancelha', 'fixo'::public.tipo_preco, 25, 30.00),
      ('Cabelo', 'Escova', 'fixo'::public.tipo_preco, 50, 65.00),
      ('Cabelo', 'Hidratacao', 'fixo'::public.tipo_preco, 60, 90.00),
      ('Cabelo', 'Coloracao', 'fixo'::public.tipo_preco, 120, 180.00),
      ('Cabelo', 'Mechas', 'fixo'::public.tipo_preco, 180, 260.00),
      ('Cabelo', 'Luzes', 'fixo'::public.tipo_preco, 180, 240.00),
      ('Cabelo', 'Progressiva', 'fixo'::public.tipo_preco, 180, 220.00),
      ('Cabelo', 'Selagem', 'fixo'::public.tipo_preco, 150, 190.00),
      ('Cabelo', 'Alisamento', 'fixo'::public.tipo_preco, 180, 250.00),
      ('Cabelo', 'Penteado', 'fixo'::public.tipo_preco, 90, 120.00),
      ('Cabelo', 'Trancas', 'fixo'::public.tipo_preco, 180, 180.00),
      ('Cabelo', 'Pigmentacao', 'fixo'::public.tipo_preco, 60, 80.00),

      ('Unhas', 'Manicure', 'fixo'::public.tipo_preco, 45, 35.00),
      ('Unhas', 'Pedicure', 'fixo'::public.tipo_preco, 50, 40.00),
      ('Unhas', 'Mao e pe', 'fixo'::public.tipo_preco, 80, 70.00),
      ('Unhas', 'Esmaltacao', 'fixo'::public.tipo_preco, 35, 30.00),
      ('Unhas', 'Esmaltacao em gel', 'fixo'::public.tipo_preco, 60, 65.00),
      ('Unhas', 'Alongamento de unhas', 'fixo'::public.tipo_preco, 150, 160.00),
      ('Unhas', 'Banho de gel', 'fixo'::public.tipo_preco, 90, 110.00),
      ('Unhas', 'Blindagem', 'fixo'::public.tipo_preco, 70, 80.00),
      ('Unhas', 'Spa dos pes', 'fixo'::public.tipo_preco, 70, 85.00),
      ('Unhas', 'Podologia', 'fixo'::public.tipo_preco, 60, 100.00),
      ('Unhas', 'Remocao de alongamento', 'fixo'::public.tipo_preco, 45, 50.00),
      ('Unhas', 'Nail art', 'fixo'::public.tipo_preco, 60, 75.00),

      ('Pele', 'Limpeza de pele', 'fixo'::public.tipo_preco, 90, 140.00),
      ('Pele', 'Limpeza facial', 'fixo'::public.tipo_preco, 70, 110.00),
      ('Pele', 'Hidratacao facial', 'fixo'::public.tipo_preco, 60, 120.00),
      ('Pele', 'Peeling superficial', 'fixo'::public.tipo_preco, 60, 160.00),
      ('Pele', 'Microagulhamento', 'fixo'::public.tipo_preco, 90, 240.00),
      ('Pele', 'Dermaplaning', 'fixo'::public.tipo_preco, 60, 130.00),
      ('Pele', 'Design de sobrancelha', 'fixo'::public.tipo_preco, 35, 45.00),
      ('Pele', 'Depilacao com cera', 'fixo'::public.tipo_preco, 60, 90.00),
      ('Pele', 'Depilacao facial', 'fixo'::public.tipo_preco, 35, 55.00),
      ('Pele', 'Depilacao a laser', 'fixo'::public.tipo_preco, 45, 180.00),
      ('Pele', 'Massagem relaxante', 'fixo'::public.tipo_preco, 60, 130.00),
      ('Pele', 'Massagem modeladora', 'fixo'::public.tipo_preco, 60, 150.00),
      ('Pele', 'Drenagem linfatica', 'fixo'::public.tipo_preco, 60, 145.00),
      ('Pele', 'Tratamento de acne', 'fixo'::public.tipo_preco, 75, 170.00),
      ('Pele', 'Revitalizacao facial', 'fixo'::public.tipo_preco, 70, 150.00),

      ('Tatuagem', 'Orcamento de tatuagem', 'variavel'::public.tipo_preco, 30, null),
      ('Tatuagem', 'Tatuagem pequena', 'fixo'::public.tipo_preco, 90, 180.00),
      ('Tatuagem', 'Tatuagem media', 'fixo'::public.tipo_preco, 150, 350.00),
      ('Tatuagem', 'Tatuagem grande', 'variavel'::public.tipo_preco, 240, null),
      ('Tatuagem', 'Flash tattoo', 'fixo'::public.tipo_preco, 60, 120.00),
      ('Tatuagem', 'Cobertura de tatuagem', 'variavel'::public.tipo_preco, 180, null),
      ('Tatuagem', 'Retoque de tatuagem', 'fixo'::public.tipo_preco, 60, 100.00),
      ('Tatuagem', 'Tatuagem fine line', 'fixo'::public.tipo_preco, 120, 260.00),
      ('Tatuagem', 'Tatuagem colorida', 'fixo'::public.tipo_preco, 180, 420.00),
      ('Tatuagem', 'Tatuagem realista', 'variavel'::public.tipo_preco, 240, null),
      ('Tatuagem', 'Fechamento de braco', 'variavel'::public.tipo_preco, 360, null),

      ('Piercing', 'Aplicacao de piercing', 'fixo'::public.tipo_preco, 40, 90.00),
      ('Piercing', 'Body piercing', 'fixo'::public.tipo_preco, 40, 100.00),
      ('Piercing', 'Piercing na orelha', 'fixo'::public.tipo_preco, 35, 80.00),
      ('Piercing', 'Piercing no nariz', 'fixo'::public.tipo_preco, 35, 90.00),
      ('Piercing', 'Piercing no umbigo', 'fixo'::public.tipo_preco, 45, 120.00),
      ('Piercing', 'Piercing na sobrancelha', 'fixo'::public.tipo_preco, 40, 100.00),
      ('Piercing', 'Piercing labial', 'fixo'::public.tipo_preco, 40, 110.00),
      ('Piercing', 'Piercing na lingua', 'fixo'::public.tipo_preco, 45, 130.00),
      ('Piercing', 'Troca de joia', 'fixo'::public.tipo_preco, 25, 35.00),
      ('Piercing', 'Remocao de piercing', 'fixo'::public.tipo_preco, 25, 35.00),
      ('Piercing', 'Avaliacao de cicatrizacao', 'fixo'::public.tipo_preco, 25, 30.00)
  ) as s(categoria, nome, tipo_preco, duracao_minutos, preco)
)
insert into public.servicos (
  estabelecimento_id,
  nome,
  categoria,
  descricao,
  tipo_preco,
  preco,
  duracao_minutos,
  ativo
)
select
  e.id,
  s.nome,
  s.categoria,
  'Servico de teste da categoria ' || s.categoria || ' em Volta Redonda/RJ.',
  s.tipo_preco,
  case
    when s.preco is null then null
    else round((s.preco * e.fator_preco)::numeric, 2)
  end,
  s.duracao_minutos,
  true
from estabelecimentos_seed e
cross join servicos_seed s
order by e.nome, s.categoria, s.nome;

commit;

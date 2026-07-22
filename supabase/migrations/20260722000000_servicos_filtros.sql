create index if not exists servicos_estabelecimento_ativo_categoria_idx
  on public.servicos (estabelecimento_id, ativo, categoria);

create index if not exists servicos_categoria_ativo_nome_idx
  on public.servicos (categoria, ativo, nome);

create index if not exists agendamentos_estabelecimento_status_horario_idx
  on public.agendamentos (estabelecimento_id, status, horario);

create index if not exists itens_agendamento_agendamento_id_idx
  on public.itens_agendamento (agendamento_id);

create or replace function public.impedir_mais_de_tres_estabelecimentos_por_comerciante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total_estabelecimentos integer;
begin
  if new.usuario_admin_id is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.usuario_admin_id::text));

  select count(*)
    into total_estabelecimentos
  from public.estabelecimentos
  where usuario_admin_id = new.usuario_admin_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if total_estabelecimentos >= 3 then
    raise exception 'Cada comerciante pode ter no máximo 3 estabelecimentos.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists limite_estabelecimentos_comerciante on public.estabelecimentos;

create trigger limite_estabelecimentos_comerciante
before insert or update of usuario_admin_id on public.estabelecimentos
for each row
execute function public.impedir_mais_de_tres_estabelecimentos_por_comerciante();

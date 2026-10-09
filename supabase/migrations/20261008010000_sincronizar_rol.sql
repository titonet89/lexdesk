-- El servicio de autenticación crea el usuario y DESPUÉS escribe app_metadata
-- (con una actualización). Por eso el rol también se sincroniza al actualizar.
-- app_metadata solo puede modificarlo el service role: el usuario no puede
-- cambiar su propio rol por esta vía.

create or replace function private.sync_role_from_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  v_role := case when new.raw_app_meta_data ->> 'role' = 'titular'
    then 'titular'::public.app_role
    else 'colaborador'::public.app_role
  end;

  update public.profiles
    set role = v_role
    where id = new.id and role is distinct from v_role;

  return new;
end;
$$;

create trigger on_auth_user_app_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function private.sync_role_from_app_metadata();

revoke all on function private.sync_role_from_app_metadata() from public, anon, authenticated;

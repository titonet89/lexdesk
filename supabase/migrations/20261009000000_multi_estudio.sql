-- =============================================================================
-- Multi-estudio (SaaS): cada estudio (organización) tiene sus datos aislados.
--
--   * organizations: los estudios.
--   * memberships:   rol de cada usuario EN cada estudio (titular | colaborador).
--                    Un colega puede colaborar con varios estudios; desactivarlo
--                    en uno no lo afecta en los demás.
--   * clients, matters, events, non_working_days y audit_log pasan a tener
--     organization_id. Las tablas hijas de un expediente heredan el estudio
--     del expediente.
--   * Todas las políticas RLS se reescriben en función de la membresía.
--
-- Los datos existentes se migran a un estudio inicial.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Estudios y membresías
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'colaborador',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id);

create trigger memberships_updated_at
  before update on public.memberships
  for each row execute function private.set_updated_at();

-- Migración de datos: un estudio inicial con todos los usuarios y datos actuales.
do $$
declare
  v_org uuid;
  v_titular_name text;
begin
  if exists (select 1 from public.profiles)
     or exists (select 1 from public.clients)
     or exists (select 1 from public.non_working_days) then
    select nullif(full_name, '') into v_titular_name
      from public.profiles where role = 'titular' order by created_at limit 1;

    insert into public.organizations (name)
      values (coalesce('Estudio ' || v_titular_name, 'Estudio inicial'))
      returning id into v_org;

    insert into public.memberships (organization_id, user_id, role, is_active)
      select v_org, p.id, p.role, p.is_active from public.profiles p;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Se quitan las políticas y funciones del modelo de un solo estudio
-- -----------------------------------------------------------------------------
drop policy "profiles: miembros activos leen" on public.profiles;
drop policy "profiles: cada uno edita su nombre" on public.profiles;
drop policy "clients: titular gestiona" on public.clients;
drop policy "matters: titular gestiona" on public.matters;
drop policy "matters: colaborador lee los compartidos" on public.matters;
drop policy "matter_shares: titular gestiona" on public.matter_shares;
drop policy "matter_shares: colaborador ve los propios" on public.matter_shares;
drop policy "matter_entries: titular gestiona" on public.matter_entries;
drop policy "matter_entries: colaborador lee las de expedientes compartidos" on public.matter_entries;
drop policy "matter_comments: lectura con acceso al expediente" on public.matter_comments;
drop policy "matter_comments: alta con permiso de comentario" on public.matter_comments;
drop policy "events: titular gestiona" on public.events;
drop policy "non_working_days: miembros leen" on public.non_working_days;
drop policy "non_working_days: titular gestiona" on public.non_working_days;
drop policy "documents: titular gestiona" on public.documents;
drop policy "documents: colaborador lee si se incluyeron" on public.documents;
drop policy "audit_log: titular lee" on public.audit_log;
drop policy "expedientes: lectura con acceso a documentos" on storage.objects;
drop policy "expedientes: titular sube" on storage.objects;
drop policy "expedientes: titular borra" on storage.objects;

drop trigger on_auth_user_app_metadata_updated on auth.users;
drop function private.sync_role_from_app_metadata();
drop function private.can_view_matter_documents(uuid);
drop function private.can_comment_matter(uuid);
drop function private.can_view_matter(uuid);
drop function private.active_share(uuid);
drop function private.is_active_member();
drop function private.is_titular();

-- El rol y el estado ahora viven en la membresía.
alter table public.profiles drop column role;
alter table public.profiles drop column is_active;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. organization_id en las tablas del estudio
-- -----------------------------------------------------------------------------
alter table public.clients add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.matters add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.events add column organization_id uuid references public.organizations (id) on delete cascade;
alter table public.non_working_days add column organization_id uuid references public.organizations (id) on delete cascade;
-- Sin clave foránea a propósito: la auditoría es un historial que sobrevive al estudio
-- (y registra el propio borrado en cascada de sus datos).
alter table public.audit_log add column organization_id uuid;

update public.clients set organization_id = (select id from public.organizations order by created_at limit 1);
update public.matters set organization_id = (select id from public.organizations order by created_at limit 1);
update public.events set organization_id = (select id from public.organizations order by created_at limit 1);
update public.non_working_days set organization_id = (select id from public.organizations order by created_at limit 1);
update public.audit_log set organization_id = (select id from public.organizations order by created_at limit 1);

alter table public.clients alter column organization_id set not null;
alter table public.matters alter column organization_id set not null;
alter table public.events alter column organization_id set not null;
alter table public.non_working_days alter column organization_id set not null;

create index clients_organization_idx on public.clients (organization_id);
create index matters_organization_idx on public.matters (organization_id);
create index events_organization_idx on public.events (organization_id, starts_at);
create index audit_log_organization_idx on public.audit_log (organization_id, occurred_at desc);

-- Al eliminar un estudio se borran en cascada sus clientes y expedientes: la
-- verificación cliente→expediente pasa a NO ACTION (se evalúa al final de la
-- operación) para no bloquear ese borrado. Borrar un cliente con expedientes
-- sigue estando prohibido.
alter table public.matters drop constraint matters_client_id_fkey;
alter table public.matters
  add constraint matters_client_id_fkey foreign key (client_id) references public.clients (id);

-- Número de expediente único dentro de cada estudio (no entre estudios).
drop index public.matters_file_number_uq;
create unique index matters_file_number_uq on public.matters (organization_id, file_number) where file_number is not null;

-- Días inhábiles por estudio (cada uno carga los de su jurisdicción).
alter table public.non_working_days drop constraint non_working_days_pkey;
alter table public.non_working_days add primary key (organization_id, day);

-- -----------------------------------------------------------------------------
-- 4. Funciones de autorización por membresía
-- -----------------------------------------------------------------------------
create or replace function private.my_titular_orgs()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id from public.memberships m
  where m.user_id = (select auth.uid()) and m.role = 'titular' and m.is_active and private.has_mfa();
$$;

create or replace function private.my_member_orgs()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id from public.memberships m
  where m.user_id = (select auth.uid()) and m.is_active and private.has_mfa();
$$;

create or replace function private.matter_org(p_matter_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.matters where id = p_matter_id;
$$;

create or replace function private.is_org_titular(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_org is not null and p_org in (select private.my_titular_orgs());
$$;

create or replace function private.shares_org_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships other
    where other.user_id = p_user and other.organization_id in (select private.my_member_orgs())
  );
$$;

-- Acceso compartido vigente del usuario actual a un expediente. Exige que el
-- colaborador siga siendo miembro activo del estudio del expediente.
create or replace function private.active_share(p_matter_id uuid)
returns public.matter_shares
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.matter_shares s
  join public.memberships m
    on m.user_id = s.collaborator_id and m.organization_id = private.matter_org(s.matter_id)
  where s.matter_id = p_matter_id
    and s.collaborator_id = (select auth.uid())
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
    and m.is_active
  limit 1;
$$;

create or replace function private.can_view_matter(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_titular(private.matter_org(p_matter_id))
    or (private.has_mfa() and (private.active_share(p_matter_id)).id is not null);
$$;

create or replace function private.can_comment_matter(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_titular(private.matter_org(p_matter_id))
    or (private.has_mfa() and (private.active_share(p_matter_id)).permission = 'comentario');
$$;

create or replace function private.can_view_matter_documents(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_titular(private.matter_org(p_matter_id))
    or (private.has_mfa() and coalesce((private.active_share(p_matter_id)).include_documents, false));
$$;

-- -----------------------------------------------------------------------------
-- 5. Integridad entre estudios (nada puede apuntar a datos de otro estudio)
-- -----------------------------------------------------------------------------
create or replace function private.check_matter_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select organization_id from public.clients where id = new.client_id) is distinct from new.organization_id then
    raise exception 'El cliente no pertenece a este estudio.';
  end if;
  return new;
end;
$$;

create trigger matters_check_org
  before insert or update of client_id, organization_id on public.matters
  for each row execute function private.check_matter_org();

create or replace function private.check_event_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.matter_id is not null
     and private.matter_org(new.matter_id) is distinct from new.organization_id then
    raise exception 'El expediente no pertenece a este estudio.';
  end if;
  return new;
end;
$$;

create trigger events_check_org
  before insert or update of matter_id, organization_id on public.events
  for each row execute function private.check_event_org();

create or replace function private.validate_share()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Revocar un acceso siempre está permitido.
  if new.revoked_at is not null then
    return new;
  end if;
  if exists (select 1 from public.matters m where m.id = new.matter_id and m.is_sensitive) then
    raise exception 'Este expediente está marcado como sensible y no puede compartirse.';
  end if;
  if not exists (
    select 1 from public.memberships m
    where m.user_id = new.collaborator_id
      and m.organization_id = private.matter_org(new.matter_id)
      and m.role = 'colaborador'
      and m.is_active
  ) then
    raise exception 'Solo se puede compartir con un colaborador activo del estudio.';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Auditoría por estudio
-- -----------------------------------------------------------------------------
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_record_id text;
  v_org uuid;
  v_changed text[];
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_record_id := coalesce(v_row ->> 'id', v_row ->> 'day', v_row ->> 'user_id');
  v_org := coalesce(
    (v_row ->> 'organization_id')::uuid,
    case when v_row ? 'matter_id' then private.matter_org((v_row ->> 'matter_id')::uuid) end
  );

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
  end if;

  insert into public.audit_log (actor_id, organization_id, action, table_name, record_id, changed_columns)
  values ((select auth.uid()), v_org, lower(tg_op), tg_table_name, v_record_id, v_changed);

  return coalesce(new, old);
end;
$$;

create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function private.audit_row_change();
create trigger audit_organizations after insert or update or delete on public.organizations
  for each row execute function private.audit_row_change();

create or replace function public.log_access(p_table_name text, p_record_id text, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if p_action not in ('view', 'download') then
    raise exception 'Acción inválida';
  end if;
  if p_table_name = 'matters' then
    v_org := private.matter_org(p_record_id::uuid);
    if not private.can_view_matter(p_record_id::uuid) then raise exception 'No autorizado'; end if;
  elsif p_table_name = 'documents' then
    v_org := (select private.matter_org(d.matter_id) from public.documents d where d.id = p_record_id::uuid);
    if not exists (
      select 1 from public.documents d
      where d.id = p_record_id::uuid and private.can_view_matter_documents(d.matter_id)
    ) then raise exception 'No autorizado'; end if;
  else
    raise exception 'Tabla inválida';
  end if;

  insert into public.audit_log (actor_id, organization_id, action, table_name, record_id)
  values ((select auth.uid()), v_org, p_action, p_table_name, p_record_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. Permisos y políticas
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

revoke all on public.organizations, public.memberships from anon;
revoke insert, delete on public.organizations from authenticated;
revoke update on public.organizations from authenticated;
grant update (name) on public.organizations to authenticated;
-- Las membresías solo las modifica el servidor (service role) tras verificar a la titular.
revoke insert, update, delete on public.memberships from authenticated;

create policy "organizations: miembros leen"
  on public.organizations for select to authenticated
  using (id in (select private.my_member_orgs()));

create policy "organizations: titular renombra"
  on public.organizations for update to authenticated
  using (id in (select private.my_titular_orgs()))
  with check (id in (select private.my_titular_orgs()));

create policy "memberships: cada uno ve las propias"
  on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));

create policy "memberships: titular ve las de su estudio"
  on public.memberships for select to authenticated
  using (organization_id in (select private.my_titular_orgs()));

create policy "profiles: el propio y los de sus estudios"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_org_with(id));

create policy "profiles: cada uno edita su nombre"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and private.has_mfa())
  with check (id = (select auth.uid()));

create policy "clients: titular del estudio gestiona"
  on public.clients for all to authenticated
  using (organization_id in (select private.my_titular_orgs()))
  with check (organization_id in (select private.my_titular_orgs()));

create policy "matters: titular del estudio gestiona"
  on public.matters for all to authenticated
  using (organization_id in (select private.my_titular_orgs()))
  with check (organization_id in (select private.my_titular_orgs()));

create policy "matters: colaborador lee los compartidos"
  on public.matters for select to authenticated
  using (private.can_view_matter(id));

create policy "matter_shares: titular del estudio gestiona"
  on public.matter_shares for all to authenticated
  using (private.is_org_titular(private.matter_org(matter_id)))
  with check (private.is_org_titular(private.matter_org(matter_id)));

create policy "matter_shares: colaborador ve los propios"
  on public.matter_shares for select to authenticated
  using (collaborator_id = (select auth.uid()) and private.has_mfa());

create policy "matter_entries: titular del estudio gestiona"
  on public.matter_entries for all to authenticated
  using (private.is_org_titular(private.matter_org(matter_id)))
  with check (private.is_org_titular(private.matter_org(matter_id)));

create policy "matter_entries: colaborador lee las de expedientes compartidos"
  on public.matter_entries for select to authenticated
  using (private.can_view_matter(matter_id));

create policy "matter_comments: lectura con acceso al expediente"
  on public.matter_comments for select to authenticated
  using (private.can_view_matter(matter_id));

create policy "matter_comments: alta con permiso de comentario"
  on public.matter_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_comment_matter(matter_id));

create policy "events: titular del estudio gestiona"
  on public.events for all to authenticated
  using (organization_id in (select private.my_titular_orgs()))
  with check (organization_id in (select private.my_titular_orgs()));

create policy "non_working_days: miembros del estudio leen"
  on public.non_working_days for select to authenticated
  using (organization_id in (select private.my_member_orgs()));

create policy "non_working_days: titular del estudio gestiona"
  on public.non_working_days for all to authenticated
  using (organization_id in (select private.my_titular_orgs()))
  with check (organization_id in (select private.my_titular_orgs()));

create policy "documents: titular del estudio gestiona"
  on public.documents for all to authenticated
  using (private.is_org_titular(private.matter_org(matter_id)))
  with check (private.is_org_titular(private.matter_org(matter_id)));

create policy "documents: colaborador lee si se incluyeron"
  on public.documents for select to authenticated
  using (private.can_view_matter_documents(matter_id));

create policy "audit_log: titular del estudio lee"
  on public.audit_log for select to authenticated
  using (organization_id in (select private.my_titular_orgs()));

create policy "expedientes: lectura con acceso a documentos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'expedientes'
    and private.can_view_matter_documents(private.storage_matter_id(name))
  );

create policy "expedientes: titular del estudio sube"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'expedientes'
    and private.is_org_titular(private.matter_org(private.storage_matter_id(name)))
  );

create policy "expedientes: titular del estudio borra"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'expedientes'
    and private.is_org_titular(private.matter_org(private.storage_matter_id(name)))
  );

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke all on function public.log_access(text, text, text) from public, anon;
grant execute on function public.log_access(text, text, text) to authenticated;

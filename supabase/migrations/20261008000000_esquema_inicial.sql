-- =============================================================================
-- Esquema inicial del sistema de gestión del estudio.
--
-- Principios:
--   * RLS (Row Level Security) activo en TODAS las tablas: la autorización vive
--     en la base de datos, no solo en la aplicación.
--   * Todo acceso exige sesión con verificación en dos pasos (AAL2).
--   * Rol "titular": acceso total. Rol "colaborador": solo los expedientes que
--     la titular le compartió explícitamente, en lectura o con comentarios.
--   * Los roles NO se pueden auto-asignar: solo los cambia el service role.
--   * Auditoría automática de altas, bajas y modificaciones.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Esquema privado para funciones auxiliares (no expuesto por la API REST).
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('titular', 'colaborador');

create type public.client_kind as enum ('persona', 'empresa');

create type public.document_type as enum ('DNI', 'CUIT', 'CUIL', 'Pasaporte', 'Otro');

create type public.practice_area as enum (
  'familia', 'sucesiones', 'civil', 'laboral', 'violencia_genero', 'otro'
);

create type public.matter_status as enum (
  'consulta', 'activo', 'en_espera', 'cerrado', 'archivado'
);

create type public.entry_kind as enum (
  'escrito', 'audiencia', 'notificacion', 'resolucion', 'reunion', 'llamada', 'nota', 'otro'
);

create type public.event_kind as enum (
  'audiencia', 'vencimiento', 'reunion', 'tramite', 'recordatorio'
);

create type public.event_priority as enum ('normal', 'alta', 'critica');

create type public.event_status as enum ('pendiente', 'cumplido', 'cancelado');

create type public.share_permission as enum ('lectura', 'comentario');

create type public.non_working_day_kind as enum ('feriado', 'feria_judicial', 'inhabil');

-- -----------------------------------------------------------------------------
-- Utilidad: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Perfiles (1 a 1 con auth.users)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text not null,
  role public.app_role not null default 'colaborador',
  professional_registration text check (char_length(professional_registration) <= 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Usuarios del panel. El rol solo lo modifica el service role.';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Crea el perfil al crear el usuario. El rol sale de app_metadata (que el
-- usuario no puede modificar); por defecto, colaborador.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_app_meta_data ->> 'role' = 'titular'
      then 'titular'::public.app_role
      else 'colaborador'::public.app_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Funciones de autorización (SECURITY DEFINER, search_path vacío)
-- -----------------------------------------------------------------------------
create or replace function private.has_mfa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create or replace function private.is_titular()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_mfa() and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'titular' and p.is_active
  );
$$;

create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_mfa() and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  );
$$;

-- -----------------------------------------------------------------------------
-- Clientes
-- -----------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  kind public.client_kind not null default 'persona',
  full_name text not null check (char_length(full_name) between 2 and 160),
  document_type public.document_type,
  document_number text check (char_length(document_number) <= 30),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 160),
  address text check (char_length(address) <= 200),
  locality text check (char_length(locality) <= 100),
  notes text check (char_length(notes) <= 5000),
  archived_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_full_name_idx on public.clients using btree (lower(full_name));
create index clients_document_idx on public.clients (document_number);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Expedientes
-- -----------------------------------------------------------------------------
create table public.matters (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null check (char_length(title) between 3 and 300),
  file_number text check (char_length(file_number) <= 60),
  area public.practice_area not null,
  court text check (char_length(court) <= 200),
  jurisdiction text not null default 'Jujuy' check (char_length(jurisdiction) <= 100),
  counterpart text check (char_length(counterpart) <= 300),
  status public.matter_status not null default 'consulta',
  opened_on date not null default (now() at time zone 'America/Argentina/Jujuy')::date,
  closed_on date,
  description text check (char_length(description) <= 10000),
  -- Marca casos especialmente delicados (p. ej. violencia de género):
  -- no se pueden compartir con colaboradores.
  is_sensitive boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matters_closed_after_opened check (closed_on is null or closed_on >= opened_on)
);

create index matters_client_idx on public.matters (client_id);
create index matters_status_idx on public.matters (status);
create unique index matters_file_number_uq on public.matters (file_number) where file_number is not null;

create trigger matters_updated_at
  before update on public.matters
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Colaboración: expedientes compartidos con colegas
-- -----------------------------------------------------------------------------
create table public.matter_shares (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  permission public.share_permission not null default 'lectura',
  include_documents boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create unique index matter_shares_active_uq
  on public.matter_shares (matter_id, collaborator_id) where revoked_at is null;
create index matter_shares_collaborator_idx on public.matter_shares (collaborator_id);

-- Un expediente sensible nunca se comparte, y solo se comparte con colaboradores.
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
    select 1 from public.profiles p
    where p.id = new.collaborator_id and p.role = 'colaborador' and p.is_active
  ) then
    raise exception 'Solo se puede compartir con un colaborador activo.';
  end if;
  return new;
end;
$$;

create trigger matter_shares_validate
  before insert or update on public.matter_shares
  for each row execute function private.validate_share();

-- Si un expediente pasa a ser sensible, se revocan los accesos compartidos.
create or replace function private.revoke_shares_when_sensitive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_sensitive and not old.is_sensitive then
    update public.matter_shares
      set revoked_at = now()
      where matter_id = new.id and revoked_at is null;
  end if;
  return new;
end;
$$;

create trigger matters_revoke_shares_when_sensitive
  after update of is_sensitive on public.matters
  for each row execute function private.revoke_shares_when_sensitive();

create or replace function private.active_share(p_matter_id uuid)
returns public.matter_shares
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.matter_shares s
  join public.profiles p on p.id = s.collaborator_id
  where s.matter_id = p_matter_id
    and s.collaborator_id = (select auth.uid())
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
    and p.is_active
  limit 1;
$$;

create or replace function private.can_view_matter(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_titular()
    or (private.has_mfa() and (private.active_share(p_matter_id)).id is not null);
$$;

create or replace function private.can_comment_matter(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_titular()
    or (private.has_mfa() and (private.active_share(p_matter_id)).permission = 'comentario');
$$;

create or replace function private.can_view_matter_documents(p_matter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_titular()
    or (private.has_mfa() and coalesce((private.active_share(p_matter_id)).include_documents, false));
$$;

-- -----------------------------------------------------------------------------
-- Actuaciones (bitácora del expediente)
-- -----------------------------------------------------------------------------
create table public.matter_entries (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  occurred_on date not null default (now() at time zone 'America/Argentina/Jujuy')::date,
  kind public.entry_kind not null default 'nota',
  summary text not null check (char_length(summary) between 2 and 300),
  details text check (char_length(details) <= 10000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matter_entries_matter_idx on public.matter_entries (matter_id, occurred_on desc);

create trigger matter_entries_updated_at
  before update on public.matter_entries
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Comentarios / observaciones de colaboradores (registro inalterable)
-- -----------------------------------------------------------------------------
create table public.matter_comments (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict default auth.uid(),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index matter_comments_matter_idx on public.matter_comments (matter_id, created_at);

-- -----------------------------------------------------------------------------
-- Agenda: audiencias, vencimientos, reuniones, trámites y recordatorios
-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references public.matters (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  kind public.event_kind not null default 'reunion',
  priority public.event_priority not null default 'normal',
  status public.event_status not null default 'pendiente',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location text check (char_length(location) <= 200),
  notes text check (char_length(notes) <= 5000),
  -- Datos del cómputo de plazo (si el vencimiento se calculó en días hábiles)
  deadline_from date,
  deadline_business_days integer check (deadline_business_days between 1 and 365),
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_at_idx on public.events (starts_at);
create index events_matter_idx on public.events (matter_id);

create trigger events_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Días inhábiles (feriados, ferias judiciales) para el cómputo de plazos
-- -----------------------------------------------------------------------------
create table public.non_working_days (
  day date primary key,
  kind public.non_working_day_kind not null default 'feriado',
  description text not null check (char_length(description) between 2 and 120),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Documentos (metadatos; el archivo vive en Storage privado)
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index documents_matter_idx on public.documents (matter_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id text,
  -- Solo los NOMBRES de las columnas modificadas: nunca se duplican datos
  -- personales en el registro de auditoría.
  changed_columns text[]
);

create index audit_log_occurred_idx on public.audit_log (occurred_at desc);

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record_id text;
  v_changed text[];
begin
  if tg_op = 'DELETE' then
    v_record_id := to_jsonb(old) ->> 'id';
  else
    v_record_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'day');
  end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at');
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, changed_columns)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_record_id, v_changed);

  return coalesce(new, old);
end;
$$;

create trigger audit_clients after insert or update or delete on public.clients
  for each row execute function private.audit_row_change();
create trigger audit_matters after insert or update or delete on public.matters
  for each row execute function private.audit_row_change();
create trigger audit_matter_entries after insert or update or delete on public.matter_entries
  for each row execute function private.audit_row_change();
create trigger audit_matter_shares after insert or update or delete on public.matter_shares
  for each row execute function private.audit_row_change();
create trigger audit_matter_comments after insert or update or delete on public.matter_comments
  for each row execute function private.audit_row_change();
create trigger audit_events after insert or update or delete on public.events
  for each row execute function private.audit_row_change();
create trigger audit_documents after insert or update or delete on public.documents
  for each row execute function private.audit_row_change();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function private.audit_row_change();
create trigger audit_non_working_days after insert or update or delete on public.non_working_days
  for each row execute function private.audit_row_change();

-- Registro explícito de accesos de lectura sensibles (p. ej. descarga de documentos).
create or replace function public.log_access(p_table_name text, p_record_id text, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_member() then
    raise exception 'No autorizado';
  end if;
  if p_action not in ('view', 'download') then
    raise exception 'Acción inválida';
  end if;
  insert into public.audit_log (actor_id, action, table_name, record_id)
  values ((select auth.uid()), p_action, left(p_table_name, 60), left(p_record_id, 60));
end;
$$;

revoke all on function public.log_access(text, text, text) from public, anon;
grant execute on function public.log_access(text, text, text) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.matters enable row level security;
alter table public.matter_shares enable row level security;
alter table public.matter_entries enable row level security;
alter table public.matter_comments enable row level security;
alter table public.events enable row level security;
alter table public.non_working_days enable row level security;
alter table public.documents enable row level security;
alter table public.audit_log enable row level security;

-- El rol anónimo no tiene acceso a ninguna tabla del sistema.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Perfiles: cada miembro ve los perfiles (nombres para comentarios); solo
-- puede editar su nombre. El rol y el estado los cambia el service role.
revoke update on public.profiles from authenticated;
grant update (full_name, professional_registration) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated;

create policy "profiles: miembros activos leen"
  on public.profiles for select to authenticated
  using (private.is_active_member());

create policy "profiles: cada uno edita su nombre"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and private.has_mfa())
  with check (id = (select auth.uid()));

-- Clientes: solo la titular. Los colaboradores no ven datos de clientes.
create policy "clients: titular gestiona"
  on public.clients for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

-- Expedientes
create policy "matters: titular gestiona"
  on public.matters for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

create policy "matters: colaborador lee los compartidos"
  on public.matters for select to authenticated
  using (private.can_view_matter(id));

-- Compartidos
create policy "matter_shares: titular gestiona"
  on public.matter_shares for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

create policy "matter_shares: colaborador ve los propios"
  on public.matter_shares for select to authenticated
  using (collaborator_id = (select auth.uid()) and private.has_mfa());

-- Actuaciones
create policy "matter_entries: titular gestiona"
  on public.matter_entries for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

create policy "matter_entries: colaborador lee las de expedientes compartidos"
  on public.matter_entries for select to authenticated
  using (private.can_view_matter(matter_id));

-- Comentarios: inalterables (sin update/delete para nadie desde la API).
revoke update, delete on public.matter_comments from authenticated;

create policy "matter_comments: lectura con acceso al expediente"
  on public.matter_comments for select to authenticated
  using (private.can_view_matter(matter_id));

create policy "matter_comments: alta con permiso de comentario"
  on public.matter_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_comment_matter(matter_id));

-- Agenda: solo la titular.
create policy "events: titular gestiona"
  on public.events for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

-- Días inhábiles: lectura para miembros, edición para la titular.
create policy "non_working_days: miembros leen"
  on public.non_working_days for select to authenticated
  using (private.is_active_member());

create policy "non_working_days: titular gestiona"
  on public.non_working_days for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

-- Documentos
create policy "documents: titular gestiona"
  on public.documents for all to authenticated
  using (private.is_titular())
  with check (private.is_titular());

create policy "documents: colaborador lee si se incluyeron"
  on public.documents for select to authenticated
  using (private.can_view_matter_documents(matter_id));

-- Auditoría: solo lectura para la titular; nadie escribe directamente.
revoke insert, update, delete on public.audit_log from authenticated;

create policy "audit_log: titular lee"
  on public.audit_log for select to authenticated
  using (private.is_titular());

-- Las funciones auxiliares se ejecutan solo por usuarios autenticados.
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- =============================================================================
-- Storage: bucket privado de documentos
--   Ruta de cada archivo: {matter_id}/{document_id}/{nombre}
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expedientes',
  'expedientes',
  false,
  26214400, -- 25 MiB
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create or replace function private.storage_matter_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function private.storage_matter_id(text) to authenticated;

create policy "expedientes: lectura con acceso a documentos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'expedientes'
    and private.can_view_matter_documents(private.storage_matter_id(name))
  );

create policy "expedientes: titular sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'expedientes' and private.is_titular());

create policy "expedientes: titular borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'expedientes' and private.is_titular());

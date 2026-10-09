-- =============================================================================
-- Honorarios y gastos.
--
--   * uma_values:          historial del valor de la UMA por estudio.
--   * fee_schedule_items:  arancel de referencia editable por estudio, precargado con
--                          la Ley 6368 de Jujuy (honorarios de abogados y procuradores)
--                          y los mínimos sugeridos de consultas del Colegio.
--   * matter_charges:      honorarios y gastos de cada expediente.
--   * charge_payments:     pagos (totales o parciales) de cada cargo.
--   * charge_balances:     vista con lo cobrado, el saldo y el estado de cada cargo.
--
-- Solo la titular del estudio accede a esta información (los colaboradores, nunca).
-- =============================================================================

create type public.charge_kind as enum ('honorario', 'gasto');
create type public.payment_method as enum ('transferencia', 'efectivo', 'tarjeta', 'cheque', 'otro');

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table public.uma_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  value numeric(14, 2) not null check (value > 0),
  effective_from date not null,
  note text check (char_length(note) <= 200),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (organization_id, effective_from)
);

create table public.fee_schedule_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null check (
    category in ('consultas', 'generico', 'contencioso', 'familia', 'penal', 'ejecuciones', 'incidentes', 'recursos', 'extrajudicial', 'otros')
  ),
  name text not null check (char_length(name) between 2 and 160),
  min_uma numeric(8, 2) not null check (min_uma >= 0),
  max_uma numeric(8, 2) check (max_uma is null or max_uma >= min_uma),
  legal_reference text check (char_length(legal_reference) <= 160),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fee_schedule_items_org_idx on public.fee_schedule_items (organization_id, category, sort_order);

create trigger fee_schedule_items_updated_at
  before update on public.fee_schedule_items
  for each row execute function private.set_updated_at();

create table public.matter_charges (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.matters (id) on delete cascade,
  kind public.charge_kind not null,
  concept text not null check (char_length(concept) between 2 and 200),
  amount numeric(14, 2) not null check (amount > 0),
  -- Trazabilidad del cálculo cuando el monto surge del arancel.
  uma_quantity numeric(8, 2) check (uma_quantity > 0),
  uma_value numeric(14, 2) check (uma_value > 0),
  schedule_item_id uuid references public.fee_schedule_items (id) on delete set null,
  charged_on date not null default (now() at time zone 'America/Argentina/Jujuy')::date,
  due_on date,
  notes text check (char_length(notes) <= 2000),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matter_charges_matter_idx on public.matter_charges (matter_id, charged_on desc);

create trigger matter_charges_updated_at
  before update on public.matter_charges
  for each row execute function private.set_updated_at();

create table public.charge_payments (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.matter_charges (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_on date not null default (now() at time zone 'America/Argentina/Jujuy')::date,
  method public.payment_method not null default 'transferencia',
  notes text check (char_length(notes) <= 500),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index charge_payments_charge_idx on public.charge_payments (charge_id);

-- Saldo y estado de cada cargo. security_invoker: respeta el RLS de quien consulta.
create view public.charge_balances
with (security_invoker = true) as
select
  c.id as charge_id,
  c.matter_id,
  c.kind,
  c.amount,
  coalesce(sum(p.amount), 0)::numeric(14, 2) as paid,
  (c.amount - coalesce(sum(p.amount), 0))::numeric(14, 2) as balance,
  case
    when coalesce(sum(p.amount), 0) = 0 then 'pendiente'
    when coalesce(sum(p.amount), 0) < c.amount then 'parcial'
    else 'pagado'
  end as status
from public.matter_charges c
left join public.charge_payments p on p.charge_id = c.id
group by c.id;

-- -----------------------------------------------------------------------------
-- Integridad: no se puede cobrar de más ni bajar un cargo por debajo de lo cobrado
-- -----------------------------------------------------------------------------
create or replace function private.check_payment_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount numeric;
  v_paid numeric;
begin
  select amount into v_amount from public.matter_charges where id = new.charge_id for update;
  select coalesce(sum(amount), 0) into v_paid
    from public.charge_payments
    where charge_id = new.charge_id and id is distinct from new.id;
  if v_paid + new.amount > v_amount then
    raise exception 'El pago supera el saldo pendiente del cargo.';
  end if;
  return new;
end;
$$;

create trigger charge_payments_check_balance
  before insert or update of amount, charge_id on public.charge_payments
  for each row execute function private.check_payment_balance();

create or replace function private.check_charge_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.amount < (select coalesce(sum(amount), 0) from public.charge_payments where charge_id = new.id) then
    raise exception 'El monto no puede ser menor a lo ya cobrado.';
  end if;
  return new;
end;
$$;

create trigger matter_charges_check_amount
  before update of amount on public.matter_charges
  for each row execute function private.check_charge_amount();

create or replace function private.charge_org(p_charge_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select private.matter_org(c.matter_id) from public.matter_charges c where c.id = p_charge_id;
$$;

-- -----------------------------------------------------------------------------
-- Arancel por defecto (Ley 6368 de Jujuy). Se carga al crear un estudio y puede
-- restaurarse desde el panel. Los valores son mínimos en UMA.
-- -----------------------------------------------------------------------------
create or replace function private.seed_fee_schedule(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.fee_schedule_items (organization_id, category, name, min_uma, max_uma, legal_reference, sort_order)
  values
    -- Consultas: mínimos sugeridos por el Colegio de Abogados y Procuradores de Jujuy.
    (p_org, 'consultas', 'Consulta virtual', 4, null, 'Colegio de Abogados y Procuradores de Jujuy (mínimo sugerido)', 10),
    (p_org, 'consultas', 'Consulta verbal', 5, null, 'Colegio de Abogados y Procuradores de Jujuy (mínimo sugerido)', 20),
    (p_org, 'consultas', 'Consulta escrita', 8, null, 'Colegio de Abogados y Procuradores de Jujuy (mínimo sugerido)', 30),
    -- Genérico para todos los fueros (art. 26).
    (p_org, 'generico', 'Proceso ordinario por audiencias', 20, null, 'Ley 6368, art. 26', 10),
    (p_org, 'generico', 'Proceso abreviado', 18, null, 'Ley 6368, art. 26', 20),
    (p_org, 'generico', 'Amparo, mandamiento de ejecución o prohibición', 15, null, 'Ley 6368, art. 26', 30),
    (p_org, 'generico', 'Medida autosatisfactiva', 13, null, 'Ley 6368, art. 26', 40),
    (p_org, 'generico', 'Procesos colectivos', 20, null, 'Ley 6368, art. 26', 50),
    (p_org, 'generico', 'Proceso de conocimiento sin trámite específico', 17, null, 'Ley 6368, art. 26', 60),
    -- Contencioso administrativo y originaria del Superior Tribunal (art. 26).
    (p_org, 'contencioso', 'Contencioso de plena jurisdicción y anulación', 20, null, 'Ley 6368, art. 26', 10),
    (p_org, 'contencioso', 'Apelación de multas o sanciones disciplinarias', 12, null, 'Ley 6368, art. 26', 20),
    (p_org, 'contencioso', 'Amparo por mora o informativo', 8, null, 'Ley 6368, art. 26', 30),
    (p_org, 'contencioso', 'Acción autónoma de inconstitucionalidad y conflicto de poderes', 20, null, 'Ley 6368, art. 26', 40),
    -- Familia y violencia de género (art. 26).
    (p_org, 'familia', 'Alimentos, capacidad de las personas y régimen de comunicación', 15, null, 'Ley 6368, art. 26', 10),
    (p_org, 'familia', 'Autorización para matrimonio, salir del país o disponer patrimonio', 15, null, 'Ley 6368, art. 26', 20),
    (p_org, 'familia', 'Divorcio', 16, null, 'Ley 6368, art. 26', 30),
    (p_org, 'familia', 'Adopción y filiación', 18, null, 'Ley 6368, art. 26', 40),
    (p_org, 'familia', 'Protección de personas', 16, null, 'Ley 6368, art. 26', 50),
    (p_org, 'familia', 'Exclusión del hogar', 16, null, 'Ley 6368, art. 26', 60),
    -- Penal (art. 26).
    (p_org, 'penal', 'Excarcelación o exención de prisión', 20, null, 'Ley 6368, art. 26', 10),
    (p_org, 'penal', 'Suspensión del juicio a prueba (pedido y audiencia)', 20, null, 'Ley 6368, art. 26', 20),
    (p_org, 'penal', 'Acta de juicio abreviado', 10, null, 'Ley 6368, art. 26', 30),
    (p_org, 'penal', 'Actuación hasta la clausura de la investigación penal preparatoria', 30, null, 'Ley 6368, art. 26', 40),
    (p_org, 'penal', 'Juicio oral ante la Cámara del Crimen', 40, null, 'Ley 6368, art. 26', 50),
    (p_org, 'penal', 'Apelación de resoluciones del Juzgado Contravencional', 15, null, 'Ley 6368, art. 26', 60),
    -- Ejecuciones (arts. 32 a 34).
    (p_org, 'ejecuciones', 'Juicio ejecutivo (condena de hasta 10 UMA)', 6, null, 'Ley 6368, art. 32', 10),
    (p_org, 'ejecuciones', 'Juicio ejecutivo (condena mayor a 10 UMA)', 10, null, 'Ley 6368, art. 32', 20),
    (p_org, 'ejecuciones', 'Ejecución fiscal o apremio (con excepciones)', 3, null, 'Ley 6368, art. 33', 30),
    (p_org, 'ejecuciones', 'Ejecución de sentencia sin excepciones', 5, null, 'Ley 6368, art. 34', 40),
    (p_org, 'ejecuciones', 'Ejecución de sentencia con excepciones', 7, null, 'Ley 6368, art. 34', 50),
    -- Incidentes y labores accesorias (arts. 45, 50 y 53).
    (p_org, 'incidentes', 'Incidentes y tercerías', 5, null, 'Ley 6368, art. 50', 10),
    (p_org, 'incidentes', 'Acción autónoma de cosa juzgada írrita', 20, null, 'Ley 6368, art. 45', 20),
    (p_org, 'incidentes', 'Exhorto u oficio Ley 22.172: notificaciones', 5, null, 'Ley 6368, art. 53 a)', 30),
    (p_org, 'incidentes', 'Exhorto u oficio Ley 22.172: actos registrales', 10, 20, 'Ley 6368, art. 53 b)', 40),
    (p_org, 'incidentes', 'Exhorto u oficio Ley 22.172: diligencias de prueba', 10, 30, 'Ley 6368, art. 53 c)', 50),
    -- Recursos (art. 54).
    (p_org, 'recursos', 'Recurso de apelación', 6, null, 'Ley 6368, art. 54', 10),
    (p_org, 'recursos', 'Recurso de inconstitucionalidad o casación', 13, null, 'Ley 6368, art. 54', 20),
    (p_org, 'recursos', 'Recurso extraordinario federal', 15, null, 'Ley 6368, art. 54', 30),
    -- Labores extrajudiciales (arts. 55 a 57).
    (p_org, 'extrajudicial', 'Labor extrajudicial con apreciación pecuniaria (mínimo)', 3, null, 'Ley 6368, art. 55', 10),
    (p_org, 'extrajudicial', 'Comisión médica (con acuerdo)', 12, null, 'Ley 6368, art. 56', 20),
    (p_org, 'extrajudicial', 'Comisión médica (sin acuerdo)', 4, null, 'Ley 6368, art. 56', 30),
    (p_org, 'extrajudicial', 'Mediación (con acuerdo)', 10, null, 'Ley 6368, art. 57', 40),
    (p_org, 'extrajudicial', 'Mediación (sin acuerdo)', 3, null, 'Ley 6368, art. 57', 50);
end;
$$;

create or replace function private.seed_fee_defaults(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.uma_values where organization_id = p_org) then
    insert into public.uma_values (organization_id, value, effective_from, note, created_by)
    values (p_org, 55786.00, '2026-08-01', 'UMA agosto 2026 publicada por el Colegio de Abogados y Procuradores de Jujuy', null);
  end if;
  if not exists (select 1 from public.fee_schedule_items where organization_id = p_org) then
    perform private.seed_fee_schedule(p_org);
  end if;
end;
$$;

create or replace function private.on_organization_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_fee_defaults(new.id);
  return new;
end;
$$;

create trigger organizations_seed_fee_defaults
  after insert on public.organizations
  for each row execute function private.on_organization_created();

-- Estudios existentes.
select private.seed_fee_defaults(id) from public.organizations;

-- Restaurar el arancel de la ley (solo la titular del estudio).
create or replace function public.restore_fee_schedule(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_org_titular(p_org) then
    raise exception 'No autorizado';
  end if;
  delete from public.fee_schedule_items where organization_id = p_org;
  perform private.seed_fee_schedule(p_org);
end;
$$;

-- -----------------------------------------------------------------------------
-- Auditoría
-- -----------------------------------------------------------------------------
create trigger audit_uma_values after insert or update or delete on public.uma_values
  for each row execute function private.audit_row_change();
create trigger audit_fee_schedule_items after insert or update or delete on public.fee_schedule_items
  for each row execute function private.audit_row_change();
create trigger audit_matter_charges after insert or update or delete on public.matter_charges
  for each row execute function private.audit_row_change();
create trigger audit_charge_payments after insert or update or delete on public.charge_payments
  for each row execute function private.audit_row_change();

-- -----------------------------------------------------------------------------
-- RLS: solo la titular del estudio
-- -----------------------------------------------------------------------------
alter table public.uma_values enable row level security;
alter table public.fee_schedule_items enable row level security;
alter table public.matter_charges enable row level security;
alter table public.charge_payments enable row level security;

revoke all on public.uma_values, public.fee_schedule_items, public.matter_charges, public.charge_payments from anon;
revoke all on public.charge_balances from anon;

create policy "uma_values: titular del estudio gestiona"
  on public.uma_values for all to authenticated
  using (organization_id in (select private.my_titular_orgs()))
  with check (organization_id in (select private.my_titular_orgs()));

create policy "fee_schedule_items: titular del estudio gestiona"
  on public.fee_schedule_items for all to authenticated
  using (organization_id in (select private.my_titular_orgs()))
  with check (organization_id in (select private.my_titular_orgs()));

create policy "matter_charges: titular del estudio gestiona"
  on public.matter_charges for all to authenticated
  using (private.is_org_titular(private.matter_org(matter_id)))
  with check (private.is_org_titular(private.matter_org(matter_id)));

create policy "charge_payments: titular del estudio gestiona"
  on public.charge_payments for all to authenticated
  using (private.is_org_titular(private.charge_org(charge_id)))
  with check (private.is_org_titular(private.charge_org(charge_id)));

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
revoke all on function public.restore_fee_schedule(uuid) from public, anon;
grant execute on function public.restore_fee_schedule(uuid) to authenticated;

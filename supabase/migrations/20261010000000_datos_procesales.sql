-- =============================================================================
-- Datos procesales del expediente y tablero por etapa.
--
--   * Etapa procesal (independiente del estado administrativo del expediente).
--   * Año, fuero, secretaría y abogado/a de la contraparte.
--   * Cada cambio de etapa queda registrado como actuación (trigger).
--   * Agenda: tipos "escrito" y "cédula", y marca de plazo perentorio.
-- =============================================================================

create type public.procedural_stage as enum (
  'iniciacion', 'tramite', 'prueba', 'alegatos', 'sentencia', 'recursos', 'ejecucion', 'archivo'
);

alter table public.matters
  add column stage public.procedural_stage not null default 'iniciacion',
  add column file_year integer check (file_year between 1900 and 2100),
  add column forum text check (char_length(forum) <= 100),
  add column secretariat text check (char_length(secretariat) <= 100),
  add column counterpart_lawyer text check (char_length(counterpart_lawyer) <= 200),
  add column stage_changed_at timestamptz not null default now();

-- Los expedientes cerrados o archivados pasan a la etapa "archivo".
update public.matters set stage = 'archivo' where status in ('cerrado', 'archivado');

create index matters_stage_idx on public.matters (organization_id, stage);

-- Registro automático del cambio de etapa en el historial del expediente.
create or replace function private.log_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_labels constant jsonb := '{
    "iniciacion": "Iniciación", "tramite": "Trámite", "prueba": "Prueba", "alegatos": "Alegatos",
    "sentencia": "Sentencia", "recursos": "Recursos", "ejecucion": "Ejecución", "archivo": "Archivo"
  }';
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    insert into public.matter_entries (matter_id, kind, summary, created_by)
    values (
      new.id,
      'nota',
      format('Cambio de etapa: %s → %s', v_labels ->> old.stage::text, v_labels ->> new.stage::text),
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger matters_log_stage_change
  before update of stage on public.matters
  for each row execute function private.log_stage_change();

-- Agenda: nuevos tipos de evento y plazo perentorio.
alter type public.event_kind add value if not exists 'escrito';
alter type public.event_kind add value if not exists 'cedula';

alter table public.events add column is_peremptory boolean not null default false;

revoke all on function private.log_stage_change() from public, anon;
grant execute on function private.log_stage_change() to authenticated;

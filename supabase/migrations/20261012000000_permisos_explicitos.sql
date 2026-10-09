-- =============================================================================
-- Permisos explícitos y mínimos sobre las tablas.
--
-- Los proyectos nuevos de Supabase ya no otorgan permisos automáticos a los
-- roles de la API sobre tablas nuevas. En lugar de depender de ese
-- comportamiento (que además difería entre local y la nube, y era demasiado
-- amplio: incluía TRUNCATE, que no está sujeto a RLS), cada rol recibe solo lo
-- que la aplicación usa. Las políticas RLS siguen decidiendo QUÉ filas.
--
-- Regla para migraciones futuras: toda tabla nueva debe otorgar sus permisos
-- de forma explícita al rol authenticated.
-- =============================================================================

-- Punto de partida limpio para los roles de la API.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant usage on schema public to authenticated, service_role;

-- service_role: solo se usa en el servidor (ignora RLS) para tareas administrativas
-- acotadas, siempre después de verificar a la titular.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- authenticated: solo las operaciones que usa la aplicación.
grant select on public.profiles to authenticated;
grant update (full_name, professional_registration) on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;

-- Las membresías solo las modifica el servidor.
grant select on public.memberships to authenticated;

grant select, insert, update, delete on
  public.clients,
  public.matters,
  public.matter_shares,
  public.matter_entries,
  public.events,
  public.non_working_days,
  public.documents,
  public.uma_values,
  public.fee_schedule_items,
  public.matter_charges,
  public.charge_payments
to authenticated;

-- Comentarios inalterables: se leen y se agregan, nunca se editan ni borran.
grant select, insert on public.matter_comments to authenticated;

-- La auditoría solo se lee; la escriben los triggers.
grant select on public.audit_log to authenticated;

grant select on public.charge_balances to authenticated;

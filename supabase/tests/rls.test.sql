-- Pruebas de seguridad (RLS) del sistema de gestión.
-- Ejecutar con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como superusuario)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'titular@test.local', '{"role":"titular"}', '{"full_name":"Titular"}'),
  ('22222222-2222-2222-2222-222222222222', 'colega@test.local', '{"role":"colaborador"}', '{"full_name":"Colega"}'),
  ('33333333-3333-3333-3333-333333333333', 'intruso@test.local', '{}', '{"full_name":"Auto titular"}');

select is(
  (select role::text from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'titular', 'El rol titular sale de app_metadata');
select is(
  (select role::text from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'colaborador', 'Sin app_metadata, el rol por defecto es colaborador');

-- Como hace el servicio de auth: crea el usuario y luego escribe app_metadata.
insert into auth.users (id, email, raw_app_meta_data)
values ('44444444-4444-4444-4444-444444444444', 'tardio@test.local', '{"provider":"email"}');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"titular"}'
  where id = '44444444-4444-4444-4444-444444444444';
select is(
  (select role::text from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  'titular', 'El rol se sincroniza cuando app_metadata se escribe después de crear el usuario');
delete from auth.users where id = '44444444-4444-4444-4444-444444444444';

insert into public.clients (id, full_name, created_by)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Cliente Uno', '11111111-1111-1111-1111-111111111111');

insert into public.matters (id, client_id, title, area, created_by)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Uno c/ Otro s/ alimentos', 'familia', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Caso reservado', 'violencia_genero', '11111111-1111-1111-1111-111111111111');

update public.matters set is_sensitive = true where id = 'bbbbbbbb-0000-0000-0000-000000000002';

insert into public.events (title, kind, starts_at, matter_id, created_by)
values ('Audiencia', 'audiencia', now() + interval '1 day', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');

insert into public.documents (matter_id, name, storage_path, mime_type, size_bytes)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'demanda.pdf', 'bbbbbbbb-0000-0000-0000-000000000001/x/demanda.pdf', 'application/pdf', 1000);

-- Totales reales (como superusuario) para comparar sin depender de datos previos.
select set_config('test.total_clients', (select count(*) from public.clients)::text, true);
select set_config('test.total_matters', (select count(*) from public.matters)::text, true);
select set_config('test.total_events', (select count(*) from public.events)::text, true);

-- ---------------------------------------------------------------------------
-- Anónimo
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok('select * from public.matters', '42501', null, 'Anónimo: sin permiso sobre expedientes');
select throws_ok('select * from public.clients', '42501', null, 'Anónimo: sin permiso sobre clientes');
reset role;

-- ---------------------------------------------------------------------------
-- Titular SIN 2FA (aal1): no ve nada
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.clients), 0, 'Titular sin 2FA: no ve clientes');
select is((select count(*)::int from public.matters), 0, 'Titular sin 2FA: no ve expedientes');
reset role;

-- ---------------------------------------------------------------------------
-- Titular CON 2FA (aal2): acceso total
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.clients), current_setting('test.total_clients')::int, 'Titular con 2FA: ve todos los clientes');
select is((select count(*)::int from public.matters), current_setting('test.total_matters')::int, 'Titular con 2FA: ve todos los expedientes');
select is((select count(*)::int from public.events), current_setting('test.total_events')::int, 'Titular con 2FA: ve toda la agenda');
select lives_ok(
  $$insert into public.matter_entries (matter_id, summary) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Se presentó demanda')$$,
  'Titular: carga actuaciones');
select throws_ok(
  $$insert into public.matter_shares (matter_id, collaborator_id) values ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222')$$,
  'P0001', null, 'Un expediente sensible no se puede compartir');
select lives_ok(
  $$insert into public.matter_shares (matter_id, collaborator_id, permission) values ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'lectura')$$,
  'Titular: comparte un expediente en modo lectura');
select throws_ok(
  $$insert into public.audit_log (action, table_name) values ('insert', 'x')$$,
  '42501', null, 'Nadie escribe la auditoría directamente');
select ok((select count(*) from public.audit_log) > 0, 'La titular ve la auditoría');
reset role;

-- ---------------------------------------------------------------------------
-- Colaborador con expediente compartido en LECTURA
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 1, 'Colaborador: ve solo el expediente compartido');
select is((select count(*)::int from public.matter_entries), 1, 'Colaborador: ve sus actuaciones');
select is((select count(*)::int from public.clients), 0, 'Colaborador: NO ve datos de clientes');
select is((select count(*)::int from public.events), 0, 'Colaborador: NO ve la agenda');
select is((select count(*)::int from public.documents), 0, 'Colaborador: no ve documentos si no se incluyeron');
select is((select count(*)::int from public.audit_log), 0, 'Colaborador: NO ve la auditoría');
select throws_ok(
  $$insert into public.matter_comments (matter_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Opinión')$$,
  '42501', null, 'Colaborador en lectura: no puede comentar');
select throws_ok(
  $$update public.profiles set role = 'titular' where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null, 'Colaborador: no puede auto-asignarse el rol titular');
update public.matters set title = 'Hackeado' where id = 'bbbbbbbb-0000-0000-0000-000000000001';
reset role;

select is(
  (select title from public.matters where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'Uno c/ Otro s/ alimentos', 'Colaborador: no puede modificar expedientes');

-- Permiso de comentario
update public.matter_shares set permission = 'comentario'
  where matter_id = 'bbbbbbbb-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$insert into public.matter_comments (matter_id, body) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Sugiero ampliar la prueba')$$,
  'Colaborador con permiso de comentario: puede comentar');
reset role;

-- Al marcar el expediente como sensible, se revoca el acceso
update public.matters set is_sensitive = true where id = 'bbbbbbbb-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 0, 'Marcar como sensible revoca el acceso compartido');
reset role;

-- Un acceso vencido no da acceso
update public.matters set is_sensitive = false where id = 'bbbbbbbb-0000-0000-0000-000000000001';
insert into public.matter_shares (matter_id, collaborator_id, expires_at)
values ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '1 minute');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 0, 'Un acceso vencido no da acceso');
reset role;

select * from finish();
rollback;

-- Pruebas de seguridad (RLS) del sistema multi-estudio.
-- Ejecutar con: npm run test:db
begin;
create extension if not exists pgtap with schema extensions;

select plan(56);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como superusuario): dos estudios, A y B.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'titular.a@test.local', '{"full_name":"Titular A"}'),
  ('22222222-2222-2222-2222-222222222222', 'colega@test.local', '{"full_name":"Colega"}'),
  ('33333333-3333-3333-3333-333333333333', 'titular.b@test.local', '{"full_name":"Titular B"}'),
  ('55555555-5555-5555-5555-555555555555', 'sin.estudio@test.local', '{"full_name":"Sin estudio"}');

select is((select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555'), 1,
  'Al crear un usuario se crea su perfil');

insert into public.organizations (id, name) values
  ('aaaa0000-0000-0000-0000-00000000000a', 'Estudio A'),
  ('bbbb0000-0000-0000-0000-00000000000b', 'Estudio B');

insert into public.memberships (organization_id, user_id, role) values
  ('aaaa0000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'titular'),
  ('aaaa0000-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 'colaborador'),
  ('bbbb0000-0000-0000-0000-00000000000b', '33333333-3333-3333-3333-333333333333', 'titular'),
  -- El mismo colega también colabora con el estudio B.
  ('bbbb0000-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'colaborador');

insert into public.clients (id, organization_id, full_name) values
  ('c0000000-0000-0000-0000-00000000000a', 'aaaa0000-0000-0000-0000-00000000000a', 'Cliente de A'),
  ('c0000000-0000-0000-0000-00000000000b', 'bbbb0000-0000-0000-0000-00000000000b', 'Cliente de B');

insert into public.matters (id, organization_id, client_id, title, area) values
  ('d0000000-0000-0000-0000-0000000000a1', 'aaaa0000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'A c/ X s/ alimentos', 'familia'),
  ('d0000000-0000-0000-0000-0000000000a2', 'aaaa0000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000a', 'Caso reservado de A', 'violencia_genero'),
  ('d0000000-0000-0000-0000-0000000000b1', 'bbbb0000-0000-0000-0000-00000000000b', 'c0000000-0000-0000-0000-00000000000b', 'B c/ Y s/ daños', 'civil');

update public.matters set is_sensitive = true where id = 'd0000000-0000-0000-0000-0000000000a2';

insert into public.events (organization_id, matter_id, title, kind, starts_at) values
  ('aaaa0000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000a1', 'Audiencia A', 'audiencia', now() + interval '1 day'),
  ('bbbb0000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-0000000000b1', 'Audiencia B', 'audiencia', now() + interval '1 day');

insert into public.documents (matter_id, name, storage_path, mime_type, size_bytes) values
  ('d0000000-0000-0000-0000-0000000000a1', 'demanda.pdf', 'd0000000-0000-0000-0000-0000000000a1/x/demanda.pdf', 'application/pdf', 1000);

insert into public.non_working_days (organization_id, day, description) values
  ('aaaa0000-0000-0000-0000-00000000000a', '2026-12-25', 'Navidad'),
  ('bbbb0000-0000-0000-0000-00000000000b', '2026-12-25', 'Navidad');

select ok(true, 'Dos estudios pueden cargar el mismo día inhábil');

-- Integridad entre estudios
select throws_ok(
  $$insert into public.matters (organization_id, client_id, title, area)
    values ('aaaa0000-0000-0000-0000-00000000000a', 'c0000000-0000-0000-0000-00000000000b', 'Cruce', 'civil')$$,
  'P0001', null, 'Un expediente no puede apuntar a un cliente de otro estudio');
select throws_ok(
  $$insert into public.events (organization_id, matter_id, title, kind, starts_at)
    values ('aaaa0000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-0000000000b1', 'Cruce', 'audiencia', now())$$,
  'P0001', null, 'Un evento no puede apuntar a un expediente de otro estudio');

-- ---------------------------------------------------------------------------
-- Anónimo
-- ---------------------------------------------------------------------------
set local role anon;
select throws_ok('select * from public.matters', '42501', null, 'Anónimo: sin permiso sobre expedientes');
select throws_ok('select * from public.organizations', '42501', null, 'Anónimo: sin permiso sobre estudios');
reset role;

-- ---------------------------------------------------------------------------
-- Titular A SIN 2FA (aal1): no ve nada
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.clients), 0, 'Titular sin 2FA: no ve clientes');
select is((select count(*)::int from public.matters), 0, 'Titular sin 2FA: no ve expedientes');
reset role;

-- ---------------------------------------------------------------------------
-- Passkey: vale como 2FA solo si la cuenta tiene el TOTP verificado
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","amr":[{"method":"passkey","timestamp":1}]}', true);
select is((select count(*)::int from public.clients), 0, 'Passkey sin TOTP verificado: no ve clientes');
reset role;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values ('f0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'App', 'totp', 'verified', now(), now(), 'X');
set local role authenticated;
select is((select count(*)::int from public.clients), 1, 'Passkey con TOTP verificado: ve los clientes de su estudio');
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","amr":[{"method":"password","timestamp":1}]}', true);
select is((select count(*)::int from public.clients), 0, 'Solo contraseña (con TOTP pendiente de verificar en la sesión): no ve clientes');
reset role;

-- ---------------------------------------------------------------------------
-- Titular A CON 2FA: ve todo lo de A y NADA de B
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.clients), 1, 'Titular A: ve solo los clientes de A');
select is((select count(*)::int from public.matters), 2, 'Titular A: ve solo los expedientes de A');
select is((select count(*)::int from public.events), 1, 'Titular A: ve solo la agenda de A');
select is((select count(*)::int from public.organizations), 1, 'Titular A: ve solo su estudio');
select is((select count(*)::int from public.memberships), 2, 'Titular A: ve las membresías de su estudio');
select is((select count(*)::int from public.matters where id = 'd0000000-0000-0000-0000-0000000000b1'), 0,
  'Titular A: el expediente de B no existe para ella');
select throws_ok(
  $$insert into public.clients (organization_id, full_name) values ('bbbb0000-0000-0000-0000-00000000000b', 'Intruso')$$,
  '42501', null, 'Titular A: no puede crear clientes en el estudio B');
update public.clients set full_name = 'Modificado' where id = 'c0000000-0000-0000-0000-00000000000b';
select throws_ok(
  $$insert into public.memberships (organization_id, user_id, role) values ('bbbb0000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'titular')$$,
  '42501', null, 'Nadie se puede agregar a un estudio desde la API');
select lives_ok(
  $$insert into public.matter_entries (matter_id, summary) values ('d0000000-0000-0000-0000-0000000000a1', 'Se presentó demanda')$$,
  'Titular A: carga actuaciones');
select throws_ok(
  $$insert into public.matter_entries (matter_id, summary) values ('d0000000-0000-0000-0000-0000000000b1', 'Intrusión')$$,
  '42501', null, 'Titular A: no carga actuaciones en expedientes de B');
select throws_ok(
  $$insert into public.matter_shares (matter_id, collaborator_id) values ('d0000000-0000-0000-0000-0000000000a2', '22222222-2222-2222-2222-222222222222')$$,
  'P0001', null, 'Un expediente sensible no se puede compartir');
select throws_ok(
  $$insert into public.matter_shares (matter_id, collaborator_id) values ('d0000000-0000-0000-0000-0000000000a1', '33333333-3333-3333-3333-333333333333')$$,
  'P0001', null, 'Solo se comparte con colaboradores del propio estudio');
select lives_ok(
  $$insert into public.matter_shares (matter_id, collaborator_id, permission) values ('d0000000-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222', 'lectura')$$,
  'Titular A: comparte un expediente en modo lectura');
select throws_ok(
  $$insert into public.audit_log (action, table_name) values ('insert', 'x')$$,
  '42501', null, 'Nadie escribe la auditoría directamente');
select is((select count(*)::int from public.audit_log where organization_id = 'bbbb0000-0000-0000-0000-00000000000b'), 0,
  'Titular A: no ve la auditoría de B');
reset role;

select is((select full_name from public.clients where id = 'c0000000-0000-0000-0000-00000000000b'), 'Cliente de B',
  'Titular A: no puede modificar clientes de B');

-- ---------------------------------------------------------------------------
-- Colega: colaborador en A (con acceso a un expediente) y en B (sin accesos)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 1, 'Colega: ve solo el expediente compartido');
select is((select count(*)::int from public.matter_entries), 1, 'Colega: ve sus actuaciones');
select is((select count(*)::int from public.clients), 0, 'Colega: NO ve datos de clientes');
select is((select count(*)::int from public.events), 0, 'Colega: NO ve la agenda');
select is((select count(*)::int from public.documents), 0, 'Colega: no ve documentos si no se incluyeron');
select is((select count(*)::int from public.audit_log), 0, 'Colega: NO ve la auditoría');
select throws_ok(
  $$insert into public.matter_comments (matter_id, body) values ('d0000000-0000-0000-0000-0000000000a1', 'Opinión')$$,
  '42501', null, 'Colega en lectura: no puede comentar');
update public.matters set title = 'Hackeado' where id = 'd0000000-0000-0000-0000-0000000000a1';
reset role;

select is((select title from public.matters where id = 'd0000000-0000-0000-0000-0000000000a1'), 'A c/ X s/ alimentos',
  'Colega: no puede modificar expedientes');

-- Desactivar al colega en A le quita el acceso a A (sin afectar su membresía en B).
update public.memberships set is_active = false
  where organization_id = 'aaaa0000-0000-0000-0000-00000000000a' and user_id = '22222222-2222-2222-2222-222222222222';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 0, 'Colega desactivado en A: pierde el acceso a A');
select is((select count(*)::int from public.organizations), 1, 'Colega desactivado en A: sigue siendo miembro de B');
reset role;

update public.memberships set is_active = true
  where organization_id = 'aaaa0000-0000-0000-0000-00000000000a' and user_id = '22222222-2222-2222-2222-222222222222';

-- Al marcar el expediente como sensible, se revoca el acceso.
update public.matters set is_sensitive = true where id = 'd0000000-0000-0000-0000-0000000000a1';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 0, 'Marcar como sensible revoca el acceso compartido');
reset role;

-- Un acceso vencido no da acceso.
update public.matters set is_sensitive = false where id = 'd0000000-0000-0000-0000-0000000000a1';
insert into public.matter_shares (matter_id, collaborator_id, expires_at)
values ('d0000000-0000-0000-0000-0000000000a1', '22222222-2222-2222-2222-222222222222', now() - interval '1 minute');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters), 0, 'Un acceso vencido no da acceso');
reset role;

-- Un usuario sin estudio no ve nada aunque tenga 2FA.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matters) + (select count(*)::int from public.organizations), 0,
  'Usuario sin estudio: no ve nada');
reset role;

-- Etapa procesal: el cambio queda registrado en el historial; un colega no puede cambiarla.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
update public.matters set stage = 'prueba' where id = 'd0000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from public.matter_entries
    where matter_id = 'd0000000-0000-0000-0000-0000000000a1' and summary = 'Cambio de etapa: Iniciación → Prueba'),
  1, 'El cambio de etapa se registra solo en el historial');
select lives_ok(
  $$insert into public.events (organization_id, title, kind, starts_at, is_peremptory)
    values ('aaaa0000-0000-0000-0000-00000000000a', 'Cédula a diligenciar', 'cedula', now(), true)$$,
  'Se pueden agendar cédulas con plazo perentorio');
reset role;

update public.matter_shares set expires_at = null, permission = 'comentario'
  where matter_id = 'd0000000-0000-0000-0000-0000000000a1' and revoked_at is null;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
update public.matters set stage = 'sentencia' where id = 'd0000000-0000-0000-0000-0000000000a1';
reset role;
select is((select stage::text from public.matters where id = 'd0000000-0000-0000-0000-0000000000a1'), 'prueba',
  'Un colega no puede cambiar la etapa procesal');

-- ---------------------------------------------------------------------------
-- Honorarios y gastos
-- ---------------------------------------------------------------------------
select is((select count(*)::int from public.fee_schedule_items where organization_id = 'aaaa0000-0000-0000-0000-00000000000a'), 43,
  'Un estudio nuevo nace con el arancel de la Ley 6368 precargado');
select is((select value from public.uma_values where organization_id = 'aaaa0000-0000-0000-0000-00000000000a'), 55786.00::numeric,
  'Un estudio nuevo nace con la UMA vigente');

insert into public.matter_charges (id, matter_id, kind, concept, amount)
values ('e0000000-0000-0000-0000-0000000000a1', 'd0000000-0000-0000-0000-0000000000a1', 'honorario', 'Divorcio (16 UMA)', 892576);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$insert into public.charge_payments (charge_id, amount) values ('e0000000-0000-0000-0000-0000000000a1', 400000)$$,
  'Titular: registra un pago parcial');
select is((select status from public.charge_balances where charge_id = 'e0000000-0000-0000-0000-0000000000a1'), 'parcial',
  'Con un pago parcial el cargo queda "parcial"');
select throws_ok(
  $$insert into public.charge_payments (charge_id, amount) values ('e0000000-0000-0000-0000-0000000000a1', 500000)$$,
  'P0001', null, 'No se puede cobrar más que el saldo');
select throws_ok(
  $$update public.matter_charges set amount = 100000 where id = 'e0000000-0000-0000-0000-0000000000a1'$$,
  'P0001', null, 'El monto no puede quedar por debajo de lo cobrado');
select lives_ok(
  $$insert into public.charge_payments (charge_id, amount) values ('e0000000-0000-0000-0000-0000000000a1', 492576)$$,
  'Titular: cancela el saldo');
select is((select status from public.charge_balances where charge_id = 'e0000000-0000-0000-0000-0000000000a1'), 'pagado',
  'Saldado el total, el cargo queda "pagado"');
select is((select count(*)::int from public.fee_schedule_items where organization_id = 'bbbb0000-0000-0000-0000-00000000000b'), 0,
  'Titular A: no ve el arancel del estudio B');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.matter_charges) + (select count(*)::int from public.charge_balances), 0,
  'Colega: NO ve honorarios ni gastos');
select throws_ok(
  $$select public.restore_fee_schedule('aaaa0000-0000-0000-0000-00000000000a')$$,
  'P0001', null, 'Solo la titular puede restaurar el arancel');
reset role;

-- Eliminar un estudio borra en cascada todos sus datos (y nada de otros estudios).
delete from public.organizations where id = 'aaaa0000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from public.clients where organization_id = 'aaaa0000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.matters where organization_id = 'aaaa0000-0000-0000-0000-00000000000a')
  + (select count(*)::int from public.matter_entries where matter_id = 'd0000000-0000-0000-0000-0000000000a1')
  + (select count(*)::int from public.documents where matter_id = 'd0000000-0000-0000-0000-0000000000a1')
  + (select count(*)::int from public.events where organization_id = 'aaaa0000-0000-0000-0000-00000000000a'),
  0, 'Eliminar un estudio borra todos sus datos');
select is((select count(*)::int from public.matters where organization_id = 'bbbb0000-0000-0000-0000-00000000000b'), 1,
  'Eliminar un estudio no afecta a otros estudios');

select * from finish();
rollback;

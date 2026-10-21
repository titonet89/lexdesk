-- =============================================================================
-- Ingreso con passkey (huella, rostro o PIN del dispositivo)
-- =============================================================================
-- Supabase emite las sesiones abiertas con passkey como `aal1` (método
-- "passkey" en `amr`). Una passkey ya combina dos factores (el dispositivo que
-- guarda la clave privada y el desbloqueo biométrico o PIN), así que la
-- tratamos como equivalente a contraseña + código.
--
-- Condición extra: la cuenta debe tener el 2FA (TOTP) verificado. Supabase
-- solo deja registrar passkeys desde una sesión AAL2 cuando hay 2FA, de modo
-- que toda passkey válida se creó después de pasar contraseña + código.
--
-- SECURITY DEFINER: necesita leer auth.mfa_factors, que `authenticated` no ve.
create or replace function private.has_mfa()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() ->> 'aal') = 'aal2'
    or (
      jsonb_typeof(auth.jwt() -> 'amr') = 'array'
      and exists (
        select 1
        from jsonb_array_elements(auth.jwt() -> 'amr') as method(entry)
        where method.entry ->> 'method' = 'passkey'
      )
      and exists (
        select 1
        from auth.mfa_factors factor
        where factor.user_id = (select auth.uid())
          and factor.status = 'verified'
      )
    ),
    false
  );
$$;

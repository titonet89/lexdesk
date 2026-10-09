# Estrategia de seguridad

El sistema guarda información amparada por el **secreto profesional** y, en muchos casos,
**datos sensibles** en los términos de la Ley 25.326 (salud, violencia, vida familiar).
La seguridad se diseña en capas: si una falla, las otras siguen protegiendo.

## 1. Autenticación

- **Sin registro público.** Los usuarios solo se crean por invitación de la titular.
- **Contraseña + segundo factor (TOTP) obligatorio** para todos los usuarios del panel.
  Sin 2FA verificado (nivel AAL2) no se accede a ningún dato: lo exige la base de datos.
- Contraseñas de 12 caracteres o más, con mayúsculas, minúsculas y números.
- Mensajes de error genéricos en el login (no revelan si un email existe).
- Límite de intentos por IP en el servicio de autenticación.
- Tokens de acceso de 15 minutos con rotación de refresh tokens.
- Sesión máxima de 12 horas, cierre por inactividad (1 h en servidor, 30 min en el navegador).
- Cookies de sesión `HttpOnly`, `Secure` y `SameSite=Lax`.

## 2. Autorización (en la base de datos)

- **Aislamiento entre estudios (multi-tenant):** toda fila pertenece a un estudio y las políticas
  RLS solo devuelven datos de los estudios donde la persona es miembro activo. Triggers impiden
  que un expediente o evento apunte a datos de otro estudio. Probado con pgTAP (estudio A vs. B).
- Las membresías solo las crea o modifica el servidor tras verificar a la titular del estudio.
- **Row Level Security** en todas las tablas: la regla de quién ve qué vive en Postgres.
  Aunque la aplicación tuviera un error, un colaborador no puede leer lo que no le compartieron.
- Funciones de autorización `SECURITY DEFINER` con `search_path` vacío, en un esquema
  privado no expuesto por la API.
- El rol de cada usuario solo puede cambiarlo el *service role* (servidor), nunca el usuario.
- El rol anónimo no tiene permisos sobre ninguna tabla del sistema.
- Los comentarios de colaboradores son inalterables (no se editan ni borran).

## 3. Documentos

- Bucket de Storage **privado**. Los archivos se descargan con **URLs firmadas de 60 segundos**.
- Tipos de archivo permitidos (PDF, imágenes, Word, Excel, texto) y límite de 25 MiB,
  validados en el servidor y en Storage.
- Cada descarga queda registrada en la auditoría.

## 4. Aplicación

- Toda entrada se valida en el servidor con Zod (además de en el navegador).
- Las claves secretas (`SUPABASE_SERVICE_ROLE_KEY`) existen solo en el servidor
  (`import "server-only"`), nunca en el navegador ni en el repositorio.
- Encabezados de seguridad: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`.
- El panel no se indexa en buscadores (`noindex` + `robots.txt`).

## 5. Auditoría y operación

- `audit_log`: quién creó, modificó o borró qué y cuándo (solo nombres de columnas,
  nunca los datos), y quién descargó cada documento.
- Backups diarios automáticos del proveedor; probar una restauración al menos una vez.
- **2FA activado en todas las cuentas de infraestructura**: Vercel, Supabase, GitHub,
  el email de la titular y el registrador del dominio.

## 6. Cumplimiento (a validar por la titular)

- Política de privacidad publicada y consentimiento en el formulario.
- Inscripción de la base de datos en el **Registro Nacional de Bases de Datos (AAIP)**.
- Definir plazos de conservación y eliminación de datos.
- Ubicación de los servidores: si están fuera de Argentina, evaluar las reglas de
  transferencia internacional de datos de la Ley 25.326.

## Checklist antes de producción

- [ ] Proyecto Supabase en la nube creado, con 2FA en la cuenta.
- [ ] Migraciones aplicadas (`npx supabase db push`).
- [ ] SMTP propio configurado para los emails de autenticación.
- [ ] Variables de entorno en Vercel (la service role key solo en el servidor).
- [ ] Estudio y titular creados con `npm run admin:crear-titular`.
- [ ] Pruebas E2E en verde contra el entorno de staging.

# Estrategia de seguridad

El sistema guarda información amparada por el **secreto profesional** y, en muchos casos,
**datos sensibles** en los términos de la Ley 25.326 (salud, violencia, vida familiar).
La seguridad se diseña en capas: si una falla, las otras siguen protegiendo.

## 1. Autenticación

- **Sin registro público.** Los usuarios solo se crean por invitación de la titular.
- **Contraseña + segundo factor (TOTP) obligatorio** para todos los usuarios del panel.
  Sin 2FA verificado (nivel AAL2) no se accede a ningún dato: lo exige la base de datos.
- **Ingreso con passkey** (huella, rostro o PIN del dispositivo) en los dispositivos de
  confianza, en lugar de contraseña + código. Equivale a dos factores: el dispositivo que
  guarda la clave privada y el desbloqueo biométrico, que la app exige siempre
  (`userVerification: "required"`). Es resistente al phishing: la passkey solo funciona en
  el dominio del sistema. NIST SP 800-63B-4 admite las passkeys sincronizadas para AAL2.
  - Supabase emite esas sesiones como AAL1 con el método `passkey`. La base las acepta
    (`private.has_mfa()`) solo si la cuenta tiene el TOTP verificado.
  - Registrar una passkey exige una sesión con contraseña + código: Supabase lo impone
    cuando la cuenta tiene 2FA. Cambiar la contraseña o agregar otra passkey también pide
    el código, aunque se haya ingresado con huella.
  - Ante la pérdida de un dispositivo: quitarlo en Ajustes → Seguridad y cerrar sesión en
    todos los dispositivos.
  - Las passkeys quedan atadas al dominio. Al pasar a un dominio propio hay que volver a
    activarlas.
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

- [x] Proyecto Supabase en la nube (São Paulo) con 2FA en la cuenta.
- [x] Migraciones aplicadas y registradas en el historial del proyecto.
- [x] Configuración de seguridad aplicada (`supabase config push`): sin registro público,
      contraseñas de 12+ caracteres, tokens de 15 min, cambio de contraseña con sesión reciente.
- [x] Verificado como atacante anónimo: registro bloqueado y lectura denegada en todas las tablas.
- [x] Variables de entorno en Vercel (la clave secreta, marcada como sensible).
- [ ] SMTP propio (Resend) para invitaciones, recuperación de contraseña y plantillas en español.
- [ ] Estudio y titular creados con `npm run admin:crear-titular:nube`.
- [ ] Dominio propio y plan comercial.

### Limitaciones del plan gratuito de Supabase

- Los límites de sesión del servidor (duración máxima e inactividad) requieren el plan Pro.
  Mitigación: el panel cierra la sesión tras 30 minutos de inactividad desde el navegador.
- Las plantillas de email solo se pueden modificar con un SMTP propio.
- El proyecto se pausa tras 7 días sin actividad.

### Aplicar la configuración al proyecto en la nube

```bash
npx supabase config diff          # revisar diferencias
npx supabase config push          # confirmar cada cambio
```
En el plan gratuito, quitar temporalmente las secciones `[auth.sessions]` y de plantillas
antes de `config push` (Supabase las rechaza sin plan Pro o SMTP propio).

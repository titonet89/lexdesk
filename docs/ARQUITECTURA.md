# Arquitectura — LexDesk

Plataforma para estudios jurídicos independientes de Argentina: sitio público de captación
de consultas y panel privado de gestión del estudio.

## Fases

| Fase | Alcance | Estado |
|---|---|---|
| 1 | Sitio público: especialidades, sedes, formulario → WhatsApp, SEO, privacidad | Hecho |
| 2 | Base del sistema: base de datos, seguridad (RLS), login con 2FA, panel | Hecho (local) |
| 3 | Módulos: clientes, expedientes, actuaciones, agenda/plazos, documentos | Hecho (local) |
| 4 | Colaboración: compartir expedientes con colegas (lectura / comentarios) | Hecho (local) |
| 5 | Multi-estudio (SaaS): datos aislados por organización y membresías | Hecho (local) |
| 6 | Recordatorios por email, honorarios y pagos, consultas web al panel | Pendiente |
| 7 | Portal de clientes (opcional) | Pendiente |

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions), TypeScript estricto.
- **Supabase**: Postgres + Auth (email/contraseña + TOTP) + Storage privado.
- **Tailwind CSS v4**, Radix UI, Framer Motion, React Hook Form + Zod.
- **Playwright** para pruebas de punta a punta.

## Estructura de rutas

| Ruta | Acceso |
|---|---|
| `/`, `/privacidad` | Público |
| `/acceso` | Inicio de sesión |
| `/acceso/verificar` | Segundo paso (código TOTP) |
| `/acceso/recuperar`, `/auth/confirm` | Recuperación de contraseña |
| `/panel/**` | Solo usuarios con sesión AAL2 (contraseña + 2FA) |
| `/panel/seguridad/activar-2fa` | Alta obligatoria del 2FA en el primer ingreso |

## Modelo de datos

```
organizations ──< memberships >── profiles      (rol POR estudio: titular | colaborador)
      │
      ├──< clients, matters, events, non_working_days, audit_log   (organization_id)
      │
profiles ──< matter_shares >── matters ──< matter_entries
                                  │  └───< matter_comments
clients ──────────────────────────┤  └───< documents  (archivo en Storage: expedientes/{matter_id}/...)
                                  └──────< events      (agenda, vencimientos)
non_working_days  (feriados / ferias judiciales para el cómputo de plazos)
audit_log         (registro de cambios y accesos)
```

- **Multi-estudio**: cada estudio (organización) tiene sus datos aislados por RLS. El rol no es del
  usuario sino de su **membresía** en cada estudio: un colega puede colaborar con varios estudios y
  cambiar entre ellos desde el panel; desactivarlo en uno no lo afecta en los demás.
- **Titular**: acceso total a los datos de su estudio.
- **Colaborador**: solo ve los expedientes que la titular le comparte, por un plazo opcional,
  en modo *lectura* o *comentario*, con o sin documentos. No ve datos de clientes ni la agenda.
- Un expediente marcado como **sensible** (p. ej. violencia de género) no puede compartirse;
  marcarlo revoca automáticamente los accesos existentes.

## Desarrollo local

```bash
npx supabase start          # levanta Postgres, Auth, Storage y Mailpit en Docker
npm run db:types            # regenera lib/supabase/database.types.ts
npm run dev                 # http://localhost:3000
npm run test:db             # pruebas de seguridad de la base (pgTAP / RLS)
npx playwright test         # pruebas E2E y unitarias
npm run admin:crear-titular -- --email ... --nombre "..."   # alta única de la titular
```

Mailpit (emails de prueba): http://127.0.0.1:54324 · Studio: http://127.0.0.1:54323

Ver también [SEGURIDAD.md](./SEGURIDAD.md).

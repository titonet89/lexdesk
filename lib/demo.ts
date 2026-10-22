/**
 * Modo demostración: un despliegue aparte de LexDesk, con su propia base de
 * datos y datos ficticios, al que se entra con un botón (sin contraseña ni
 * código). Se activa con NEXT_PUBLIC_LEXDESK_DEMO=1 en ESE despliegue; el
 * sistema real nunca lo define.
 */
export const isDemo = process.env.NEXT_PUBLIC_LEXDESK_DEMO === "1";

# Sube las migraciones de la base de datos al proyecto de Supabase vinculado.
#
# Uso (desde la carpeta web):
#   powershell -ExecutionPolicy Bypass -File .\scripts\subir-base.ps1
#
# Pide la contraseña de la base de forma OCULTA (no se muestra ni queda en el
# historial), hace un ensayo (--dry-run) y, si el ensayo sale bien, pide
# confirmación antes de aplicar los cambios.

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Subir la base de datos a Supabase" -ForegroundColor Yellow
Write-Host "Pegá la contraseña de la base y apretá Enter (no se va a ver mientras la escribís)."
$secure = Read-Host "Contraseña" -AsSecureString
$env:SUPABASE_DB_PASSWORD = [System.Net.NetworkCredential]::new("", $secure).Password

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_DB_PASSWORD)) {
  Write-Host "No ingresaste ninguna contraseña. Volvé a correr el script." -ForegroundColor Red
  exit 1
}

try {
  Write-Host ""
  Write-Host "1/2 Ensayo (no cambia nada)..." -ForegroundColor Yellow
  npx supabase db push --dry-run
  if ($LASTEXITCODE -ne 0) {
    Write-Host "El ensayo falló. Si dice 'password authentication failed', la contraseña no es correcta." -ForegroundColor Red
    exit 1
  }

  Write-Host ""
  Write-Host "2/2 Subida real" -ForegroundColor Yellow
  npx supabase db push
  if ($LASTEXITCODE -ne 0) { exit 1 }

  Write-Host ""
  Write-Host "Listo: la base de datos quedó actualizada." -ForegroundColor Green
}
finally {
  # La contraseña no queda en la sesión al terminar.
  Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
}

# Release Hardening Checklist (sin Blaze por ahora)

## 1) Firma Android (local)

1. Tener un keystore de release (`.jks` o `.keystore`) fuera del repo.
2. Exportar variables en tu shell:

```bash
export MYAPP_RELEASE_STORE_FILE=/ruta/absoluta/release.jks
export MYAPP_RELEASE_STORE_PASSWORD=...
export MYAPP_RELEASE_KEY_ALIAS=...
export MYAPP_RELEASE_KEY_PASSWORD=...
```

3. Validar configuración:

```bash
yarn android:release:check-signing
```

4. Compilar release:

```bash
yarn android:release:apk
yarn android:release:aab
```

## 2) Firma Android (GitHub Actions)

Crear estos secrets en el repo:

- `ANDROID_KEYSTORE_BASE64` (contenido del `.jks` en base64)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Workflow disponible:

- `.github/workflows/android-release.yml` (manual, `workflow_dispatch`)
- Genera `APK` + `AAB` release y los sube como artifacts.

## 3) Smoke tests (sin Functions)

> Nota: mientras el proyecto siga en Spark, no habrá Functions desplegadas.

### Turnos y notificaciones locales

1. Cargar turnos en Firestore con timestamps correctos.
2. Abrir la app (esto dispara reprogramación de turnos).
3. Verificar:
   - turno vigente es de `08:30` a `08:30` (+24h).
   - notificaciones `08:35`, `12:00`, `20:00` reflejan la farmacia del turno activo.
4. En Settings:
   - desactivar notificaciones => no deben programarse nuevas.
   - activar notificaciones => deben reprogramarse.

### Cuenta/Admin (sin Functions)

1. Confirmar que el resto de pantallas admin cargan.
2. Confirmar que acciones de `Admin Account Requests` muestran manejo de error controlado (esperable sin Functions).

### OTA

1. Verificar flag remoto `config/app.otaGitEnabled`.
2. Si está en `false`, no debe aplicar OTA.
3. Si está en `true`, debe mantener comportamiento actual.

## 4) Pendiente explícito

- Activar Blaze y desplegar `functions` para habilitar:
  - `adminReactivateAccount`
  - `adminDeleteUserData`
  - `scheduleAccountDeletion`
  - filtrado backend de push por canales/token.

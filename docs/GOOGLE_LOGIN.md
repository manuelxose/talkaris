# Acceso con Google

Talkaris usa Google Identity Services y el mismo cliente OAuth web (`GOOGLE_CLIENT_ID`)
que Tecnoria y Auctorio. Solo el API necesita esta variable: el portal obtiene el
identificador público desde `GET /v1/auth/google/config`. No se necesita client secret.

En Google Cloud, añadir `https://talkaris.com` a los **orígenes JavaScript autorizados**
del cliente existente. Para desarrollo, añadir el origen local del portal. El flujo
usa un popup y no necesita una nueva URI de redirección. Incluir también el origen
del portal en `CORS_ORIGIN` del API.

El botón aparece en `/login` cuando el API tiene un cliente configurado. El API
verifica firma, audiencia, emisor y caducidad con `google-auth-library`. El correo
debe estar verificado y alojado en Gmail o Google Workspace para asociarse de forma
segura a un usuario **activo** de Talkaris. No crea usuarios, tenants ni permisos:
reutiliza la sesión, los roles y las membresías existentes. Las cuentas de Google
con un correo externo a Gmail/Workspace deben seguir accediendo con contraseña.

Comprobación del flujo y sus rechazos:

```sh
npx tsx --test apps/chat-api/src/google-auth.test.ts
```

La prueba usa un verificador de Google y una base de datos simulados; el acceso
real requiere completar el popup de Google con una cuenta autorizada.

## Consolidated PR verification

Google Login is included as a separate commit in the same PR as M0. Local credential/HTTP tests pass with the M0 TCP guard enabled, using dedicated loopback port 45127. The M0 suite also runs `scripts/m0/login-browser.mjs`: configured, disabled and unavailable SDK fixtures at 390/768/1440, keyboard submission, announced errors and scoped axe checks. SDK responses are synthetic; this does not certify a real Google popup or account configuration. No schema migration. Rollback: revert the Google Login commit; password login remains the existing path.

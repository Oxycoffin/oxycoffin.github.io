# Tindrop Pulse

Panel privado y ligero para resumir App Store Connect, Google Play y AdMob en
`stats.lagartijalabs.com`. El repositorio contiene únicamente código y nombres
de configuración. Las credenciales viven como secretos cifrados de Cloudflare
Workers y nunca se entregan al navegador.

## Arquitectura

- Cloudflare Access protege todo el hostname y permite exclusivamente el correo
  del propietario. La sesión puede configurarse con una duración de un mes.
- El Worker vuelve a verificar el JWT de Access, incluida audiencia, emisor y
  correo permitido. `workers.dev` y las URLs de preview están desactivadas para
  evitar rutas alternativas sin Access.
- KV conserva una instantánea agregada. El navegador solo lee `/api/dashboard`.
- Un cron cada 30 minutos actualiza como máximo una fuente: AdMob cada 30
  minutos, Play cada dos horas y Apple diariamente. El backfill de Apple avanza
  un día por ejecución para respetar el límite gratuito de CPU.
- La actualización manual tiene un enfriamiento de cinco minutos y ejecuta la
  fuente más atrasada.

## Configuración remota pendiente

No se debe desplegar hasta sustituir `REPLACE_WITH_KV_NAMESPACE_ID` y crear:

1. Un namespace KV enlazado como `PULSE_CACHE`.
2. El Worker `tindrop-pulse` con dominio `stats.lagartijalabs.com`.
3. Una aplicación Cloudflare Access self-hosted para ese hostname, con política
   Allow limitada a un único correo y sesión de un mes.
4. Los secretos requeridos declarados en `wrangler.jsonc`.

En producción, `DEV_AUTH_BYPASS` debe guardarse con el valor exacto `false`.

El correo y los identificadores de Access también se mantienen como secretos
para no publicar la identidad autorizada. `APPLE_APP_ID`, el package name y la
moneda no son secretos y sí están versionados.

### Credenciales mínimas

- Apple: API key con rol **Sales and Reports**, vendor number, issuer ID, key ID
  y contenido de la clave `.p8`.
- Google Play: JSON de una cuenta de servicio con acceso de lectura a Tindrop y
  permisos para Developer Reporting y Reviews.
- AdMob: OAuth client ID, client secret y refresh token con alcance de informes.

El resumen de Apple conserva los proceeds separados por moneda y solo incorpora
al total los que Apple ya expresa en EUR. No aplica tipos de cambio inventados;
el panel avisa cuando existen importes en otras monedas.

## Desarrollo local

```sh
cd stats/worker
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

El script local sobreescribe `ENVIRONMENT` con `local`; la configuración
versionada fuerza `ENVIRONMENT=production`, por lo que `DEV_AUTH_BYPASS=true`
no permite omitir Access en el despliegue público.

## Validación

```sh
cd stats/worker
npm run check
npx wrangler deploy --dry-run
```

## English summary

Tindrop Pulse is a private, lightweight dashboard for App Store Connect, Google
Play, and AdMob. Cloudflare Access protects the entire hostname, the Worker
validates the Access JWT again, encrypted Worker secrets remain server-side,
and KV serves a precomputed snapshot for instant browser loads.

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
  minutos, Play cada dos horas y Apple diariamente. Mientras falta histórico,
  Apple consulta hasta 3 días por actualización y se considera elegible en
  cada ciclo del cron hasta reunir 60 días.
- La actualización manual tiene un enfriamiento de cinco minutos y ejecuta la
  fuente más atrasada.

## Datos mostrados

El panel ofrece periodos de 7 y 30 días completos (hasta ayer), gráficos
seleccionables de ingresos, impresiones, descargas iOS y crashes, cifras
visibles y detalle del día por teclado o toque. Incluye tabla diaria y CSV.
Hoy se muestra aparte, como dato provisional de AdMob. Resume por
separado:

- App Store: proceeds, descargas iniciales, unidades devueltas, países y reseñas.
- AdMob: ingresos, impresiones, clics, solicitudes, match rate, show rate, CTR,
  RPM y desgloses por unidad publicitaria y país.
- Google Play: crash rate, ANR, picos del periodo y reseñas recientes.

La comparativa solo se calcula con dos periodos completos de la misma fuente.
Los ingresos registrados suman los importes disponibles, no incluyen compras
ni suscripciones de Google Play y se identifican como parciales si faltan días.
Los desgloses AdMob tienen su propia ventana de 30 días, visible en el panel;
los países de Apple sí siguen el periodo elegido. Las reseñas son muestras
recientes, no la puntuación global de la tienda.

Las APIs no exponen exactamente todos los informes disponibles en las consolas;
cuando una métrica no está disponible se muestra `—` en lugar de inventar un
cero. Un informe Apple con 404 queda como no disponible, no como ventas cero.
Los desgloses y las reseñas son opcionales: un permiso insuficiente no
impide actualizar el resto de la fuente.

## Producción

El Worker `tindrop-pulse`, el namespace `PULSE_CACHE`, el dominio
`stats.lagartijalabs.com` y la aplicación de Cloudflare Access ya están creados.
Access limita el hostname al correo del propietario con una sesión prolongada.

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

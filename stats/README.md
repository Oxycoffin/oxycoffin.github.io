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
- KV guarda cada fuente bajo su propia clave (`tindrop-pulse:source:v2:*`),
  así dos actualizaciones simultáneas nunca se pisan. La clave combinada v1 solo
  se lee como respaldo hasta que cada fuente se reescribe.
- Un cron cada 10 minutos actualiza todas las fuentes vencidas en paralelo:
  AdMob cada 10 minutos, vitals y reseñas de Play cada hora, informes masivos
  de Play cada 3 horas y Apple a diario. Mientras falta el informe de ayer o el
  histórico de 60 días, Apple se consulta cada 30 minutos. Una fuente con error
  o sin configurar se vuelve a comprobar como máximo cada 30 minutos.
- Las consultas son incrementales: AdMob relee solo la última semana (la
  historia completa cada 6 horas y los desgloses cada hora), los vitals de Play
  solo se consultan cuando Google mueve su ventana de frescura y los informes
  masivos se piden con `ifGenerationNotMatch`, de modo que un mes sin cambios
  cuesta un 304.
- `/api/dashboard` devuelve un `ETag` débil; el navegador sondea cada minuto
  mientras la pestaña está visible y una respuesta sin cambios es un 304 sin
  volver a dibujar. Los tiempos relativos se actualizan solos.
- La actualización manual consulta todas las fuentes que no se hayan intentado
  en los últimos cinco minutos.

## Datos mostrados

El panel ofrece periodos de 7 y 30 días completos (hasta ayer). El gráfico
apila por fuente los ingresos (App Store, AdMob, Google Play) y las descargas
(iOS, Android), y también muestra impresiones, usuarios activos Android y
crashes, con la media diaria marcada. Incluye tabla diaria y CSV. Hoy se
muestra aparte, en directo, como dato provisional de AdMob con su ritmo frente
a la media de los últimos siete días. Resume por separado:

- App Store: proceeds, descargas iniciales, unidades devueltas, países, reseñas
  y valoración pública de la tienda (API de búsqueda de iTunes, storefronts de
  `APPLE_RATING_COUNTRIES`).
- AdMob: ingresos, impresiones, clics, solicitudes, match rate, show rate, CTR,
  RPM y desgloses por unidad publicitaria, plataforma y país.
- Google Play (vitals y reseñas): crash rate y ANR percibidos frente a los
  umbrales de Google, picos del periodo, usuarios activos diarios medidos por
  Android vitals (`distinctUsers`) y reseñas recientes. Google no publica vitals
  hasta reunir suficientes usuarios; mientras Play Console muestre "Data
  unavailable", la API devuelve cero filas y el panel lo indica.
- Google Play (informes masivos, opcional): instalaciones y desinstalaciones
  diarias, dispositivos activos, instalaciones por país, valoración media global
  y ventas (pedidos, reembolsos y neto). Los meses cerrados usan el informe
  mensual de ganancias (`earnings/`), que ya descuenta comisión, impuestos y
  reembolsos en EUR.

Mientras Google no publica las ganancias de un mes (suele hacerlo hacia el día
5 del siguiente), sus ventas netas se estiman a partir del informe de ventas
estimadas:
precio sin impuestos menos la comisión `GOOGLE_PLAY_FEE_RATE` (15 % por
defecto) y solo para importes en EUR; el resto se muestra aparte por moneda,
sin convertir.

Google publica los informes masivos con 2–7 días de retraso. Mientras Play no
cubre dos periodos completos, la comparativa de ingresos usa solo Apple +
AdMob y la de descargas solo iOS, y el panel indica ese alcance junto al
porcentaje. La comparativa solo se calcula con dos periodos completos de cada
fuente incluida. Los desgloses AdMob tienen su propia ventana de 30 días,
visible en el panel; los países de Apple y Play sí siguen el periodo elegido.
Las reseñas son muestras recientes.

Las APIs no exponen exactamente todos los informes disponibles en las consolas;
cuando una métrica no está disponible se muestra `—` en lugar de inventar un
cero. Un informe Apple con 404 queda como no disponible, no como ventas cero.
Los desgloses, las reseñas y la valoración son opcionales: un permiso
insuficiente no impide actualizar el resto de la fuente.

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
- Google Play, informes masivos (opcional): secreto
  `GOOGLE_PLAY_REPORTS_BUCKET` con el bucket que muestra Play Console en
  *Descargar informes → Copiar URI de Cloud Storage* (`pubsite_prod_rev_…`).
  La misma cuenta de servicio necesita en Play Console los permisos globales
  *Ver información de la aplicación y descargar informes masivos* y, para
  ventas, *Ver datos financieros*. Sin el secreto, la fuente queda "Sin
  configurar" y el resto del panel funciona igual.
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
Play (vitals, reviews and optional bulk reports for installs, rating and
estimated sales), and AdMob. Cloudflare Access protects the entire hostname,
the Worker validates the Access JWT again, and encrypted Worker secrets remain
server-side. Each source is cached under its own KV key and refreshed by a
10-minute cron at its own cadence with incremental or conditional requests;
the browser polls the dashboard every minute with an ETag so unchanged
snapshots cost a 304. Daily KV usage stays around 450 writes, inside the free
tier.

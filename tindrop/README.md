# Tindrop — Páginas Legales

<p align="center">
  <img src="tindrop.png" alt="Logo de Tindrop" width="72" height="72" />
</p>

Repositorio de páginas estáticas para la app Tindrop ("Swipe to Clean your Gallery").
Incluye la Política de Privacidad y los Términos de Uso con un encabezado de marca (logo + nombre).

## Contenidos

- `privacy.html`: Política de Privacidad
- `terms.html`: Términos de Uso
- `tindrop.png`: Logo utilizado en el encabezado de ambas páginas

## Remote config (Tindrop)

Se publica en `tindrop/config.json` y se firma en `tindrop/config.json.sig`.

Desde Tindrop 1.30.0, el payload puede conservar snapshots completos dentro de
`app_versions`. La app selecciona primero `x.y.z+build`, después `x.y.z` y, si
no existe ninguno, usa el bloque raíz compatible con las versiones antiguas.
Antes de cambiar valores para una versión nueva, guarda el perfil actual:

```bash
python3 tindrop/scripts/snapshot_remote_config_version.py 1.30.0+286
```

El script no reemplaza un perfil existente salvo que se indique `--replace`,
para evitar perder accidentalmente la configuración histórica.

Flujo recomendado:

1. Parte de `tindrop/config.local.json`, fuente versionada; conserva raíz y perfiles publicados.
2. Edita solo los valores o el nuevo perfil autorizado.
3. Ejecuta el script de firmado:

```bash
python3 tindrop/scripts/sign_remote_config.py --stamp
```

Si lo prefieres, ejecuta el modo interactivo (menú). Por defecto solo añade
`issued_at`; el `expires_at` es opcional:

```bash
python3 tindrop/scripts/sign_remote_config.py --interactive
```

Esto genera:
- `tindrop/config.json`
- `tindrop/config.json.sig`

El firmado también persiste el nuevo `version` e `issued_at` en
`config.local.json`, por lo que cada ejecución posterior avanza de forma
monotónica y no puede reutilizar accidentalmente la misma versión.

### Flujo de publicación para una nueva versión de la app

La configuración de una nueva versión se publica **antes de distribuir el
build**. No hay que esperar a que la versión esté disponible en la tienda:

1. Conserva en el bloque raíz una configuración segura para las versiones
   antiguas.
2. Añade a `app_versions` el perfil exacto `x.y.z+build` del nuevo build.
3. Mantén `app_update` apuntando a la última versión que ya esté disponible en
   las tiendas, con `mode: none`.
4. Firma, haz commit y publica `config.json` junto con `config.json.sig`.
5. Verifica en la URL pública, usando un parámetro anticaché, que `version` ha
   avanzado y que aparece la clave exacta dentro de `app_versions`.

La app nueva reconocerá automáticamente su perfil. Los clientes sin selección de perfil siguen leyendo el bloque raíz. Publicar el
perfil y activar una actualización son operaciones distintas: `mode: soft` o
`mode: hard` solo se activa después de comprobar que la nueva versión ya está
disponible en la tienda.

Solo para una rotación de clave autorizada, actualiza la clave pública con:

```bash
python3 tindrop/scripts/sign_remote_config.py --update-public-key
```

## Protecciones locales de integración

Este clon dispone de hooks `pre-push` y `reference-transaction` que bloquean
actualizaciones directas de `main` y pushes directos a `origin/main`. El registro
compartido vive en `<git-common-dir>/agent-coordination/`; las tareas reservan
su ámbito bajo `registry.lock/` creado atómicamente y trabajan en ramas y
worktrees exclusivos.

La cola FIFO usa `integration/runner.py`: `status`, `enqueue <ref> --owner
<tarea>`, `validate-next --checks <JSON de arrays argv fiables>` y, con la
publicación autorizada, `publish <id>`. Mantiene exclusión durante validación y
publicación, verifica el SHA remoto y no cambia el checkout de `main`. Incluye
entre las comprobaciones la firma, la raíz y todos los perfiles previos. La
lectura pública posterior sigue siendo obligatoria. Son guardas de este clon;
no prueban protección del servidor ni configuración de otras máquinas.

## UI local para publicar remote config

Si quieres editar valores y publicarlos con commit/push desde una UI web local:

```bash
python3 tindrop/scripts/remote_config_webapp.py
```

Luego abre `http://127.0.0.1:8787`.

La UI hace este flujo:
- Editar `tindrop/config.local.json`.
- Firmar `tindrop/config.json` y `tindrop/config.json.sig`.
- `git add` + `git commit`.
- El push directo queda bloqueado en el clon protegido: entrega el commit a la cola de integración descrita arriba.

## Previsualización local

Opción 1: abrir directamente el archivo en el navegador (doble clic sobre `privacy.html` o `terms.html`).

Opción 2: servir con un servidor local (recomendado para rutas relativas):

```bash
# Python 3
python -m http.server 8080
# Visita: http://localhost:8080/privacy.html y http://localhost:8080/terms.html
```

En PowerShell (Windows), también puedes usar:

```powershell
python -m http.server 8080
Start-Process http://localhost:8080/privacy.html
Start-Process http://localhost:8080/terms.html
```

## Despliegue (GitHub Pages)

1. Haz push de los cambios a tu rama principal (por ejemplo, `main`).
2. En GitHub, ve a Settings → Pages → Build and deployment → Source: `Deploy from a branch`.
3. Selecciona la rama (p. ej. `main`) y la carpeta `/root`.
4. Guarda. Tus páginas quedarán accesibles en la URL de GitHub Pages del repositorio.

## Personalización rápida

- Marca (logo + nombre): definida en cada archivo con el bloque `.brand` al inicio del contenido.
- Fecha de "Última actualización": edítala en el chip dentro del `<header>`.
- Contacto: reemplaza `support@example.com` por tu correo real.
- Web: cambia `https://example.com` por tu sitio.
- Tipografía: actualmente usa fuentes de sistema (Inter/Segoe UI/Roboto…). Si quieres una fuente concreta (Google Fonts), podemos añadir el `<link>` correspondiente.

## Estructura y estilo

Ambas páginas comparten una estética: degradado de fondo, tarjeta central con bordes redondeados, y un encabezado con subtítulo.
El CSS está embebido en cada archivo para facilitar su uso como documentos independientes.

## Sugerencias

- Si vas a alojarlas en un dominio propio, añade las metaetiquetas pertinentes (Open Graph, favicons, etc.).
- Para mayor consistencia, mantén el nombre del archivo de imagen como `tindrop.png` (minúsculas).

---

Hecho con cariño para Tindrop.

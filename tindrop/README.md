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

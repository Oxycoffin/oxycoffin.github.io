# Instrucciones exactas para subir POTAMORSE a LagartijaLabs

Este archivo está dirigido al modelo o agente que vaya a operar el repositorio.

## Objetivo

Publicar el juego como subpágina independiente, conservando el código recibido sin rediseñarlo ni “mejorarlo”.

## Operación

1. Copiar **esta carpeta completa** al repositorio de la web con el nombre:

   ```text
   potamorse/
   ```

2. Comprobar que la ruta queda:

   ```text
   <raíz-del-repo>/potamorse/index.html
   ```

3. No ejecutar build, npm, Flutter, bundler, minificador ni conversión a módulos. El archivo es autosuficiente.
4. No separar CSS o JavaScript: las rutas inline son intencionales y hacen que funcione bajo cualquier subdominio/subcarpeta de GitHub Pages.
5. No sustituir SVG/CSS por imágenes externas.
6. No añadir WebGL, `DecompressionStream` ni dependencias remotas.
7. Conservar la codificación UTF-8.
8. Hacer commit y push a la rama que actualmente publica GitHub Pages.
9. Esperar al workflow normal de Pages y comprobar:

   ```text
   https://<dominio-publicado>/potamorse/
   ```

10. En móvil, verificar que el tablero, los dos grupos de refugios y los cinco controles inferiores aparecen sin scroll de página.

## Integración opcional en la portada

Solo si se solicita, añadir un enlace o tarjeta en la portada existente que apunte a `./potamorse/`. No tocar el resto de la página ni convertir POTAMORSE en el index principal.

## Prueba mínima tras publicar

- Abrir reglas.
- Cerrar reglas.
- Tocar una pieza ámbar marcada como activa.
- Tocar uno de sus destinos iluminados.
- Confirmar que la IA responde o que cambia el pulso.
- Recargar y comprobar que no aparece ningún error de recurso 404.

## Fuente canónica

`index.html` es la implementación canónica. Los `.py`, `.json` y `.md` documentan y auditan el diseño, pero no son necesarios para ejecutar la subpágina. Se recomienda subirlos igualmente para que la investigación sea verificable.
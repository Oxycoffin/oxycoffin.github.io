# BRUMA 2.1 / Revisión técnica y jugable

## Español
Se sustituye el motor anterior, sin modificar el resto de la web. Un único mundo de 1280 × 720 gobierna imagen, puntero, zonas, luces y movimiento. Se mantiene la proporción de las texturas, se compone correctamente el alfa y se invierten tanto el personaje como sus normales al andar hacia la izquierda. La marcha usa una deformación procedural continua de una pose lateral; no se presenta como un ciclo de ocho dibujos nuevos.

Los personajes originales siguen teniendo diferencias de acabado. Esta revisión no equivale a rehacer toda la dirección artística. Los mapas de normales de los fondos proceden de relieves aproximados, no de geometría 3D reconstruida. Las placas de los puzles sí se generan con un mapa de alturas explícito. La atmósfera superpuesta se distingue de la iluminación de materiales en el shader.

Se conectan las cuatro habitaciones, se implementa el inventario y se reemplaza el antiguo código fijo de espejos por trayectorias reflejadas. Los controles de luz rasante revelan las marcas de metal y papel. Incluye conversaciones extendidas, pistas escalonadas, guardado local y tres desenlaces reversibles.

## English
This replaces the old engine without touching the rest of the website. One 1280 × 720 world governs imagery, pointer input, hotspots, lights and movement. Textures retain their aspect ratio, alpha is blended correctly, and both sprite and normals mirror when walking left. Walking uses a continuous procedural deformation of one side pose, not eight newly drawn animation frames.

The original characters still differ in finish. This is not a complete art-direction rebuild. Background normals come from approximate relief rather than reconstructed 3D geometry. Puzzle plates do have explicit generated height maps. Overlay atmosphere is separate from shader material lighting.

All four rooms are connected, inventory has actual item-target actions, and ray-traced mirrors replace the previous fixed angle code. Includes extended dialogue, staged hints, local saves and three reversible endings.

## Test
`python bruma/qa/browser_check.py` from the repository root, with Playwright Chromium and WebKit installed. The suite clicks through the game, checks invalid answers and blocked exits, saves/reloads, resizes four viewports, checks shader errors, and produces screenshots for visual inspection. Test success alone does not establish aesthetic quality.

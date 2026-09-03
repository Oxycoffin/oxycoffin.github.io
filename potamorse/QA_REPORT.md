# Informe de QA

Fecha de comprobación: 2026-09-03.

## Entorno comprobado

- Chromium headless disponible en el entorno de construcción.
- Viewports: `390×844` y `1440×900`, ambos con temporada completa automatizada.
- JavaScript validado también con `node --check`.
- Scripts Python ejecutados con Python 3 y únicamente biblioteca estándar.

No se pudo afirmar compatibilidad empírica con Safari/Firefox porque no se ejecutaron esos motores en este entorno. El código evita deliberadamente APIs que causaron problemas en otros subsitios de LagartijaLabs: no usa WebGL, módulos ES remotos, WASM, compresión en cliente ni `DecompressionStream`.

## Pruebas realizadas

### Auditoría JavaScript

- Extracción del `<script>` y validación sintáctica con Node.
- Ejecución de `window.POTAMORSE.selfTests()`.
- Comprobaciones internas superadas:
  - prefijo Thue–Morse correcto;
  - cuatro pulsos de cada geometría por lado;
  - igualdad de momentos temporales de grado 0–3;
  - puntuación inicial cero;
  - al menos una jugada legal al inicio;
  - simetría rotacional de la posición inicial.

### Interacción

- Seleccionar una pieza.
- Mostrar destinos legales.
- Ejecutar movimiento.
- Ejecutar respuesta de IA.
- Abrir y cerrar reglas, origen y ajustes.
- Deshacer.
- Sondear una jugada.
- Cambio entre IA y modo local.

### Temporada completa

Se automatizaron 32 pulsos en modo local:

- cierre correcto del movimiento I;
- modal de intermedio;
- reinicio de tablero;
- intercambio de identidades/orillas;
- cierre del movimiento II;
- suma final y modal de resultado;
- opción de nueva temporada;
- cero errores de consola o excepciones de página durante la ejecución.
- regresión de turnos consecutivos: la entrada permanece bloqueada hasta completar el post-movimiento, evitando que dos clics extremadamente rápidos solapen corutinas al cerrar un movimiento.

### Layout móvil

Viewport `390×844`:

- `html`, `body` y `.app`: 844 px de alto;
- sin scroll de página;
- tablero: aproximadamente `368×368`;
- controles inferiores dentro del viewport;
- refugios y cinta visibles simultáneamente.

### Layout escritorio

Viewport `1440×900`:

- sin scroll de página;
- tablero: aproximadamente `495×495`;
- paneles laterales visibles;
- dock dentro del viewport.

### Movimiento reducido

- Regla CSS `prefers-reduced-motion` presente.
- Ajuste manual disponible.
- La temporada completa se verificó con movimiento reducido para evitar carreras de animación en la automatización.

### Persistencia

- Ajustes, estadísticas e indicador de onboarding usan `localStorage`.
- Todas las lecturas/escrituras están encerradas en `try/catch`; el juego continúa en modo privado o cuando el almacenamiento está bloqueado.

## Auditoría estática reproducible

```bash
python3 qa/check_static.py
node --check qa/extracted-script.js   # el auditor puede generar este archivo con --extract-js
python3 qa/browser_smoke.py --chromium /usr/bin/chromium
```

`browser_smoke.py` es opcional y requiere Playwright; juega una temporada local completa mediante clics reales y verifica final, cambio de orilla, ausencia de scroll y errores de consola.

## Límites conocidos

- La IA de nivel Abisal tiene un presupuesto temporal, no una profundidad garantizada en todos los dispositivos.
- En hardware lento puede caer en la evaluación heurística cuando vence el plazo; no bloquea la interfaz indefinidamente.
- El sonido requiere una interacción previa por la política de autoplay del navegador.
- Las estadísticas son locales al navegador y no se sincronizan.
- El juego está localizado en español; no se incluyó selector de idioma.
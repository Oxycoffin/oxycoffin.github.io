# TIDEFOLD / FIELD SYSTEM 021

**ES.** Juego abstracto original para dos bandos, publicado como aplicación estática y bilingüe. En cada turno se siembra una célula en una de 21 cámaras y se pliega una sutura: dos de las tres corrientes concéntricas giran en sentidos opuestos. Una columna radial de tres organismos iguales florece, puntúa y se disuelve. Gana quien provoca tres floraciones; las floraciones de ambos colores se resuelven simultáneamente.

**EN.** An original abstract game for two sides, shipped as a bilingual static application. Each turn seeds one cell among 21 chambers, then folds a seam so two of three concentric currents counter-rotate. A radial column of three matching organisms blooms, scores and dissolves. First to three blooms wins; both colors resolve simultaneously.

## Diseño / Design

- Cada pliegue identifica los anillos por número y muestra sus dos sentidos reales. El primer toque abre una vista previa animada con destinos fantasma; el segundo confirma el movimiento.
- La vista previa indica explícitamente si la célula recién sembrada cambia de cámara o permanece fija. Los pronósticos de floración son opcionales y su estado se guarda localmente.
- Genealogía reconocida: “colocar + transformar” toma precedente de *Pentago*; puntuar y retirar una formación toma precedente de *YINSH*. La contrarrotación concéntrica, las floraciones radiales simultáneas y la combinación completa son propias de TIDEFOLD.
- Dirección visual: geometría marina de Ernst Haeckel, persistencia de fósforo de sonar y océano científico en falso color. Todos los gráficos son SVG/CSS originales.
- IA local MCTS/UCT en Web Worker, sin cuentas, anuncios, telemetría remota ni API.
- Sin rachas, energía, recompensas variables ni bucles de presión. La rejugabilidad procede del espacio de decisión y de partidas breves.

Las fuentes completas y enlazadas se encuentran en **Cuaderno de campo / Field notes** dentro del juego.

## Pruebas / Tests

```bash
node tests/run.js
node --check interaction.js
```

El test desempaqueta el mismo payload publicado, valida la presencia de la capa de interacción, las rotaciones, las floraciones, los movimientos legales y una búsqueda real de la IA. La interfaz se comprobó en escritorio y 390 px, incluyendo cambio de pliegue antes de confirmar, célula móvil/fija y ocultación de pronósticos.

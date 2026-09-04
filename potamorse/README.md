# POTAMORSE

**Un duelo de corrientes** — juego abstracto por turnos para dos orillas, creado para LagartijaLabs.

POTAMORSE es un juego de información perfecta sobre una migración colectiva. Dos bancos de cuatro peces atraviesan un cauce de 5×5 durante una frase fija de 16 pulsos. En algunos pulsos solo existen líneas ortogonales (`+`, superficie) y en otros solo diagonales (`×`, limo). No se captura: la interacción consiste en **anclar** temporalmente peces rivales mediante presión de línea. Tras 16 pulsos se mide cuánto ha avanzado el banco entero; se cambian las orillas y se repite. El total de ambos movimientos decide la temporada.

![POTAMORSE en móvil](docs/screenshots/mobile.png)

## Abrir y jugar

No hay instalación, compilación ni servidor obligatorio.

1. Abre `index.html` en un navegador actual.
2. En GitHub Pages, copia la carpeta `potamorse/` tal cual dentro del repositorio.
3. La subpágina será `…/potamorse/` porque GitHub Pages sirve automáticamente su `index.html`.

Todo el CSS, SVG, JavaScript, iconos y sonido generativo están embebidos. No usa WebGL, módulos, fuentes externas, imágenes remotas, `DecompressionStream`, cookies ni red.

## Reglas en un minuto

- Cada orilla tiene cuatro peces. Ámbar migra hacia el norte; Índigo, hacia el sur.
- La cinta superior indica quién actúa en cada uno de los 16 pulsos: `ABBABAABBAABABBA`.
- La geometría del pulso repite `++××`:
  - **Superficie `+`**: desliza en horizontal o vertical cualquier distancia libre.
  - **Limo `×`**: desliza en diagonal cualquier distancia libre.
- No se puede saltar ni terminar sobre otra pieza.
- Un pez queda **anclado** cuando, sobre un mismo eje —horizontal, vertical o diagonal—, la primera pieza visible a cada lado es enemiga. El anclaje desaparece al romper una de las dos líneas.
- Desde las dos filas cercanas a la orilla rival, un pez puede salir por uno de los tres refugios si la geometría y el trayecto lo permiten.
- Tras 16 pulsos, cada pez puntúa su distancia aguas arriba: `0–4` dentro del cauce o `5` en un refugio. Máximo: 20 por movimiento.
- Se reinicia el tablero, las identidades intercambian orillas y se juega otro movimiento de 16 pulsos. Máximo total: 40.
- Si una orilla no tiene jugada legal, su pulso pasa automáticamente. La longitud de la partida siempre está acotada.

## Contenido del paquete

```text
potamorse/
├── index.html                    # juego íntegro, autosuficiente
├── README.md                     # uso y despliegue
├── DESIGN_NOTES.md               # investigación, síntesis y decisiones
├── BALANCE_REPORT.md             # pruebas matemáticas y simulaciones
├── QA_REPORT.md                  # comprobaciones técnicas realizadas
├── VERSION                       # versión del paquete
├── RESEARCH_RUN.md               # salida humana del proceso reproducible
├── research_seed.py              # reproduce la selección aleatoria
├── research_snapshot.json        # instantánea congelada de la investigación
├── balance.py                    # motor independiente de auditoría
├── balance_results.json          # resultados completos usados en el informe
├── INSTRUCCIONES_SUBIDA.md       # encargo inequívoco para el siguiente modelo
├── POTAMORSE_COPY_PASTE_BUNDLE.txt # todos los archivos fuente en un texto
├── MANIFEST.sha256               # integridad de los archivos fuente
├── LICENSE                       # MIT
├── docs/screenshots/             # capturas de comprobación
├── qa/check_static.py            # auditoría estática sin dependencias
└── qa/browser_smoke.py           # temporada E2E opcional con Playwright
```

## Reproducir la investigación

La semilla congelada es:

```text
6ba910032e277de76e2a491e5f450166
```

La primera capa tomó 20 páginas del módulo aleatorio de MediaWiki. La semilla seleccionó ocho; un selector SHA-256 eligió después un enlace interno por artículo. La instantánea conserva el conjunto original porque Wikipedia cambia.

```bash
python3 research_seed.py --markdown
```

Para ejecutar una nueva deriva, con una nueva semilla criptográfica y un nuevo lote de Wikipedia:

```bash
python3 research_seed.py --live --new-seed --count 20 --markdown
```

El script no se limita a imprimir artículos: genera las dimensiones mecánicas surgidas de las fuentes conservadas y evalúa **todas las 162 combinaciones**. La combinación final —deslizamiento dual, anclaje de línea, distancia fija, Thue–Morse y 5×5— queda en primer lugar. El detalle está en `DESIGN_NOTES.md`.

## Reproducir el balance

`balance.py` es un segundo motor, escrito solo con la biblioteca estándar de Python. No comparte código con el navegador, lo que reduce la posibilidad de “probar” accidentalmente el mismo error dos veces.

Comprobación rápida:

```bash
python3 balance.py --legs 2000 --matches 2000 --skill 200
```

Repetición de las muestras del informe:

```bash
python3 balance.py --legs 30000 --matches 30000 --skill 500 --json > balance_results.new.json
```

Los resultados congelados están en `balance_results.json`. Resumen:

- 30.000 temporadas emparejadas aleatorias: identidad que comienza como Ámbar, **50,19%** de los resultados decisivos; Wilson 95%: **49,60–50,78%**.
- Ramificación media: **12,90** jugadas legales por decisión; percentiles 10–90: **8–19**.
- Pases: **0,018** por temporada de 32 pulsos.
- Agente codicioso contra aleatorio: **500–0**.
- Agente táctico de una capa contra codicioso: **269–78**, con 153 empates; 77,52% de las decisivas.

Esto es evidencia de simetría, amplitud de decisión y sensibilidad a la calidad de juego bajo los agentes ensayados. **No constituye una prueba matemática de diversión ni una demostración absoluta de equilibrio con juego perfecto**; esas afirmaciones requerirían resolver el juego y hacer pruebas humanas. El informe separa deliberadamente garantías, estimaciones y meras hipótesis.

## IA y modos

- **Marea · Deriva**: evaluación local con variación deliberada entre las mejores candidatas.
- **Marea · Corriente**: búsqueda alfa-beta corta, con una pequeña posibilidad de escoger la segunda jugada.
- **Marea · Abisal**: búsqueda alfa-beta más profunda y mayor presupuesto temporal.
- **Local**: dos personas en el mismo dispositivo.

La aleatoriedad de las dificultades bajas solo decide el estilo de la IA. Las reglas, el tablero, el orden de pulsos y el resultado de una secuencia concreta de jugadas son deterministas.

## Controles y accesibilidad

- Ratón, táctil y teclado.
- `Esc`: cerrar diálogo.
- `Ctrl/Cmd + Z`: deshacer.
- `H`: sondear una jugada.
- Áreas táctiles amplias, etiquetas ARIA y soporte de `prefers-reduced-motion`.
- El tablero completo cabe en una pantalla móvil habitual sin scroll de página; los manuales sí pueden desplazarse dentro de su diálogo.

## Estado de originalidad

Se hicieron búsquedas dirigidas por nombre y por combinación de mecanismos. No apareció una coincidencia exacta con la combinación completa. Sí existen parientes parciales —juegos de carrera al borde opuesto, piezas con movimientos ortogonales/diagonales y propuestas de usar Thue–Morse como protocolo de turnos—, algo esperable porque los mecanismos elementales no son nuevos por separado. La afirmación defendible es: **no se encontró un juego igual en la búsqueda realizada**. No es posible demostrar exhaustivamente que nunca haya existido un prototipo no indexado o privado.

## Licencia

Código y documentación bajo licencia MIT. El proyecto no incorpora recursos visuales o sonoros de terceros: la interfaz se dibuja con CSS/SVG y el audio se sintetiza con Web Audio.
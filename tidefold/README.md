# TIDEFOLD / FIELD SYSTEM 021

**ES.** Juego abstracto original para dos bandos. En cada turno se siembra una célula en una de 21 cámaras y se activa uno de cuatro pliegues integrados directamente en el campo: dos corrientes concéntricas contrarrotan. Una columna radial de tres organismos iguales florece, puntúa y se disuelve. Gana quien alcanza tres floraciones.

**EN.** An original abstract game for two sides. Each turn seeds one cell among 21 chambers and activates one of four folds embedded directly in the field: two concentric currents counter-rotate. A radial column of three matching organisms blooms, scores and dissolves. First to three blooms wins.

## Interaction design

- Mobile-first fixed viewport: the playable surface fits inside `100dvh`; the page itself does not require vertical scrolling.
- The four fold controls live on the rings. Their paired arrows state the exact counter-rotation, and hover/press previews the affected rings plus ghost destinations before execution.
- Score, turn and undo remain persistent; rules, history, settings and research live in contextual bottom sheets.
- Ring motion, placement, bloom and dissolution are animated. `prefers-reduced-motion` is respected.
- Full ES/EN interface, local save, synthesized sound and no external runtime dependencies.

## AI

The opponent runs entirely in the browser. Candidate moves are ranked with a tactical evaluation; the two stronger levels add bounded stochastic rollouts over the best candidates. Difficulty presets are Drift / Current / Abyss. No account, remote API or telemetry is required for the game.

## Design lineage

The visual language combines radial marine morphology, scientific false colour and sonar-like phosphor. The rules borrow broad design precedents rather than assets: placement + board transformation (Pentago), formation/removal as scoring progress (YINSH), and principles from MDA, self-determination research and uncertainty mastery. Linked sources are available in **Field notes** inside the game.

## Files

- `index.html` — compact application shell.
- `styles.css` — responsive field, embedded controls, sheets and animation.
- `engine.js` — deterministic rules engine, transition model and move evaluation.
- `game.js` — interaction, local AI, animation, state persistence and ES/EN copy.
- `tests/run.js` — engine smoke tests.

## Tests

```bash
node tests/run.js
node --check engine.js
node --check game.js
```

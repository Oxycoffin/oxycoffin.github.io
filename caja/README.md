# Caja Clara · Daily wizard

## Español

Aplicación estática y privada de arqueo diario. Sin dependencias, servidor de datos,
analítica ni cuenta. Conserva la ruta `/caja/`.

### Flujo

Fecha y fondo esperado (350 € inicial, configurable) → sobre **1-Pablo** → sobre
**2-Victor** → siete denominaciones de billetes → ocho denominaciones de monedas
→ revisión → guardar resultado. Un único campo, teclado propio y controles
Atrás/Siguiente durante el recuento; no hay que buscar campos en una lista. Los
campos vacíos equivalen a cero. Enter avanza; Alt+flechas navega en ordenador.
La revisión permite volver a cualquier denominación y a los sobres.

**Efectivo que queda = efectivo contado − 1-Pablo − 2-Victor.**
**Descuadre = efectivo que queda − fondo esperado.**

Los sobres son retiradas pendientes: su dinero debe seguir incluido en el efectivo
contado. Si ya se retiró un sobre, introducir 0 para no descontarlo dos veces. Un
importe total de sobres superior al efectivo contado impide guardar.

### Cubetas

Ajustes guarda una tara individual en gramos (hasta tres decimales) para cada
moneda. Inicialmente todas son 0 g. En modo peso se introduce el peso bruto de la
cubeta llena. Se resta su tara, se divide entre el peso unitario de la moneda y se
redondea al entero más cercano. Un campo vacío o a 0 representa ninguna moneda;
un peso positivo menor que la tara da error. La conversión cantidad/peso incorpora
la tara, por lo que no cambia el valor monetario del recuento.

Cada borrador y resultado conserva su propia copia de las taras. Cambiar los
ajustes no recalcula el historial. Se puede aplicar expresamente la configuración
al borrador actual, con confirmación cuando ya se han introducido pesos.

### Historial e importación

Los resultados se identifican por fecha, sin nombre ni turno. Se permiten varios
resultados en una misma fecha. Guardar de nuevo el mismo borrador actualiza su
registro en lugar de duplicarlo. «Nuevo recuento» genera un ID distinto y pone a
cero sobres y denominaciones, conservando los ajustes.

Se migran automáticamente `caja-clara.history.v1` y `caja-clara.draft.v1` a claves
v2; las claves v1 permanecen intactas como respaldo. No se trunca el historial a
100 registros. Si hay corrupción o falta de espacio, se avisa y no se afirma que
el resultado se haya guardado. Un historial ilegible no se sobrescribe y puede
descargarse en bruto para recuperación.

Historial → Importar CSV reconoce el formato anterior:

`Fecha;Nombre;Billetes EUR;Monedas EUR;Total EUR;Esperado EUR;Diferencia EUR`

Admite UTF-8/BOM, separador punto y coma, coma o tabulador, comillas escapadas,
campos multilínea, decimales españoles y fechas ISO o día/mes/año. Presenta una
vista previa con nuevos registros, duplicados y errores por fila. Solo añade
registros tras confirmar; no reemplaza ni borra el historial existente. La columna
Nombre se ignora. El CSV antiguo no contenía cantidades por denominación: se
conservan sus importes, sin fabricar cantidades.

La exportación v2 incluye contado, sobres, resultado neto, referencia, diferencia,
fecha/hora de registro, ID, modo, cantidades y taras. Puede reimportarse sin perder
esos detalles. Los datos solo permanecen en ese navegador/origen; exportar antes
de borrar datos o cambiar de dispositivo. Un archivo CSV no sincroniza datos.

### Comprobación

Desde la raíz del repositorio:

```sh
node --test caja/tests/*.test.cjs
python -m http.server 8765
# En otra terminal, con Playwright y Chromium instalados:
python caja/tests/browser_test.py
```

El navegador y su ejecutable se configuran mediante `CHROMIUM_PATH`; la URL con
`CAJA_TEST_URL`. Para un entorno sin navegación HTTP permitida:

```sh
CAJA_TEST_IN_MEMORY=1 python caja/tests/browser_test.py
```

Esta variante inyecta los archivos locales en Chromium y simula Storage: prueba
el DOM, los flujos y la disposición real, pero no la persistencia nativa ni el
service worker en un origen HTTP. El test offline completo se omite explícitamente;
los manejadores de caché del service worker tienen cuatro tests unitarios aparte.

Verificado en esta revisión: **34 tests Node y 10 tests de interfaz en Chromium**,
con viewports 320×568, 375×667, 390×844, 844×390 y 1280×800. Un test de navegador
offline/HTTP quedó pendiente por la restricción de navegación del entorno. No se
ha probado en un iPhone físico ni Safari. Sin cambios fuera de `caja/`.

## English

Dependency-free static daily cash-count wizard, with one denomination per step,
a fixed in-app keypad, back/next navigation and resumable drafts. Setup selects a
local calendar date, reference float and coin mode. Pending envelopes **1-Pablo**
and **2-Victor** are entered before counting, then subtracted exactly once from
gross counted cash. The difference is calculated against the **remaining** float,
not against gross cash. Enter zero for an envelope already physically removed.

Each coin denomination has a configurable tray tare, defaulting to zero. Weight
inputs are gross grams; conversion subtracts the tare before rounding to a coin
count. Saved results keep a tare snapshot and never change when settings change.
Dates replace names. Records are not capped at 100; re-saving a draft updates its
own record, while starting a new count creates a new one.

The old local history and draft are migrated without deleting the originals.
Legacy and new CSVs can be previewed and imported additively, with duplicate and
row-error reporting. Old CSVs preserve their totals without invented denomination
counts. New exports retain envelopes, details and tares for round-tripping. Data
stays in the current browser; export before clearing it or changing devices.

Run the commands above. Validation: 34 Node tests and 10 in-memory Chromium UI
tests passed. Real HTTP/offline browser testing was unavailable in the execution
environment and is explicitly skipped in in-memory mode; four separate service
worker unit tests pass. Physical iPhone/Safari validation remains outstanding.

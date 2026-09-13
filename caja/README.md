# Caja Clara · Saldo en directo

## Español

Utilidad estática sin dependencias ni cuentas. Todos los importes se calculan en
céntimos enteros; el historial permanece en el navegador.

### Uso diario

La aplicación abre directamente en **1-Pablo**, sigue con **2-Victor**, siete
billetes, ocho monedas y revisión. No hay pantalla inicial de fecha o nombre.
Al guardar por primera vez se asigna automáticamente la fecha local de ese momento,
incluso si el borrador comenzó el día anterior. Editar el mismo registro conserva
su fecha original. Un nuevo recuento recibe un ID nuevo.

El marcador permanece fuera del área desplazable, tanto durante el recuento como
en ajustes e historial. Muestra saldo, contado, cada sobre como retirada negativa
y comparación con el fondo esperado. La fórmula es siempre:

**saldo = contado − 1-Pablo − 2-Victor**

Ejemplo: sobres de 100 € y 50 €, sin contar aún nada, muestran **−150 €**.
Al contar 500 €, muestran **350 €**. No se vuelve a descontar al guardar.
Si el dinero de un sobre ya se retiró físicamente y no se cuenta, introducir 0.
Un saldo provisional negativo es normal; un resultado final con sobres superiores
al efectivo total requiere revisar los importes antes de guardar.

Atrás/Siguiente mantienen las cantidades. Enter avanza y Alt+flechas navega;
el primer paso no permite retroceder a un paso inexistente. Los sobres se pueden
corregir tocándolos en el marcador. Las monedas permiten cambiar peso/unidades
sin abandonar el paso. Vacío equivale a cero.

### Taras y ajustes

Cada moneda tiene su tara, inicialmente 0 g. En peso se introduce el peso de la
cubeta llena. El fondo habitual (350 € inicialmente), modo y taras están en Ajustes.
Se pueden guardar para nuevos recuentos o aplicar expresamente al actual.
Los registros anteriores mantienen sus valores y taras originales.

### Historial y CSV

Se mantienen las claves v2 y la migración v1, conservando los originales. Importar
CSV añade filas tras una vista previa y evita duplicados; nunca reemplaza todo el
historial. Los nombres de antiguos CSV se ignoran. CSV antiguos sin denominaciones
conservan los totales sin inventar detalles. Los nuevos exportan sobres, cantidades
y taras para poder reimportarlos. No hay truncado a 100 registros.

### Ilustraciones y movimiento

SVG originales integrados: dos sobres con pliegues y billete interior; billetes con
paletas por denominación; monedas redondas de cobre, doradas y bimetálicas. Se
reutilizan en ajustes y revisión. Entrada de billetes, giro breve de monedas y
movimiento del papel del sobre, sin bucles infinitos. Los números cambian de forma
exacta e inmediata; solo su entrada visual tiene una transición de 160 ms.
`prefers-reduced-motion` desactiva todas las animaciones y transiciones.

### Validación de esta revisión

Ejecutado: **12 pruebas nuevas de saldo/cálculo/CSV y 4 del service worker**, todas
superadas, más **14 pruebas Chromium de interfaz**. Las de interfaz cubren nueve
tamaños (320×568, 360×640, 375×667, 390×664, 390×844, 430×932, 844×390, 667×375 y
1280×800), comprobando saldo, teclado y botones visibles y sin solapamientos.
También cubren fecha automática, borradores, taras, cambio de modo, CSV, errores de
almacenamiento e idioma. Se conserva la suite original core.test.cjs sin cambios.

El navegador del entorno bloqueó la navegación HTTP con ERR_BLOCKED_BY_ADMINISTRATOR.
Por ello, estas 14 pruebas se ejecutaron inyectando el DOM y simulando Storage.
No verifican persistencia nativa, Safari/iPhone físico ni actualización offline
real. La prueba HTTP/offline se omite explícitamente en ese modo; los manejadores
del service worker sí se comprueban con cuatro pruebas unitarias.

```sh
node --test caja/tests/*.test.cjs
python -m http.server 8765
# En otra terminal, con Playwright y Chromium instalados:
python caja/tests/browser_test.py
# Alternativa sin navegación HTTP (Storage simulado):
CAJA_TEST_IN_MEMORY=1 python caja/tests/browser_test.py
```

`CHROMIUM_PATH`, `CAJA_TEST_URL` y `CAJA_SCREENSHOT_DIR` permiten configurar las
pruebas. Los archivos de aplicación están versionados para la caché v6; solo se
eliminan cachés con prefijo caja-clara-, nunca las de otras herramientas del origen.

## English

The wizard opens directly at the first envelope: no date or name screen. On first
save, the local save date is assigned automatically. Editing a saved record retains
its original date. The permanent board shows counted cash, each negative envelope,
net balance and the reference float. Envelopes are deducted immediately and exactly
once. A negative running balance is expected before enough cash has been counted.

Tray tares, the usual float and coin mode live in Settings. Existing local history,
legacy migration and additive CSV import are preserved. No user data is uploaded.
Original inline SVG illustrations and short, action-triggered motion replace the
old denomination labels. Reduced-motion preferences disable all animation.

Validation: 12 new calculation/CSV tests and 4 service-worker tests passed, along
with 14 injected-DOM Chromium tests across nine viewports. The original core test
suite is retained unchanged. Browser Storage was simulated because HTTP navigation
was blocked; native persistence, real offline updates and physical Safari/iPhone
remain unverified. Run the commands above for HTTP-based testing on an unrestricted
local development machine.

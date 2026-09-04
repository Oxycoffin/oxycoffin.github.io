# Cuaderno de diseño de POTAMORSE

## 1. Restricción inicial

El objetivo no era “poner una temática” sobre unas reglas ya conocidas, sino obligar a que una cadena externa y reproducible produjera el vocabulario del juego. La creatividad se dividió en tres fases:

1. **Azar auditable** para romper preferencias previas.
2. **Traducción mecánica explícita**: una fuente solo se conserva si genera una regla necesaria, no solo decoración.
3. **Criba sistemática y simulación**: se evalúan combinaciones completas, se prototipan las mejores y se descartan las que fallan.

Semilla criptográfica congelada:

```text
hex:     6ba910032e277de76e2a491e5f450166
decimal: 143105218488600583363142126385989222758
```

## 2. Generación de la materia prima

El módulo `list=random` de la API de MediaWiki devolvió dos lotes de diez páginas. MediaWiki documenta que las páginas siguen una secuencia fija y que lo aleatorio es el punto de inicio; por eso el lote quedó congelado en `research_snapshot.json` para que el proceso pueda auditarse años después.

Pool de 20 artículos:

```text
00 Crater Lake–Klamath Regional Airport
01 Cui
02 Fauna of Barbados
03 List of statutory rules and orders of Northern Ireland, 2023
04 Culchie
05 Kazuharu Ishida
06 King Kelly (film)
07 Mr. Wonderful (album)
08 Petah Tikva–Kiryat Aryeh railway station
09 Suphisellus grammopterus
10 Teresa Hill
11 Adaptive immune system
12 Misterioso (Paul Motian album)
13 Timeline of the 2006 Atlantic hurricane season
14 David C. Mowery
15 Zaqatala
16 Vest Buss
17 Giorgos Koudas
18 Pál Funk
19 Shudai Harada
```

Python inicializó `random.Random(int(seed, 16))` y tomó ocho índices sin reemplazo:

```text
[12, 6, 15, 4, 16, 1, 10, 9]
```

Para no escoger a mano el “enlace interesante” de cada artículo, el segundo salto se calculó así:

```python
digest = sha256(f"{seed}|{title}|stage2".encode()).digest()
link = links[int.from_bytes(digest, "big") % len(links)]
```

## 3. Cadena de selección y descarte

| Origen aleatorio | Segundo salto | Decisión | Traducción o motivo |
|---|---|---:|---|
| Misterioso (Paul Motian album) | Free jazz | conservar | Libertad local dentro de una frase perceptible. |
| King Kelly (film) | Webcam | descartar | Sugería exhibición o espectadores, no una regla indispensable. |
| Zaqatala | Shaki-Zagatala Economic Region | descartar | Geografía genérica; duplicaba el río sin aportar interacción. |
| Culchie | Inglenook | conservar | Pequeños nichos protegidos y subsidiarios fuera de un espacio mayor. |
| Vest Buss | Vest Contrast | descartar | Destino no verificable; ninguna traducción mecánica sólida. |
| Cui | Cui-ui | conservar | Un banco que migra aguas arriba y cuya reproducción depende del paso. |
| Teresa Hill | Nemesis | descartar | Empujaba hacia venganza/captura y contradecía la síntesis emergente. |
| Suphisellus grammopterus | Adephaga | conservar como forma | Siluetas acuáticas compactas y presión, sin literalizar depredación. |

El descarte es importante: “webcam”, “región económica” o “némesis” podrían haberse forzado dentro del tema, pero habrían producido un collage. La regla era conservar solo relaciones capaces de explicar **qué hace el jugador**.

## 4. De las fuentes a dimensiones mecánicas

### Cui-ui → objetivo colectivo y distancia

El cui-ui vive y se cría en Pyramid Lake y utiliza el bajo Truckee River como hábitat de desove; su acceso y éxito de migración dependen del flujo. La traducción no fue “poner peces” sino:

- el jugador controla un **banco**, no un héroe;
- el objetivo es el avance conjunto aguas arriba;
- el cauce y las líneas libres importan más que destruir al rival;
- llegar al exterior del tablero representa alcanzar el refugio de desove.

### Free jazz → frase fija, decisiones libres

El free jazz desafía convenciones regulares de tempo, tono y cambios armónicos, pero una interpretación sigue teniendo forma y escucha mutua. Traducción:

- la **frase de 16 pulsos** es visible y estable;
- dentro de cada pulso hay libertad combinatoria;
- los turnos consecutivos permiten “llamada y respuesta” más rica que `ABABAB…`;
- el rival produce la incertidumbre; no hacen falta dados.

### Inglenook → refugios fuera del espacio común

Un inglenook es un receso parcialmente encerrado, subsidiario de una sala mayor. Traducción:

- tres nichos se sitúan fuera de cada borde principal;
- una pieza que entra deja de obstruir el cauce y queda segura;
- los destinos se leen como arquitectura, no como otra fila ordinaria.

### Adephaga → silueta y presión de línea

Los Adephaga incluyen escarabajos acuáticos depredadores. La depredación no se convirtió en captura: solo inspiró cuerpos comprimidos y la idea de presión. La interacción final es el **anclaje reversible**: dos enemigos visibles en lados opuestos fijan un pez hasta que una línea se rompe.

## 5. Morfología exhaustiva

Las fuentes retenidas produjeron cinco dimensiones:

- 3 geometrías de movimiento.
- 3 sistemas de interacción.
- 3 objetivos.
- 3 ritmos de turno.
- 2 tamaños de tablero.

Total: `3 × 3 × 3 × 3 × 2 = 162` combinaciones.

`research_seed.py` evalúa las 162. Los pesos de claridad, profundidad, simetría, cohesión y coste de complejidad están declarados en el código. También se declaran las sinergias; no se añaden después de ver el resultado. La semilla solo rompe empates mediante un barajado estable.

Primeras ocho:

| # | Geometría | Interacción | Objetivo | Ritmo | Tablero | Puntuación |
|---:|---|---|---|---|---:|---:|
| 1 | dual slider | line-of-sight pin | fixed bank distance | Thue–Morse | 5×5 | **14,655** |
| 2 | dual slider | line-of-sight pin | fixed bank distance | Thue–Morse | 6×6 | 12,873 |
| 3 | dual slider | adjacent bracket | fixed bank distance | Thue–Morse | 5×5 | 12,461 |
| 4 | dual slider | line-of-sight pin | fixed bank distance | alternancia | 5×5 | 12,184 |
| 5 | dual slider | line-of-sight pin | first three refuges | Thue–Morse | 5×5 | 11,809 |
| 6 | current step | line-of-sight pin | fixed bank distance | Thue–Morse | 5×5 | 11,499 |
| 7 | dual slider | line-of-sight pin | fixed bank distance | marea aleatoria | 5×5 | 11,055 |
| 8 | current step | line-of-sight pin | fixed bank distance | alternancia | 5×5 | 11,028 |

El ganador ya contiene el núcleo final. La morfología no “demuestra diversión”; evita que el diseñador pruebe únicamente su primera intuición.

## 6. Iteraciones y descartes del prototipo

### P0 — carrera a dos o tres refugios

**Regla:** gana quien saque primero un número fijado de peces.

**Fallo:** agentes competentes resolvían carreras muy cortas. Los últimos pulsos del patrón pesaban demasiado y una ventaja temprana podía cerrar la partida sin que el centro del tablero llegara a importar.

### P1 — salida desde cualquier fila

**Regla:** una alineación geométrica con un nicho bastaba para abandonar el tablero.

**Fallo:** era difícil anticipar amenazas y la interacción llegaba tarde. La salida no parecía una llegada a la cabecera del río.

### P2 — anclaje por vecinos adyacentes

**Regla:** una pieza entre dos enemigos contiguos quedaba inmóvil.

**Fallo:** demasiado local. Había poca presión a distancia y gran parte del tablero no participaba.

### P3 — plataforma de desove + anclaje visual + distancia fija

**Regla:** solo se sale desde las dos últimas filas; el primer ocupante visible a cada lado de un eje debe ser enemigo; se puntúa al terminar el pulso 16.

**Resultado:** amenazas legibles, bloqueo reversible, interacción temprana, final garantizado y puntuación continua.

### P4 — dos movimientos con cambio de orilla

**Regla:** se reinicia la posición y las identidades intercambian Ámbar/Índigo.

**Resultado:** cada identidad recibe ambos roles y, en conjunto, los 16 lugares temporales. Se conserva la tensión de un patrón no alternante sin dejar que un rol fijo determine toda la temporada.

## 7. Reglas finales y por qué cada una existe

### Tablero 5×5, cuatro piezas

- Cabe completo en móvil.
- La interacción aparece pronto.
- Cuatro peces crean coordinación colectiva sin sobrecargar memoria de trabajo.
- La fila central funciona como zona de conflicto sin reglas especiales.

### Dos geometrías de deslizamiento

- `+` y `×` son iconos universales y se leen antes que una explicación verbal.
- El deslizamiento de cualquier distancia abre táctica; la imposibilidad de saltar mantiene la línea de visión interpretable.
- Un mismo pez cambia de potencial sin cambiar de “tipo”: la complejidad reside en el pulso, no en memorizar cuatro fichas.

### Thue–Morse `ABBABAABBAABABBA`

Se genera con la paridad del número de bits `1` del índice. Aporta:

- ocho pulsos por lado;
- turnos dobles, pero nunca triples;
- una estructura auto-similar y no periódica a pequeña escala;
- igualdad temporal de momentos hasta grado tres en el prefijo de 16 términos;
- cuatro acciones de superficie y cuatro de limo para cada lado al combinarla con `++××`.

### Anclaje reversible, no captura

Una pieza queda anclada si, en horizontal, vertical o alguna diagonal, la primera pieza visible a ambos lados es enemiga. Consecuencias:

- cada movimiento puede avanzar, defender o crear una amenaza de tempo;
- ninguna mala jugada elimina permanentemente material;
- romper una línea libera la pieza, por lo que los bloqueos generan respuesta y contrajuego;
- mirar “a través” del tablero importa, pero solo hay una frase que aprender.

### Puntuación de distancia

Cada pez aporta `0–4` según su fila aguas arriba y `5` si migró. Esto evita el todo-o-nada de una carrera y crea varias escalas de éxito:

- ganar una ruta a un refugio;
- avanzar piezas rezagadas;
- frenar exactamente un tramo al rival;
- decidir cuándo evacuar una pieza y reducir la ocupación propia del tablero.

### Temporada de longitud fija

- 16 pulsos por movimiento, 32 por temporada.
- El jugador sabe siempre cuánto queda.
- Un pase automático evita bloqueos administrativos y garantiza terminación.
- La duración fija permite comparar resultados y estudiar el juego.

## 8. Profundidad deductiva

Las reglas son pocas, pero interactúan en varios horizontes:

1. **Geometría presente:** qué líneas existen ahora.
2. **Orden futuro:** quién tiene uno o dos pulsos seguidos y con qué geometría.
3. **Topología de presión:** mover una pieza puede anclar o liberar otra que está lejos.
4. **Economía de ocupación:** migrar puntúa cinco, pero retirar una pieza puede abrir rutas enemigas.
5. **Puntuación marginal:** una acción vale por su avance propio, el avance negado y el tempo futuro.
6. **Cambio de orilla:** una idea fuerte debe funcionar también cuando el jugador hereda el rol contrario.

No hay información oculta ni azar en las reglas. Una posición y una jugada determinan por completo la siguiente posición.

## 9. Diseño de enganche y retención

### Principio ético

El objetivo es que el jugador vuelva porque comprende más y percibe mejores decisiones, no por presión extrínseca. No se incluyeron rachas, cofres, monedas, temporizadores, notificaciones, energía, recompensas de frecuencia variable ni castigos por ausencia.

### Hook, usado como marco y no como “ley científica”

El modelo Hook describe un ciclo de **gatillo → acción → recompensa variable → inversión**. En POTAMORSE:

- **Gatillo:** la cinta deja una pregunta concreta a la vista: color activo y geometría siguiente.
- **Acción:** dos toques, origen y destino.
- **Resultado variable:** no es un premio aleatorio; surge de la respuesta del rival, las líneas que se abren y el marcador que cambia.
- **Inversión:** el segundo movimiento reutiliza el conocimiento desde la otra orilla; el registro local conserva resultados, no obligaciones.

### Teoría de la autodeterminación

Estudios sobre videojuegos han relacionado autonomía y competencia percibidas —junto con controles intuitivos— con disfrute y preferencia futura. Traducción:

- **Autonomía:** ramificación media cercana a 13; ninguna “jugada diaria” impuesta.
- **Competencia:** reglas estables, rutas legales visibles, deshacer y sondeo opcional.
- **Relación:** duelo local o rival con respuesta inteligible; no se simula una comunidad inexistente.

### Gradiente de meta

La investigación sobre goal gradient observa mayor esfuerzo cuando una meta se percibe cercana. Aquí el efecto se usa sin progreso ficticio:

- los 16 pulsos completos están visibles;
- el marcador de distancia se actualiza de forma continua;
- cada refugio se ve físicamente cerca al entrar en la plataforma de dos filas;
- no se regalan “dos sellos” ni se deforma la distancia real.

### Hipótesis de retención comprobables

No se afirma que estas decisiones garanticen D1 o D7. Antes de publicar a gran escala, conviene medir:

- finalización del tutorial y del primer movimiento;
- porcentaje que inicia el segundo movimiento;
- revancha inmediata;
- distribución de dificultad elegida;
- abandono por pulso;
- tiempo hasta la primera acción y errores de selección;
- retorno a 1, 7 y 30 días, separado entre IA y local.

Una prueba humana mínima debería comparar la cinta completa contra una versión que solo enseña el pulso actual. La hipótesis es que la cinta mejora competencia y planificación, aunque podría intimidar a principiantes.

## 10. Dirección artística

### Concepto: cartografía lacustre impresa como portada de jazz

La apariencia une las mismas fuentes que generaron las reglas:

- **batimetría/topografía:** curvas concéntricas en el papel y en el lago;
- **free jazz editorial:** títulos serif, etiquetas pequeñas espaciadas y composición de portada de disco;
- **inglenooks:** arcos fuera del rectángulo del tablero;
- **cui-ui/Adephaga:** fichas comprimidas, entre pez y escarabajo acuático;
- **agua mineral:** verde petróleo profundo en vez del azul genérico;
- **dos voces:** ámbar sedimentario e índigo crepuscular.

### Paleta

```text
Papel        #eee5cf
Tinta        #17272a
Lago         #102f37
Espuma       #d8eee8
Ámbar        #e97845
Índigo       #6971d8
```

El fondo cálido hace que el lago parezca una pieza física impresa; el alto contraste distingue líneas, piezas y destinos sin depender solo del color. Las geometrías aparecen como trazos muy tenues, no como un segundo tablero que compita con las casillas.

### Movimiento y sonido

- Las piezas deslizan; no “saltan”, porque la regla es continuidad de línea.
- El anclaje usa una cruz lineal y una ligera pérdida de saturación.
- Web Audio genera tonos breves a partir de dos bases distintas; no hay loops ni archivos descargados.
- `prefers-reduced-motion` y el ajuste manual reducen transiciones casi a cero.

## 11. Auditoría de originalidad

La búsqueda dirigida incluyó:

- el nombre exacto `POTAMORSE`;
- juegos con Thue–Morse como orden de turnos;
- juegos de salida por el borde contrario;
- juegos de deslizamiento ortogonal/diagonal;
- juegos abstractos sin captura y de migración colectiva;
- mecanismos de pin/bloqueo por línea.

Parientes parciales encontrados:

- **Gounki**: carrera a la orilla opuesta y movimientos diferentes según forma; no usa frase temporal, distancia agregada ni anclaje.
- **Lines of Action**: líneas, bloqueo y profundidad espacial; su objetivo, conteo de movimiento y captura son distintos.
- Discusiones sobre **Thue–Morse como protocolo de turnos**: prueban que la secuencia se ha propuesto para repartir acciones, no que exista esta combinación de tablero, geometrías, refugios, presión y puntuación.

Conclusión defendible: la búsqueda no halló una coincidencia exacta. Conclusión no defendible: “se ha demostrado que nada igual existió jamás”. Un juego privado, no publicado o mal indexado puede escapar a cualquier búsqueda razonable.

## 12. Fuentes principales

- MediaWiki, API:Random: https://www.mediawiki.org/wiki/API:Random
- U.S. Fish & Wildlife Service, Cui-ui species profile: https://ecos.fws.gov/ecp/species/456
- USGS, *Population dynamics of the Cui-ui of Pyramid Lake, Nevada*: https://pubs.usgs.gov/publication/70157497
- Free jazz: https://en.wikipedia.org/wiki/Free_jazz
- Inglenook: https://en.wikipedia.org/wiki/Inglenook
- Wolfram MathWorld, Thue–Morse Sequence: https://mathworld.wolfram.com/Thue-MorseSequence.html
- Ryan, Rigby & Przybylski (2006), DOI: https://doi.org/10.1007/s11031-006-9051-8
- Kivetz, Urminsky & Zheng (2006), DOI: https://doi.org/10.1509/jmkr.43.1.39
- Nir Eyal, Hooked model overview: https://www.nirandfar.com/how-to-manufacture-desire/
- Gounki overview: https://www.boardspace.net/english/about_gounki.html
- Lines of Action overview: https://en.wikipedia.org/wiki/Lines_of_Action
- BoardGameGeek discussion, Thue–Morse turn order: https://boardgamegeek.com/thread/1482282/is-the-thue-morse-sequence-the-ideal-turn-order-pr

Las referencias visuales investigadas no se incorporan a la página: el juego utiliza únicamente gráficos originales de CSS/SVG.
# Informe matemático y de balance

## Alcance

Este informe distingue cuatro niveles de afirmación:

1. **Garantía por reglas:** puede demostrarse exactamente.
2. **Cota matemática:** es cierta, pero puede ser muy superior al valor real.
3. **Estimación por simulación:** depende del agente y de la muestra.
4. **Hipótesis de experiencia:** requiere personas; una simulación no demuestra diversión.

Motor de auditoría: `balance.py`, biblioteca estándar de Python. Semilla: `6ba910032e277de76e2a491e5f450166`.

## 1. Garantías exactas

### 1.1 Terminación

Cada movimiento contiene exactamente 16 pulsos. Después de una jugada legal, o de un pase automático cuando no existe ninguna, el contador aumenta en uno. Por tanto:

```text
0 ≤ pulsos restantes ≤ 16
```

y cada movimiento termina en un máximo de 16 transiciones. Una temporada completa termina en 32. No existe repetición infinita, regla de tablas por repetición ni estado de bloqueo permanente.

### 1.2 Rango de puntuación

Cada una de cuatro piezas vale una distancia entera de 0 a 5:

```text
0 ≤ puntuación por movimiento ≤ 4 × 5 = 20
0 ≤ puntuación por temporada ≤ 40
```

No hay puntuación negativa ni multiplicadores ocultos.

### 1.3 Reparto de turnos

Los 16 primeros términos de Thue–Morse, usando `A` para paridad binaria par y `B` para impar, son:

```text
A B B A B A A B B A A B A B B A
```

Posiciones con índice cero:

```text
A = {0, 3, 5, 6, 9, 10, 12, 15}
B = {1, 2, 4, 7, 8, 11, 13, 14}
```

Ambos lados tienen ocho pulsos. Además, para `k = 0, 1, 2, 3`:

```text
Σ(i^k, i∈A) = Σ(i^k, i∈B)
```

Valores:

| grado `k` | A | B |
|---:|---:|---:|
| 0 | 8 | 8 |
| 1 | 60 | 60 |
| 2 | 620 | 620 |
| 3 | 7200 | 7200 |
| 4 | 89924 | 88388 |

La igualdad no continúa en grado cuatro. La interpretación correcta es concreta: si el valor temporal de un pulso pudiera aproximarse por cualquier polinomio cúbico fijo del índice, la suma de ese componente sería igual para ambos roles. No implica que dos estrategias complejas tengan igual valor.

### 1.4 Reparto de geometrías

La geometría sigue:

```text
+ + × × + + × × + + × × + + × ×
```

Al cruzarla con Thue–Morse:

```text
A: 4 superficie, 4 limo
B: 4 superficie, 4 limo
```

Así, ningún rol recibe más veces el movimiento ortogonal o diagonal.

### 1.5 Simetría espacial inicial

La posición inicial es invariante bajo una rotación de 180° seguida de intercambio de color. Las reglas de deslizamiento, obstrucción, anclaje, plataforma de salida y puntuación también se transforman unas en otras bajo esa operación.

Esto demuestra que no hay una asimetría geométrica codificada en una orilla concreta.

### 1.6 Cambio de orilla

En el primer movimiento, identidad X usa A/Ámbar e identidad Y usa B/Índigo. En el segundo se intercambian.

Por tanto, cada identidad recibe:

- ocho posiciones A y ocho B;
- los 16 índices temporales una vez en total;
- ocho acciones de superficie y ocho de limo;
- ambas orientaciones espaciales;
- el mismo máximo de 40 puntos.

Esto cancela exactamente cualquier bonificación **aditiva y fija** que dependa solo de color, orilla, rol A/B o índice temporal. No cancela necesariamente efectos de aprendizaje entre movimientos, estilos distintos de jugador o interacciones estratégicas no aditivas; por eso también se simula.

## 2. Cotas del espacio de posiciones

Con 0–4 piezas indistinguibles de cada lado sobre 25 casillas y sin solapamiento:

```text
Σ C(25,a)·C(25−a,b), para a,b∈{0,…,4}
= 120.030.201
```

Como el número de piezas fuera del tablero queda determinado por cuántas permanecen dentro, esta suma sirve como cota de configuraciones de ocupación relevantes. Multiplicada por los 32 índices activos posibles de una temporada:

```text
120.030.201 × 32 = 3.840.966.432
```

Es una **cota superior**, no el número de estados alcanzables ni una prueba de complejidad de árbol. Incluye colocaciones imposibles de obtener desde el inicio y omite equivalencias por simetría.

## 3. Simulación aleatoria

### 3.1 Movimientos individuales

30.000 movimientos de 16 pulsos; en cada decisión se escoge uniformemente entre las jugadas legales.

| Métrica | Resultado |
|---|---:|
| Victorias Ámbar | 13.285 |
| Victorias Índigo | 13.317 |
| Empates | 3.398 |
| Cuota Ámbar entre decisivas | 49,94% |
| Wilson 95% | 49,34–50,54% |
| Puntuación media Ámbar | 6,6507 |
| Puntuación media Índigo | 6,6466 |
| Margen absoluto medio | 2,7406 |
| Ramificación media | 12,9135 |
| Mediana de ramificación | 13 |
| Observaciones de piezas ancladas | 8,3592 por movimiento |
| Pases | 0,0080 por movimiento |

El intervalo contiene 50%, por lo que no se detecta sesgo de color con este agente y tamaño de muestra.

### 3.2 Temporadas emparejadas

30.000 temporadas de dos movimientos. X juega Ámbar en el primero e Índigo en el segundo; Y hace lo contrario.

| Métrica | Resultado |
|---|---:|
| Victorias X | 13.785 |
| Victorias Y | 13.681 |
| Empates | 2.534 |
| Cuota X entre decisivas | **50,189%** |
| Wilson 95% | **49,598–50,781%** |
| Total medio X | 13,3247 |
| Total medio Y | 13,3123 |
| Margen absoluto medio | 3,8700 |
| Ramificación media | 12,9033 |
| Mediana | 13 |
| Percentil 10–90 | 8–19 |
| Observaciones de anclaje | 16,9081 por temporada |
| Pases | 0,0181 por temporada |
| Entropía de los tres resultados | 1,3332 bits |
| Correlación de márgenes entre movimientos | −0,00022 |

La máxima entropía posible para tres resultados equiprobables sería `log2(3) ≈ 1,585` bits. El valor observado muestra diversidad de victoria X, victoria Y y empate bajo juego aleatorio, pero no es por sí mismo una medida de diversión.

La correlación prácticamente nula es esperable porque los movimientos se generaron de forma independiente; no debe interpretarse como un hallazgo psicológico.

## 4. Sensibilidad a habilidad

El objetivo es comprobar que elegir mejor altera el resultado, no certificar la fuerza de la IA del navegador.

### 4.1 Codicioso contra aleatorio

El agente codicioso maximiza el progreso propio inmediato; no mira la respuesta rival.

```text
500 temporadas
Codicioso: 500 victorias
Aleatorio: 0 victorias
Empates: 0
Puntuaciones medias: 34,816 vs 13,928
Margen medio: +20,888
```

Una heurística elemental domina al azar. Esto descarta un sistema en el que las decisiones apenas importen.

### 4.2 Táctico contra codicioso

El agente táctico combina distancia, anclajes y amenazas de salida en una evaluación de una capa.

```text
500 temporadas
Táctico: 269 victorias
Codicioso: 78 victorias
Empates: 153
Cuota táctica entre decisivas: 77,52%
Puntuaciones medias: 37,984 vs 37,176
Margen medio: +0,808
```

La ventaja es menor y aparecen muchos empates porque ambos agentes optimizan progreso, pero reconocer presión y amenazas añade valor medible.

## 5. Qué significan las cifras

### Evidencia favorable

- La simetría temporal y espacial está incorporada a las reglas.
- El resultado aleatorio emparejado es compatible con 50/50.
- Casi nunca se pierde un pulso por falta de movimiento.
- Una decisión típica ofrece alrededor de 13 alternativas, con dispersión moderada.
- El anclaje aparece con frecuencia suficiente para que la regla de interacción no sea ornamental.
- Agentes progresivamente menos ingenuos obtienen mejores resultados.

### Lo que no se ha demostrado

- Que el valor minimax del juego sea exactamente tablas o 50/50.
- Que ninguna apertura sea dominante.
- Que 13 opciones sean óptimas para principiantes.
- Que los anclajes se perciban siempre como justos.
- Que la IA Abisal juegue a nivel experto.
- Que el juego sea divertido o retenga usuarios reales.
- Que no exista una estrategia degenerada aún no encontrada.

## 6. Riesgos de diseño pendientes

1. **Ventaja de aprendizaje en el segundo movimiento.** Quien observa primero un patrón rival puede adaptarse de forma desigual.
2. **Heurística de “avance siempre”.** Los agentes simples puntúan mucho; jugadores humanos deben descubrir si bloquear compensa de forma intuitiva.
3. **Empates de alto nivel.** El probe táctico produce 30,6% de empates; una búsqueda profunda podría elevarlos o reducirlos.
4. **Carga del patrón temporal.** La cinta ayuda a planificar, pero 16 marcas podrían parecer complejas antes del primer movimiento.
5. **Valor de los refugios.** Retirar una pieza abre líneas. Es una decisión interesante en teoría, pero debe comprobarse que se entienda sin explicación larga.

## 7. Plan de validación humana

Mínimo sugerido: 20–30 participantes, mitad familiarizados con abstractos y mitad casuales.

Medir por sesión:

- tiempo hasta comprender `+` y `×`;
- errores al intentar mover una pieza anclada;
- uso de la cinta futura;
- duración real;
- abandono antes del pulso 16 y antes del segundo movimiento;
- diferencia entre puntuación del primer y tercer encuentro;
- revancha voluntaria;
- disfrute, competencia percibida y claridad en escala 1–7;
- comentario libre: “¿qué decisión te hizo perder o ganar?”.

Criterios provisionales de revisión:

- menos de 70% termina el primer movimiento → simplificar onboarding;
- más de 20% no puede explicar el anclaje después de jugar → rediseñar señal visual;
- más de 40% de partidas tácticas terminan en empate sin sensación de resolución → ensayar desempate por número de refugios o último avance, sin introducirlo antes de probar;
- ramificación subjetivamente abrumadora → mostrar dos jugadas candidatas solo durante el primer movimiento, no reducir reglas.

## 8. Reproducción

```bash
python3 balance.py --legs 30000 --matches 30000 --skill 500 --json
```

El JSON exacto utilizado es `balance_results.json`. Tiempos de ejecución no son una métrica del juego y variarán según la máquina.
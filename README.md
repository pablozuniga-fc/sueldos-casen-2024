# Sueldos de los asalariados en la Casen 2024

Tablero interactivo de la tesis «Modelos de regresión lineal con errores de distribuciones de dos piezas basadas en mezclas de escala de la normal: aplicación a los sueldos de la Casen 2024», de Pablo Zúñiga Araya (Ingeniería en Estadística, Universidad de Santiago de Chile).

**Resultados preliminares, noviembre de 2026.** Trabajo de tesis; no es un sitio oficial de la universidad.

## Contenido

- `index.html`: el tablero (sitio estático, sin dependencias de compilación).
- `assets/`: estilos, gráficos, fórmulas del modelo y lógica del tablero.
- `datos/datos.json`: datos agregados y estimaciones del modelo. No contiene registros individuales.

## Origen de las cifras

Las tablas provienen de la corrida en R de la tesis. Los histogramas son conteos por tramo de sueldo de la misma muestra de 49.503 asalariados. El simulador aplica las fórmulas del modelo t de dos piezas a las estimaciones de R.

Fuente de los datos: Encuesta Casen 2024, Ministerio de Desarrollo Social y Familia.

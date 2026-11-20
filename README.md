# Modelos de regresión lineal con errores de dos piezas: sueldos de la Casen 2024

Tablero interactivo de la tesis «Modelos de regresión lineal con errores de distribuciones de dos piezas basadas en mezclas de escala de la normal: aplicación a los sueldos de la Casen 2024», de Pablo Zúñiga Araya (Ingeniería en Estadística, Universidad de Santiago de Chile).

**Resultados preliminares, noviembre de 2026.** Trabajo de tesis; no es un sitio oficial de la universidad.

## Secciones

1. Presentación: el problema y el modelo.
2. Análisis descriptivo: muestra, sueldo, variables continuas y categóricas.
3. Comparación de modelos: 20 modelos, criterios de información y residuos con la densidad ajustada.
4. Distribución condicional: moda, mediana y percentiles del sueldo para un perfil.
5. Inferencia: coeficientes con intervalos de confianza.
6. Diagnóstico: pesos de las observaciones y residuos por nivel educacional.
7. Extensión por nivel educacional: escala y asimetría del error propias de cada nivel.
8. Metodología y fuentes.

## Contenido

- `index.html`: el tablero (sitio estático, sin dependencias de compilación).
- `assets/`: estilos, gráficos, distribuciones y lógica del tablero.
- `datos/datos.json`: datos agregados y estimaciones de los modelos. No contiene registros individuales.

## Origen de las cifras

Las tablas provienen de la corrida en R de la tesis. Los histogramas son conteos por tramo de la misma muestra de 49.503 asalariados; los residuos se calcularon con las estimaciones de R. La distribución condicional aplica las fórmulas del modelo a esas estimaciones.

Fuente de los datos: Encuesta Casen 2024, Ministerio de Desarrollo Social y Familia.

# Modelos de regresión lineal con errores de dos piezas: sueldos de la Casen 2024

Sitio interactivo con los resultados de la tesis «Modelos de regresión lineal con errores de distribuciones de dos piezas basadas en mezclas de escala de la normal: aplicación a los sueldos de la Casen 2024», de Pablo Zúñiga Araya (Ingeniería en Estadística, Universidad de Santiago de Chile).

**Resultados preliminares, noviembre de 2026.** Trabajo de tesis; no es una publicación oficial de la Universidad.

Sitio: https://pablozuniga-fc.github.io/sueldos-casen-2024/
Código de la tesis en R: https://github.com/pablozuniga-fc/regresion-dos-piezas-casen2024

## Secciones

1. Datos y muestra: construcción de la muestra, distribución del sueldo, montos redondos, sueldo según las variables explicativas y asociación entre ellas.
2. Regresión normal de referencia: residuos estandarizados de la regresión por mínimos cuadrados.
3. El modelo TP-SMN: densidad, propiedades, explorador interactivo de las cinco distribuciones y algoritmo ECME.
4. Comparación de 20 modelos con escala común: BIC, residuos con la densidad ajustada y residuos cuantílicos.
5. Escala por nivel educacional: diagnóstico por nivel, ajuste, gráficos cuantil-cuantil y cuantiles del sueldo.
6. Coeficientes e inferencia: estimaciones con tres errores estándar, escalas del error y diferencia entre moda y media.
7. Sueldo según perfil: moda, mediana, media y rangos centrales del sueldo para un perfil elegido.
8. Metodología y fuentes.

## Contenido

- `index.html`: la página (sitio estático, sin compilación ni bibliotecas externas).
- `assets/`: estilos, utilidades de gráficos, distribuciones TP-SMN y lógica de la página.
- `datos/datos.json` y `datos/datos.js`: datos agregados y estimaciones de los modelos. No contienen registros individuales.

## Origen de las cifras

Las tablas provienen de la corrida final en R de la tesis. Los histogramas, los residuos y los gráficos cuantil-cuantil se recalcularon con las estimaciones de R, y se comprobó que la log-verosimilitud de los modelos, los momentos y la distancia D de los residuos cuantílicos y los pesos por nivel coinciden con las tablas de R. Las curvas de densidad y la sección 7 aplican las fórmulas de la tesis en el navegador.

Fuente de los datos: Base de datos Casen 2024, Ministerio de Desarrollo Social y Familia, publicada en el Banco Integrado de Datos con licencia CC BY 4.0.

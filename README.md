# MRP Antigravity - Sistema de Gestión de Producción y Ratios de Insumos

**MRP Antigravity** es una aplicación web moderna, compacta y sobria estilo hoja de cálculo (Excel) desarrollada para optimizar la gestión de órdenes de producción de alimentos, el control de despachos de almacén y la auditoría de mermas e insumos mediante ratios reales.

---

## 🚀 Características Principales

### 1. Integración Directa con Excel (Copiar y Pegar)
* **Creación y Edición Ágil:** Carga órdenes de producción completas simplemente copiando filas desde Excel y pegándolas en una caja de texto. El sistema parsea nombres de recetas y cantidades de raciones en tiempo real y realiza la comparación automática contra la base de datos.

### 2. Tabla Dinámica de Consolidado de Insumos por Turno 📊
* **Agrupación Inteligente por Turnos:** La tabla dinámica de la web y el PDF ahora agrupan de forma automática los platos en sus turnos lógicos correspondientes (DESAYUNO, ALMUERZO, CENA) a partir de los prefijos de las recetas (ej. `BF` o `RB`), evitando las listas horizontales interminables de platos y haciendo la visualización ultra compacta.
* **Explosión de Materiales (BOM):** Multiplica de forma automática la cantidad unitaria de los insumos requeridos por cada plato para consolidar el total requerido del turno.
* **Control de Despachos:** Permite ingresar de forma interactiva la cantidad real entregada de insumos desde el almacén, con autoguardado en tiempo real y navegación fluida usando la tecla **`Enter`** (igual que en Excel).

### 3. Registro Aislado de Raciones Producidas 📝
* **Pestaña Independiente:** Para evitar la invasión visual en el panel consolidado, el registro del "Real Producido" de cada plato se realiza en su propia pestaña dedicada. Esto mantiene el panel principal limpio de inputs innecesarios y optimiza la legibilidad al operar o imprimir.

### 4. Consolidado Diario Inteligente (Proteínas y Verduras) 🥦
* **Pestaña Consolidada Única:** Agrupa proteínas y verduras de todos los turnos del día en una sola pantalla compartida para evitar ingresos dobles de mercadería.
* **Prorrateo Matemático:** Distribuye de forma automática y proporcional la cantidad del día completo entre los turnos en función de su requerimiento teórico individual:
  $$\text{Real}_{\text{turno}} = \text{Total Entregado Día} \times \left( \frac{\text{Teórico Turno}}{\text{Teórico Día}} \right)$$

### 5. Descarga de Reportes a Excel (.xlsx) a Color 📥
* Genera descargas en formato Excel real (`.xlsx`) con anchos de columna automáticos que previenen texto recortado y un diseño visualmente atractivo con colores suaves para diferenciar columnas críticas y turnos (Desayuno en amarillo, Almuerzo en azul, Cena en morado).

### 6. Panel de Control Analítico (Dashboard)
* **Asertividad de la Programación:** Gráficos de barras y KPI del porcentaje de cumplimiento de raciones programadas vs reales preparadas.
* **Eficiencia por Turno:** Comparación del consumo total teórico vs real por turno con cálculo automático de la desviación de despacho.
* **Alertas de Variación de Ratios:** Tabla crítica con semáforo inteligente de los 5 platos que tienen las mayores desviaciones de ratio real de ingredientes consumidos frente a la receta teórica base (BOM):
  $$\text{Ratio Real} = \frac{\text{Entregado Proporcional}}{\text{Raciones Reales Producidas}}$$

### 7. Exportación Limpia y Plana a PDF 🖨️
* Botón de impresión integrado con reglas CSS `@media print` que oculta menús, filtros y enlaces de retorno. El reporte de impresión se formatea automáticamente con márgenes estrechos y fuentes pequeñas (diseño plano 100% estilo Excel) para ahorrar papel al máximo.

---

## 🛠️ Stack Tecnológico
* **Frontend/Backend:** Next.js (App Router, Server Actions, React Client/Server Components)
* **Base de Datos:** PostgreSQL en la nube (Neon.tech) gestionado a través de la librería cliente `postgres`.
* **Diseño:** CSS vainilla plano y optimizado (sin bordes redondeados y con paddings mínimos) con tipografía *Inter* para asemejarse al máximo a una hoja de cálculo.
* **Alojamiento:** Desplegado en Vercel de forma gratuita para acceso multidispositivo permanente y multidispositivo.

---

## 📂 Estructura de la Base de Datos
El esquema transaccional de PostgreSQL consta de:
* `Categoria_Insumo` y `Insumo`: Catálogo de ingredientes y agrupaciones.
* `Categoria_Receta`, `Receta` y `Receta_Detalle` (BOM): Fórmulas y cantidades unitarias por plato.
* `Turno`: Catálogo de turnos.
* `Programa_Produccion` y `Programa_Detalle`: Órdenes programadas y raciones reales preparadas.
* `Despacho_Consolidado`: Historial de despacho teórico vs real por insumo en cada programa.

---

## 💻 Instalación y Ejecución Local

### Requisitos Previos
* Node.js (v18 o superior) e npm instalados en el sistema.

### Pasos
1. Clonar el repositorio.
2. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```
3. Crear un archivo `.env.local` en la raíz del proyecto con la variable de conexión a PostgreSQL en la nube de Neon:
   ```env
   DATABASE_URL="tu_cadena_de_conexion_a_neon"
   ```
4. Ejecutar el script de migración para inicializar las tablas en la nube e importar los datos de la base de datos local SQLite:
   ```bash
   npm run migrate-to-postgres
   ```
5. Iniciar el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
6. Abrir en el navegador [http://localhost:3000](http://localhost:3000).

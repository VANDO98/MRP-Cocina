# MRP Antigravity - Sistema de Gestión de Producción y Ratios de Insumos

**MRP Antigravity** es una aplicación web moderna, compacta y sobria estilo hoja de cálculo (Excel) desarrollada para optimizar la gestión de órdenes de producción de alimentos, el control de despachos de almacén y la auditoría de mermas e insumos mediante ratios reales.

---

## 🚀 Características Principales

### 1. Integración Directa con Excel (Copiar y Pegar)
* **Creación y Edición Ágil:** Carga órdenes de producción completas simplemente copiando filas desde Excel y pegándolas en una caja de texto. El sistema parsea nombres de recetas y cantidades de raciones en tiempo real y realiza la comparación automática contra la base de datos.

### 2. Tabla Dinámica de Consolidado de Insumos
* **Explosión de Materiales (BOM):** Multiplica de forma automática la cantidad unitaria de los insumos requeridos por cada plato para consolidar el total requerido del turno.
* **Control de Despachos:** Permite ingresar de forma interactiva la cantidad real entregada de insumos desde el almacén, con autoguardado en tiempo real y navegación fluida usando la tecla **`Enter`** (igual que en Excel).

### 3. Consolidado Diario Inteligente (Proteínas y Verduras) 🥦
* **Pestaña Consolidada Única:** Agrupa proteínas y verduras de todos los turnos del día en una sola pantalla compartida para evitar ingresos dobles de mercadería.
* **Prorrateo Matemático:** Distribuye de forma automática y proporcional la cantidad del día completo entre los turnos en función de su requerimiento teórico individual:
  $$\text{Real}_{\text{turno}} = \text{Total Entregado Día} \times \left( \frac{\text{Teórico Turno}}{\text{Teórico Día}} \right)$$

### 4. Panel de Control Analítico (Dashboard)
* **Asertividad de la Programación:** Gráficos de barras y KPI del porcentaje de cumplimiento de raciones programadas vs reales preparadas.
* **Eficiencia por Turno:** Comparación del consumo total teórico vs real por turno con cálculo automático de la desviación de despacho.
* **Alertas de Variación de Ratios:** Tabla crítica con semáforo inteligente de los 5 platos que tienen las mayores desviaciones de ratio real de ingredientes consumidos frente a la receta teórica base (BOM):
  $$\text{Ratio Real} = \frac{\text{Entregado Proporcional}}{\text{Raciones Reales Producidas}}$$

### 5. Exportación Limpia a PDF
* Botón de impresión integrado con reglas CSS `@media print` que oculta menús, filtros y botones del sistema para descargar un reporte consolidado en PDF con formato de hoja de cálculo limpio.

---

## 🛠️ Stack Tecnológico
* **Frontend/Backend:** Next.js (App Router, Server Actions, React Client/Server Components)
* **Base de Datos:** SQLite local (`production.db`) gestionado mediante la librería de alta velocidad `better-sqlite3`.
* **Diseño:** CSS vainilla optimizado, con tipografía premium *Inter* y una paleta de colores beige, taupe, crema y marrón súper sobria.

---

## 📂 Estructura de la Base de Datos
El esquema transaccional está definido en [init.sql](file:///c:/Users/sup_l/Desktop/Ordenes de produccion/web-app/init.sql) y consta de:
* `Insumo` y `Categoria_Insumo`: Catálogo de ingredientes y agrupaciones.
* `Receta`, `Categoria_Receta` y `Receta_Detalle` (BOM): Fórmulas y cantidades unitarias por plato.
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
3. Inicializar la base de datos (en caso de que no exista `production.db`):
   ```bash
   npm run init-db
   ```
4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abrir en el navegador [http://localhost:3000](http://localhost:3000).

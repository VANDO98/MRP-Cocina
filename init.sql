-- ==========================================
-- 1. TABLAS DIMENSIONALES (CATÁLOGOS)
-- ==========================================

CREATE TABLE IF NOT EXISTS Categoria_Insumo (
    id_categoria_insumo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_categoria VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Categoria_Receta (
    id_categoria_receta INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_categoria VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS Unidad_Medida (
    id_unidad INTEGER PRIMARY KEY AUTOINCREMENT,
    simbolo VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS Turno (
    id_turno INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_turno VARCHAR(50) NOT NULL
);

-- ==========================================
-- 2. ENTIDADES PRINCIPALES (MAESTROS)
-- ==========================================

CREATE TABLE IF NOT EXISTS Insumo (
    id_insumo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_insumo VARCHAR(150) NOT NULL,
    id_categoria_insumo INTEGER,
    id_unidad INTEGER,
    FOREIGN KEY (id_categoria_insumo) REFERENCES Categoria_Insumo(id_categoria_insumo),
    FOREIGN KEY (id_unidad) REFERENCES Unidad_Medida(id_unidad)
);

CREATE TABLE IF NOT EXISTS Receta (
    id_receta INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_receta VARCHAR(150) NOT NULL,
    id_categoria_receta INTEGER,
    FOREIGN KEY (id_categoria_receta) REFERENCES Categoria_Receta(id_categoria_receta)
);

-- ==========================================
-- 3. EXPLOSIÓN O BOM (BILL OF MATERIALS)
-- ==========================================

CREATE TABLE IF NOT EXISTS Receta_Detalle (
    id_receta INTEGER,
    id_insumo INTEGER,
    cantidad_unitaria DECIMAL(14,7) NOT NULL,
    PRIMARY KEY (id_receta, id_insumo),
    FOREIGN KEY (id_receta) REFERENCES Receta(id_receta),
    FOREIGN KEY (id_insumo) REFERENCES Insumo(id_insumo)
);

-- ==========================================
-- 4. TRANSACCIONAL (PROGRAMACIÓN DIARIA)
-- ==========================================

-- Cabecera del programa de producción
CREATE TABLE IF NOT EXISTS Programa_Produccion (
    id_programa VARCHAR(50) PRIMARY KEY,
    fecha DATE NOT NULL,
    id_turno INTEGER,
    FOREIGN KEY (id_turno) REFERENCES Turno(id_turno)
);

-- Detalle de raciones por receta en ese programa
CREATE TABLE IF NOT EXISTS Programa_Detalle (
    id_programa VARCHAR(50),
    id_receta INTEGER,
    raciones_programadas INTEGER NOT NULL,
    PRIMARY KEY (id_programa, id_receta),
    FOREIGN KEY (id_programa) REFERENCES Programa_Produccion(id_programa),
    FOREIGN KEY (id_receta) REFERENCES Receta(id_receta)
);

-- ==========================================
-- 5. CONTROL LOGÍSTICO (DESPACHO Y RATIOS)
-- ==========================================

CREATE TABLE IF NOT EXISTS Despacho_Consolidado (
    id_despacho INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    id_insumo INTEGER,
    cantidad_teorica_calculada DECIMAL(14,7),
    cantidad_real_entregada DECIMAL(14,7),
    FOREIGN KEY (id_insumo) REFERENCES Insumo(id_insumo)
);

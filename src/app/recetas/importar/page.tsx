'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { validarRecetasExistentes, importarRecetasBD, ParsedRecipeRow } from '@/app/actions/import-recetas';
import * as XLSX from 'xlsx-js-style';

type ValidationResult = {
  nombre: string;
  codigo: string;
  categoria: string;
  ingredientesCount: number;
  existe: boolean;
};

export default function ImportarRecetasPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRecipeRow[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<'nuevas' | 'existentes'>('nuevas');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setParsedData([]);
      setValidationResults([]);
      setSelectedRecipes({});
      setImportStatus(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setParsedData([]);
      setValidationResults([]);
      setSelectedRecipes({});
      setImportStatus(null);
    }
  };

  const parseFileOnClient = (htmlText: string): ParsedRecipeRow[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const h3s = doc.querySelectorAll('h3');
    const result: ParsedRecipeRow[] = [];

    h3s.forEach((el) => {
      const text = el.textContent?.trim() || '';
      if (text.startsWith('Receta:')) {
        const recipeName = text.replace('Receta:', '').trim().replace(/\u00a0/g, ' ');
        const trContainingH3 = el.closest('tr');
        if (!trContainingH3) return;
        
        const trPrev = trContainingH3.previousElementSibling;
        let recipeMeta = {
          codigo: '',
          nombre: recipeName,
          raciones: 1,
          unidad: 'UNIDAD',
          categoria: 'Otros',
          costoUnitario: 0,
          costoTotal: 0
        };

        if (trPrev) {
          const tds = trPrev.querySelectorAll('td');
          if (tds.length >= 8) {
            recipeMeta.codigo = tds[0].textContent?.trim().replace(/\u00a0/g, ' ') || '';
            if (recipeMeta.codigo === '-') recipeMeta.codigo = '';
            recipeMeta.raciones = Number(tds[2].textContent?.trim().replace(/,/g, '')) || 1;
            recipeMeta.unidad = tds[3].textContent?.trim() || 'UNIDAD';
            recipeMeta.categoria = tds[4].textContent?.trim() || 'Otros';
            
            recipeMeta.costoUnitario = Number(tds[tds.length - 3].textContent?.trim()) || 0;
            recipeMeta.costoTotal = Number(tds[tds.length - 2].textContent?.trim()) || 0;
          }
        }

        // Buscar la tabla de ingredientes (generalmente la primera tabla dentro del trContainingH3)
        const table = trContainingH3.querySelector('table');
        if (table) {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach((tr) => {
            const tdsIng = tr.querySelectorAll('td');
            if (tdsIng.length >= 3) {
              const qty = Number(tdsIng[0].textContent?.trim()) || 0;
              const unit = tdsIng[1].textContent?.trim() || '';
              const insumoRaw = tdsIng[2].textContent?.trim() || '';
              const insumoClean = insumoRaw.split('>').pop()?.trim().replace(/\u00a0/g, ' ') || '';
              
              if (insumoClean) {
                result.push({
                  recipe_codigo: recipeMeta.codigo,
                  recipe_nombre: recipeMeta.nombre,
                  recipe_categoria: recipeMeta.categoria,
                  recipe_raciones: recipeMeta.raciones,
                  recipe_unidad: recipeMeta.unidad,
                  recipe_costo: recipeMeta.costoTotal,
                  insumo_nombre: insumoClean,
                  insumo_cantidad: qty,
                  insumo_unidad: unit
                });
              }
            }
          });
        }
      }
    });

    return result;
  };

  const handleProcessFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    setImportStatus(null);
    try {
      // 1. Leer el archivo HTML de recetas en bruto en el cliente
      const textContent = await file.text();
      
      // 2. Parsearlo localmente en el navegador en milisegundos sin llamadas de red pesadas
      const rows = parseFileOnClient(textContent);
      setParsedData(rows);

      // 3. Extraer nombres únicos para validar en el servidor (payload liviano de KB)
      const nombresUnicos = Array.from(new Set(rows.map(r => r.recipe_nombre)));
      const existentesList = await validarRecetasExistentes(nombresUnicos);
      const existentesSet = new Set(existentesList.map(n => n.toUpperCase().trim()));

      // 4. Mapear validaciones
      const mapaRecetas: Record<string, { codigo: string; categoria: string; count: number }> = {};
      rows.forEach(r => {
        const key = r.recipe_nombre.trim().toUpperCase();
        if (!mapaRecetas[key]) {
          mapaRecetas[key] = {
            codigo: r.recipe_codigo,
            categoria: r.recipe_categoria,
            count: 0
          };
        }
        mapaRecetas[key].count++;
      });

      const val = Object.entries(mapaRecetas).map(([nombre, meta]) => ({
        nombre,
        codigo: meta.codigo,
        categoria: meta.categoria,
        ingredientesCount: meta.count,
        existe: existentesSet.has(nombre)
      })).sort((a, b) => a.nombre.localeCompare(b.nombre));

      setValidationResults(val);

      // Selección por defecto: marcar las nuevas y desmarcar las existentes
      const selection: Record<string, boolean> = {};
      val.forEach(r => {
        selection[r.nombre] = !r.existe;
      });
      setSelectedRecipes(selection);

      const tieneNuevas = val.some(r => !r.existe);
      setActiveTab(tieneNuevas ? 'nuevas' : 'existentes');

    } catch (err: any) {
      console.error(err);
      alert("Error al procesar el archivo: " + (err.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectAll = (onlyType: 'nuevas' | 'existentes' | 'all', value: boolean) => {
    const updated = { ...selectedRecipes };
    validationResults.forEach(r => {
      if (onlyType === 'all') {
        updated[r.nombre] = value;
      } else if (onlyType === 'nuevas' && !r.existe) {
        updated[r.nombre] = value;
      } else if (onlyType === 'existentes' && r.existe) {
        updated[r.nombre] = value;
      }
    });
    setSelectedRecipes(updated);
  };

  const handleCheckboxChange = (nombre: string) => {
    setSelectedRecipes(prev => ({
      ...prev,
      [nombre]: !prev[nombre]
    }));
  };

  const handleExportPolishedExcel = () => {
    if (parsedData.length === 0) return;
    
    const excelRows = parsedData.map(r => ({
      "CÓDIGO RECETA": r.recipe_codigo,
      "RECETA": r.recipe_nombre,
      "CATEGORÍA RECETA": r.recipe_categoria,
      "PORCIONES RECETA": r.recipe_raciones,
      "COSTO RECETA (S/.)": Number(r.recipe_costo.toFixed(3)),
      "INSUMO": r.insumo_nombre,
      "CANTIDAD": Number(r.insumo_cantidad.toFixed(3)),
      "UNIDAD": r.insumo_unidad
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "F97316" } }, // Acento Naranja
      alignment: { horizontal: "center", vertical: "center" }
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (ws[address]) {
        ws[address].s = headerStyle;
      }
    }

    ws['!cols'] = [
      { wch: 18 }, // Código Receta
      { wch: 35 }, // Receta
      { wch: 20 }, // Categoría Receta
      { wch: 18 }, // Porciones Receta
      { wch: 22 }, // Costo Receta
      { wch: 30 }, // Insumo
      { wch: 15 }, // Cantidad
      { wch: 15 }  // Unidad
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Recetas Pulidas");
    XLSX.writeFile(wb, `Recetas_Polished_${file?.name.replace(/\.[^/.]+$/, "")}.xlsx`);
  };

  const handleImportToDatabase = async () => {
    const listToImport = Object.keys(selectedRecipes).filter(k => selectedRecipes[k]);
    
    if (listToImport.length === 0) {
      alert("Selecciona al menos una receta para actualizar en la base de datos.");
      return;
    }

    const countExistentes = validationResults.filter(r => r.existe && selectedRecipes[r.nombre]).length;
    let confirmMsg = `¿Estás seguro que deseas importar/actualizar estas ${listToImport.length} recetas en tu base de datos?`;
    if (countExistentes > 0) {
      confirmMsg += `\n\n⚠️ ¡Atención! Estás seleccionando ${countExistentes} recetas que ya existen en el sistema. Sus ingredientes y cantidades locales se sobrescribirán con el archivo del ERP.`;
    }

    if (!confirm(confirmMsg)) return;

    setIsImporting(true);
    setImportStatus("Actualizando base de datos local... Por favor, no cierres la pestaña.");
    try {
      const res = await importarRecetasBD(parsedData, listToImport);
      setImportStatus(res.message);
      
      // Actualizar listado localmente
      const nombresUnicos = Array.from(new Set(parsedData.map(r => r.recipe_nombre)));
      const existentesList = await validarRecetasExistentes(nombresUnicos);
      const existentesSet = new Set(existentesList.map(n => n.toUpperCase().trim()));

      const updatedVal = validationResults.map(r => ({
        ...r,
        existe: existentesSet.has(r.nombre)
      }));
      setValidationResults(updatedVal);

      // Deseleccionar las que se acaban de importar
      const selection = { ...selectedRecipes };
      updatedVal.forEach(r => {
        if (r.existe) {
          selection[r.nombre] = false;
        }
      });
      setSelectedRecipes(selection);
      
    } catch (err: any) {
      console.error(err);
      setImportStatus("Error en la importación: " + (err.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  const nuevasRecetas = validationResults.filter(r => !r.existe);
  const existentesRecetas = validationResults.filter(r => r.existe);
  const recetasSeleccionadasCount = Object.values(selectedRecipes).filter(Boolean).length;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/recetas" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← Volver al Catálogo de Recetas
        </Link>
      </div>

      <div style={{ marginBottom: '2.5rem' }}>
        <span className="overline">Herramienta de Limpieza</span>
        <h1 style={{ color: 'var(--primary-color)', margin: '0.2rem 0' }}>Pulidor de Recetas ERP</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          Sube el archivo <code>recetas (7).xls</code> (HTML) exportado de Restauran.pe y limpia su estructura al instante de forma local y ultrarrápida.
        </p>
      </div>

      {/* ZONA DE CARGA */}
      <div className="card" style={{ padding: '2.5rem', marginBottom: '2rem', borderStyle: 'dashed', borderWidth: '2px', borderColor: dragOver ? 'var(--accent)' : 'var(--border-medium)', background: dragOver ? 'var(--accent-light)' : 'transparent', textAlign: 'center', transition: 'var(--transition)' }}
           onDragOver={handleDragOver}
           onDragLeave={handleDragLeave}
           onDrop={handleDrop}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧹</div>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Arrastra tu archivo recetas.xls aquí</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>O selecciona el archivo desde tu computadora</p>
        
        <input 
          type="file" 
          accept=".xls,.xlsx,.html" 
          onChange={handleFileChange}
          id="file-upload"
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" className="btn btn-outline" style={{ display: 'inline-flex', cursor: 'pointer' }}>
          Seleccionar Archivo
        </label>

        {file && (
          <div style={{ marginTop: '1.5rem', padding: '0.8rem', background: '#f1f5f9', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <span>📄</span>
            <strong>{file.name}</strong>
            <span style={{ color: '#64748b' }}>({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
          </div>
        )}
      </div>

      {/* BOTÓN DE ACCIÓN PRINCIPAL */}
      {file && parsedData.length === 0 && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button 
            onClick={handleProcessFile}
            disabled={isProcessing}
            className="btn"
            style={{ padding: '0.6rem 2.5rem', fontSize: '0.9rem' }}
          >
            {isProcessing ? 'Procesando archivo localmente... Espere por favor' : 'Procesar y Validar Recetas'}
          </button>
        </div>
      )}

      {/* SECCIÓN DE RESULTADOS Y SELECCIÓN */}
      {parsedData.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', animation: 'modal-fade-in 0.25s ease-out' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.2rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✓</span> Análisis de Archivo ERP Completado
          </h2>

          {/* Estadísticas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid var(--accent)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Nuevas en el Archivo</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{nuevasRecetas.length}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Ya Existentes en la BD</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{existentesRecetas.length}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Marcadas para Subir/Actualizar</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{recetasSeleccionadasCount}</div>
            </div>
          </div>

          {/* Botones de acción consolidada */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleExportPolishedExcel}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              📥 Descargar Excel Pulido (Completo)
            </button>
            <button 
              onClick={handleImportToDatabase}
              disabled={isImporting || recetasSeleccionadasCount === 0}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', borderColor: 'var(--primary-color)' }}
            >
              🗄️ Actualizar Base de Datos ({recetasSeleccionadasCount} marcadas)
            </button>
          </div>

          {importStatus && (
            <div style={{ padding: '1rem', borderRadius: '6px', background: isImporting ? '#fffbeb' : '#f0fdf4', border: `1px solid ${isImporting ? '#fde68a' : '#bbf7d0'}`, color: isImporting ? '#b45309' : '#15803d', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: 500 }}>
              {importStatus}
            </div>
          )}

          {/* Pestañas de validación */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--border-subtle)', marginBottom: '1rem' }}>
            <button 
              onClick={() => setActiveTab('nuevas')}
              style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'nuevas' ? '3px solid var(--accent)' : 'none', fontWeight: activeTab === 'nuevas' ? 700 : 500, color: activeTab === 'nuevas' ? 'var(--accent)' : '#64748b', cursor: 'pointer' }}
            >
              Nuevas recetas ({nuevasRecetas.length})
            </button>
            <button 
              onClick={() => setActiveTab('existentes')}
              style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'existentes' ? '3px solid var(--accent)' : 'none', fontWeight: activeTab === 'existentes' ? 700 : 500, color: activeTab === 'existentes' ? 'var(--accent)' : '#64748b', cursor: 'pointer' }}
            >
              Existentes en sistema ({existentesRecetas.length})
            </button>
          </div>

          {/* Tabla de recetas de la pestaña activa con checkbox */}
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => handleSelectAll(activeTab, true)}
                className="btn btn-outline" 
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
              >
                Marcar todas
              </button>
              <button 
                onClick={() => handleSelectAll(activeTab, false)}
                className="btn btn-outline" 
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
              >
                Desmarcar todas
              </button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '400px', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
              <table style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                    <th style={{ width: '40px', padding: '0.6rem' }}>Subir</th>
                    <th style={{ padding: '0.6rem' }}>Código</th>
                    <th style={{ padding: '0.6rem' }}>Receta</th>
                    <th style={{ padding: '0.6rem' }}>Categoría</th>
                    <th style={{ padding: '0.6rem', textAlign: 'center' }}>Insumos</th>
                    <th style={{ padding: '0.6rem' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'nuevas' ? nuevasRecetas : existentesRecetas).map((row) => (
                    <tr key={row.nombre} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ textAlign: 'center', padding: '0.6rem' }}>
                        <input 
                          type="checkbox"
                          checked={!!selectedRecipes[row.nombre]}
                          onChange={() => handleCheckboxChange(row.nombre)}
                          style={{ width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '0.6rem', color: '#64748b' }}>{row.codigo || '-'}</td>
                      <td style={{ padding: '0.6rem', fontWeight: 600 }}>{row.nombre}</td>
                      <td style={{ padding: '0.6rem' }}>{row.categoria}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 600 }}>{row.ingredientesCount}</td>
                      <td style={{ padding: '0.6rem' }}>
                        <span className={`badge ${row.existe ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                          {row.existe ? 'Existe (Sobrescribirá)' : 'Nueva Receta'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'nuevas' ? nuevasRecetas : existentesRecetas).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No hay recetas en esta pestaña.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Categoria {
  id_categoria_insumo: number;
  nombre_categoria: string;
}

interface ProcessedFile {
  originalName: string;
  name: string;
  url: string;
  blob: Blob;
}

// Mapa inicial de colores por defecto según nombres típicos de categorías
const DEFAULT_COLORS: Record<string, string> = {
  'FRUTAS Y VERDURAS': '#00ff00',
  'CARNICOS': '#ff0000',
  'AVES Y HUEVO': '#ff0000',
  'PESCADOS Y MARISCOS': '#ff0000',
  'ABARROTES': '#0000ff',
};

// ==========================================
// COMPONENTES DE ICONOS SVG VECTORIALES
// ==========================================
const SvgUpload = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '2.5rem', height: '2.5rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
  </svg>
);

const SvgFilePdf = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.2rem', height: '1.2rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const SvgPrint = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.816a1.175 1.175 0 0 1 .167-1.031 3.12 3.12 0 0 0 0-3.57 1.175 1.175 0 0 1-.167-1.031 11.242 11.242 0 0 0-2.81-5.655 1.175 1.175 0 0 1-.037-1.579l.263-.263a1.175 1.175 0 0 1 1.585-.038 11.293 11.293 0 0 0 14.108 0 1.175 1.175 0 0 1 1.585.038l.263.263a1.175 1.175 0 0 1-.038 1.579 11.286 11.286 0 0 0-2.81 5.655 1.175 1.175 0 0 1-.167 1.03 3.12 3.12 0 0 0 0 3.57 1.175 1.175 0 0 1 .167 1.031 11.242 11.242 0 0 0 2.81 5.656 1.175 1.175 0 0 1 .038 1.579l-.263.263a1.175 1.175 0 0 1-1.585.038 11.293 11.293 0 0 0-14.108 0 1.175 1.175 0 0 1-1.585-.038l-.263-.263a1.175 1.175 0 0 1 .038-1.579 11.286 11.286 0 0 0 2.81-5.656Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  </svg>
);

const SvgDownload = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const SvgTrash = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '0.9rem', height: '0.9rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const SvgSettings = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem', transition: 'transform 0.5s ease' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.936 6.936 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.645-.869L9.594 3.94ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  </svg>
);

const SvgCheckCircle = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.2rem', height: '1.2rem', color: 'var(--success)' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const SvgErrorCircle = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.2rem', height: '1.2rem', color: 'var(--danger)' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const SvgClose = () => (
  <svg className="svg-icon" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export default function ResaltarPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Estados para configuración de colores por categoría
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [colorsConfig, setColorsConfig] = useState<Record<number, string>>({});
  const [showConfig, setShowConfig] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Cargar categorías de la base de datos y configuración del LocalStorage al montar
  useEffect(() => {
    async function loadCategorias() {
      try {
        const response = await fetch('/api/categorias');
        if (!response.ok) throw new Error('No se pudieron obtener las categorías.');
        const data = await response.json() as Categoria[];
        setCategorias(data);
        
        // Cargar colores de localStorage o preestablecer valores iniciales
        const storedColors = localStorage.getItem('pdf_picking_colors');
        let initialColorsMap: Record<number, string> = {};

        if (storedColors) {
          try {
            initialColorsMap = JSON.parse(storedColors);
          } catch (e) {
            console.error('Error al parsear colores almacenados:', e);
          }
        } else {
          // Si no hay configuración previa, generar mapeos automáticos
          data.forEach(cat => {
            const nameUpper = cat.nombre_categoria.toUpperCase();
            // Buscar si coincide con categorías clave por defecto
            let matchedColor = 'none';
            for (const [key, color] of Object.entries(DEFAULT_COLORS)) {
              if (nameUpper.includes(key)) {
                matchedColor = color;
                break;
              }
            }
            initialColorsMap[cat.id_categoria_insumo] = matchedColor;
          });
          localStorage.setItem('pdf_picking_colors', JSON.stringify(initialColorsMap));
        }

        setColorsConfig(initialColorsMap);
      } catch (err) {
        console.error('Error cargando categorías:', err);
      }
    }

    loadCategorias();
  }, []);

  // Guardar configuración de colores en localStorage ante cada cambio
  const handleColorChange = (catId: number, color: string) => {
    setColorsConfig(prev => {
      const updated = { ...prev, [catId]: color };
      localStorage.setItem('pdf_picking_colors', JSON.stringify(updated));
      return updated;
    });
  };

  // Manejo de eventos Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const pdfFiles = droppedFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length > 0) {
        setFiles(prev => [...prev, ...pdfFiles]);
        setStatus(null);
      }
      
      if (droppedFiles.length !== pdfFiles.length) {
        setStatus({ type: 'error', message: 'Algunos archivos fueron omitidos. Solo se permiten archivos PDF.' });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length > 0) {
        setFiles(prev => [...prev, ...pdfFiles]);
        setStatus(null);
      }
      
      if (selectedFiles.length !== pdfFiles.length) {
        setStatus({ type: 'error', message: 'Algunos archivos fueron omitidos. Solo se permiten archivos PDF.' });
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setProcessedFiles(prev => {
      prev.forEach(f => window.URL.revokeObjectURL(f.url));
      return [];
    });
    setStatus(null);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Procesar archivos concurrentemente enviando la configuración de colores
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setStatus(null);

    processedFiles.forEach(f => window.URL.revokeObjectURL(f.url));
    setProcessedFiles([]);

    const results: ProcessedFile[] = [];
    let errorsCount = 0;

    try {
      const promises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        // Enviamos el mapa de colores en formato JSON stringified
        formData.append('colorsConfig', JSON.stringify(colorsConfig));

        try {
          const response = await fetch('/api/process-pdf', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errMsg = 'Error del servidor';
            
            if (contentType && contentType.includes('application/json')) {
              const errJson = await response.json();
              errMsg = errJson.error || errMsg;
              if (errJson.stack) {
                errMsg += ` | Detalle: ${errJson.stack}`;
              }
            } else {
              const errText = await response.text();
              errMsg = errText.includes('<!DOCTYPE') ? `Error ${response.status}` : errText;
            }
            throw new Error(errMsg);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          results.push({
            originalName: file.name,
            name: file.name.replace('.pdf', '_picking.pdf'),
            url,
            blob
          });
        } catch (err: any) {
          errorsCount++;
          console.error(`Error procesando ${file.name}:`, err);
        }
      });

      await Promise.all(promises);

      setProcessedFiles(results);
      
      if (errorsCount === 0) {
        setStatus({
          type: 'success',
          message: `¡Se procesaron exitosamente ${results.length} archivo(s)! Utiliza los controles de abajo para abrirlos o descargarlos.`,
        });
        setFiles([]);
      } else if (results.length > 0) {
        setStatus({
          type: 'success',
          message: `Se procesaron exitosamente ${results.length} archivo(s). Sin embargo, ${errorsCount} archivo(s) fallaron al procesarse.`,
        });
        const successfulNames = new Set(results.map(r => r.originalName));
        setFiles(prev => prev.filter(f => !successfulNames.has(f.name)));
      } else {
        setStatus({
          type: 'error',
          message: 'Ninguno de los archivos pudo ser procesado correctamente en el servidor.',
        });
      }

    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Ocurrió un error inesperado al procesar los archivos.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAndPrint = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleDownload = (processed: ProcessedFile) => {
    const a = document.createElement('a');
    a.href = processed.url;
    a.download = processed.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleViewAll = () => {
    processedFiles.forEach((file) => {
      window.open(file.url, '_blank');
    });
  };

  const handleDownloadAll = () => {
    processedFiles.forEach((file) => {
      handleDownload(file);
    });
  };

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto' }}>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <span className="overline">Herramienta Logística Multitarea</span>
        <h1>Picking de <em>Almacén</em></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
          Sube una o varias "Órdenes de Movimiento" en formato PDF. El sistema sombreará los insumos por categoría. Una vez procesados, podrás **abrirlos en el visor del navegador e imprimirlos directamente (Ctrl + P) sin necesidad de descargarlos en tu equipo**, o descargarlos todos juntos.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* PANEL DE CONFIGURACIÓN Y LEYENDA */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
              Mapeo de Colores para Picking
            </h2>
            <button
              type="button"
              className="btn-action"
              onClick={() => setShowConfig(!showConfig)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
            >
              <span style={{ transform: showConfig ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-flex' }}>
                <SvgSettings />
              </span>
              {showConfig ? 'Ocultar Configuración' : 'Configurar Colores'}
            </button>
          </div>

          {/* Panel colapsable de Configuración de Colores */}
          {showConfig && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '1.25rem', 
              backgroundColor: 'var(--bg-muted)', 
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <h3 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.8rem', fontWeight: 600 }}>
                Ajustar Resaltado por Categoría
              </h3>
              
              {categorias.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Cargando categorías desde la base de datos...</p>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                  gap: '0.8rem',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  paddingRight: '0.5rem'
                }}>
                  {categorias.map((cat) => {
                    const catId = cat.id_categoria_insumo;
                    const currentColor = colorsConfig[catId] || 'none';
                    const isHighlighted = currentColor !== 'none';

                    return (
                      <div key={catId} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.4rem 0.6rem', 
                        backgroundColor: 'var(--bg-surface)', 
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem'
                      }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {cat.nombre_categoria}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {/* Checkbox para activar/desactivar el resalte */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox" 
                              checked={isHighlighted}
                              onChange={(e) => {
                                handleColorChange(catId, e.target.checked ? '#ff0000' : 'none');
                              }}
                              style={{ width: '13px', height: '13px', accentColor: 'var(--accent)' }}
                            />
                            Resaltar
                          </label>

                          {/* Selector de color HTML */}
                          {isHighlighted && (
                            <input 
                              type="color" 
                              value={currentColor === 'none' ? '#ff0000' : currentColor}
                              onChange={(e) => handleColorChange(catId, e.target.value)}
                              style={{ 
                                border: '1px solid var(--border-medium)', 
                                padding: 0, 
                                width: '22px', 
                                height: '18px', 
                                cursor: 'pointer',
                                backgroundColor: 'transparent'
                              }}
                              title="Elige el color para resaltar"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Leyenda de Colores Activos */}
          <div>
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.6rem', fontWeight: 600 }}>
              Leyenda de colores activos
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {categorias.filter(cat => colorsConfig[cat.id_categoria_insumo] && colorsConfig[cat.id_categoria_insumo] !== 'none').length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem', fontStyle: 'italic' }}>Ninguna categoría configurada para resaltar. Los PDFs no tendrán sombreados.</p>
              ) : (
                categorias
                  .filter(cat => colorsConfig[cat.id_categoria_insumo] && colorsConfig[cat.id_categoria_insumo] !== 'none')
                  .map((cat) => {
                    const color = colorsConfig[cat.id_categoria_insumo];
                    return (
                      <div key={cat.id_categoria_insumo} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.4rem', 
                        padding: '0.35rem 0.6rem', 
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-muted)',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: color, 
                          opacity: 0.5, 
                          border: '1px solid rgba(0,0,0,0.15)',
                          borderRadius: '2px'
                        }}></div>
                        <span style={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                          {cat.nombre_categoria}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {/* Zona de Dropzone */}
        <div style={{ width: '100%' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          <div
            className={`card ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: dragActive ? '2px dashed var(--accent)' : '2px dashed var(--border-medium)',
              backgroundColor: dragActive ? 'var(--accent-light)' : 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'var(--transition)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem',
              minHeight: '180px'
            }}
            onClick={onButtonClick}
          >
            <div style={{ color: dragActive ? 'var(--accent)' : 'var(--text-tertiary)', transition: 'var(--transition)' }}>
              <SvgUpload />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                Arrastra tus archivos PDF aquí (puedes subir varios a la vez)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                o haz clic para explorar tu equipo
              </p>
            </div>
          </div>
        </div>

        {/* Listado de Archivos Seleccionados */}
        {files.length > 0 && (
          <div className="card animate-fade-in" style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Archivos Seleccionados ({files.length})
              </h3>
              <button 
                type="button" 
                className="btn-action btn-action-delete" 
                onClick={clearAll}
                disabled={loading}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <SvgTrash />
                Limpiar todo
              </button>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {files.map((file, idx) => (
                <li key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.5rem 0.75rem', 
                  backgroundColor: 'var(--bg-muted)', 
                  border: '1px solid var(--border-subtle)' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}>
                      <SvgFilePdf />
                    </div>
                    <span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{file.name}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="button"
                    className="btn-action-delete"
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    disabled={loading}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--danger)',
                      padding: '0.1rem 0.3rem',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title="Eliminar de la lista"
                  >
                    <SvgClose />
                  </button>
                </li>
              ))}
            </ul>

            {!loading && (
              <button
                type="button"
                className="btn"
                onClick={handleSubmit}
                style={{ width: '100%', justifyContent: 'center', padding: '0.6rem 0', fontSize: '0.85rem' }}
              >
                🌈 Procesar {files.length} archivo{files.length !== 1 ? 's' : ''}
              </button>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                <div className="spinner" style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid var(--border-subtle)',
                  borderTop: '3px solid var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Procesando archivos y aplicando resaltados...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notificaciones de Estado */}
        {status && (
          <div 
            className="card animate-fade-in" 
            style={{ 
              backgroundColor: status.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              borderColor: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              marginBottom: 0
            }}
          >
            <div style={{ display: 'inline-flex', marginTop: '0.1rem' }}>
              {status.type === 'success' ? <SvgCheckCircle /> : <SvgErrorCircle />}
            </div>
            <p style={{ 
              fontSize: '0.82rem', 
              color: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontWeight: 500,
              margin: 0,
              lineHeight: '1.5',
              whiteSpace: 'pre-line'
            }}>
              {status.message}
            </p>
          </div>
        )}

        {/* Resultados: Archivos Procesados Listos */}
        {processedFiles.length > 0 && (
          <div className="card animate-fade-in" style={{ padding: '1.5rem', marginBottom: 0, border: '1px solid var(--success)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', color: '#1E5E22', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ color: 'var(--success)', display: 'inline-flex' }}>
                    <SvgCheckCircle />
                  </span>
                  Archivos Listos para Picking ({processedFiles.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                  Abre los PDFs para verlos e imprimirlos directamente, o descárgalos.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={handleViewAll}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <SvgPrint />
                  Abrir todos
                </button>
                <button 
                  type="button" 
                  className="btn-outline" 
                  onClick={handleDownloadAll}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', borderWidth: '1.5px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <SvgDownload />
                  Descargar todos
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {processedFiles.map((proc, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.6rem 0.85rem', 
                  backgroundColor: 'var(--success-bg)', 
                  border: '1px solid #C2F0C2',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: '#1E5E22', display: 'inline-flex' }}>
                      <SvgFilePdf />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1E4620' }}>{proc.originalName}</span>
                    <span style={{ color: '#2E6932', fontSize: '0.7rem' }}>(Resaltado listo)</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn-action"
                      onClick={() => handleViewAndPrint(proc.url)}
                      style={{ 
                        fontSize: '0.72rem', 
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#FFFFFF',
                        borderColor: '#A3E2A3',
                        color: '#1E5E22',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title="Abrir en pestaña nueva para visualizar e imprimir"
                    >
                      <SvgPrint />
                      Abrir e Imprimir
                    </button>
                    <button
                      type="button"
                      className="btn-action"
                      onClick={() => handleDownload(proc)}
                      style={{ 
                        fontSize: '0.72rem', 
                        padding: '0.25rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                      title="Descargar archivo a tu equipo"
                    >
                      <SvgDownload />
                      Descargar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .drag-active {
          transform: scale(0.985);
          box-shadow: 0 4px 20px rgba(249, 115, 22, 0.08) !important;
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .svg-icon {
          display: inline-block;
          vertical-align: middle;
        }
      `}</style>
    </div>
  );
}

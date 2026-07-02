'use client';

import React, { useState, useRef } from 'react';

interface ProcessedFile {
  originalName: string;
  name: string;
  url: string;
  blob: Blob;
}

export default function ResaltarPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Liberar URLs de memoria
      prev.forEach(f => window.URL.revokeObjectURL(f.url));
      return [];
    });
    setStatus(null);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Procesar archivos concurrentemente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setStatus(null);

    // Liberar URLs procesadas anteriormente para evitar fugas de memoria
    processedFiles.forEach(f => window.URL.revokeObjectURL(f.url));
    setProcessedFiles([]);

    const results: ProcessedFile[] = [];
    let errorsCount = 0;

    try {
      // Procesamos las peticiones en paralelo para máxima velocidad
      const promises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

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
          message: `¡Se procesaron exitosamente ${results.length} archivo(s)! Utiliza las acciones de abajo para verlos o descargarlos.`,
        });
        setFiles([]); // Limpiar la lista de pendientes
      } else if (results.length > 0) {
        setStatus({
          type: 'success',
          message: `Se procesaron exitosamente ${results.length} archivo(s). Sin embargo, ${errorsCount} archivo(s) fallaron al procesarse.`,
        });
        // Dejar en la lista solo los que fallaron para que el usuario pueda reintentar
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

  // Abrir un PDF en una pestaña nueva para impresión directa
  const handleViewAndPrint = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  // Descargar un PDF específico
  const handleDownload = (processed: ProcessedFile) => {
    const a = document.createElement('a');
    a.href = processed.url;
    a.download = processed.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Abrir todos los archivos procesados en pestañas nuevas
  const handleViewAll = () => {
    processedFiles.forEach((file) => {
      window.open(file.url, '_blank');
    });
  };

  // Descargar todos los archivos procesados
  const handleDownloadAll = () => {
    processedFiles.forEach((file) => {
      handleDownload(file);
    });
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <span className="overline">Herramienta Logística Multitarea</span>
        <h1>Picking de <em>Almacén</em></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
          Sube una o varias "Órdenes de Movimiento" en formato PDF. El sistema sombreará los insumos por categoría. Una vez procesados, podrás **abrirlos en el visor del navegador e imprimirlos directamente (Ctrl + P) sin necesidad de descargarlos en tu equipo**, o descargarlos todos juntos.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        
        {/* Guía de Colores */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
            Guía de Colores para el Picking
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ width: '18px', height: '18px', backgroundColor: '#00FF00', opacity: 0.5, border: '1px solid #15803D' }}></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: '#16A34A' }}>FRUTAS Y VERDURAS</strong>
                <span style={{ fontSize: '0.72rem', color: '#166534' }}>Cebolla, ajo, poro, zanahoria...</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ width: '18px', height: '18px', backgroundColor: '#FF0000', opacity: 0.5, border: '1px solid #B91C1C' }}></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: '#DC2626' }}>CÁRNICOS Y PROTEÍNAS</strong>
                <span style={{ fontSize: '0.72rem', color: '#991B1B' }}>Carnes, pollo, pescado, mariscos...</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ width: '18px', height: '18px', backgroundColor: '#0000FF', opacity: 0.5, border: '1px solid #1D4ED8' }}></div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: '#2563EB' }}>ABARROTES / SECOS</strong>
                <span style={{ fontSize: '0.72rem', color: '#1E40AF' }}>Aceite, arroz, condimentos, azúcar...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zona de Arrastre y Soltado */}
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
            <div style={{ fontSize: '2.8rem', color: 'var(--text-tertiary)' }}>📤</div>
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

        {/* Listado de Archivos Seleccionados (Pendientes) */}
        {files.length > 0 && (
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Archivos Seleccionados ({files.length})
              </h3>
              <button 
                type="button" 
                className="btn-action btn-action-delete" 
                onClick={clearAll}
                disabled={loading}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}
              >
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
                    <span style={{ fontSize: '1.1rem' }}>📄</span>
                    <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>{file.name}</span>
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
                      fontSize: '1rem',
                      color: 'var(--danger)',
                      padding: '0.1rem 0.3rem'
                    }}
                    title="Eliminar de la lista"
                  >
                    ×
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
            <span style={{ fontSize: '1.2rem' }}>
              {status.type === 'success' ? '✅' : '❌'}
            </span>
            <p style={{ 
              fontSize: '0.82rem', 
              color: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
              fontWeight: 500,
              margin: 0,
              lineHeight: '1.5',
              whiteSpace: 'pre-line' // Permite saltos de línea para el stack trace
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
                <h3 style={{ fontSize: '0.95rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🎉</span> Archivos Listos para Picking ({processedFiles.length})
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                  Usa los botones para abrirlos en el visor o descargarlos.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={handleViewAll}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                >
                  👁️ Abrir todos
                </button>
                <button 
                  type="button" 
                  className="btn-outline" 
                  onClick={handleDownloadAll}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', borderWidth: '1.5px' }}
                >
                  📥 Descargar todos
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
                    <span style={{ fontSize: '1.2rem' }}>🌈</span>
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
                        color: '#1E5E22'
                      }}
                      title="Abrir en pestaña nueva para visualizar e imprimir"
                    >
                      👁️ Abrir e Imprimir
                    </button>
                    <button
                      type="button"
                      className="btn-action"
                      onClick={() => handleDownload(proc)}
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem' }}
                      title="Descargar archivo a tu equipo"
                    >
                      📥 Descargar
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
      `}</style>
    </div>
  );
}

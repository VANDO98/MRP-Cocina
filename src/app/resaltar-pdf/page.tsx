'use client';

import React, { useState, useRef } from 'react';

export default function ResaltarPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setStatus(null);
      } else {
        setStatus({ type: 'error', message: 'Por favor, selecciona únicamente archivos PDF.' });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setStatus(null);
      } else {
        setStatus({ type: 'error', message: 'Por favor, selecciona únicamente archivos PDF.' });
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Enviar archivo al backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Error al procesar el archivo.';
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          if (errorData.stack) {
            errorMessage += ` | Detalle: ${errorData.stack}`;
          }
        } else {
          const textError = await response.text();
          if (textError.includes('<!DOCTYPE') || textError.includes('<html')) {
            errorMessage = `Error del servidor (${response.status}): Ocurrió un error interno en el procesamiento del PDF en la nube.`;
          } else {
            errorMessage = textError || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      // Recibir el archivo binario y forzar descarga
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '_picking.pdf');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: '¡PDF procesado exitosamente! El archivo resaltado se ha descargado automáticamente.',
      });
      setFile(null); // Resetear
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Ocurrió un error inesperado al procesar el PDF.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <span className="overline">Herramienta Logística</span>
        <h1>Picking de <em>Almacén</em></h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
          Sube la "Orden de Movimiento" en formato PDF generada por el sistema. El backend extraerá las coordenadas y sombreará de colores los insumos según su categoría para agilizar y reducir errores en el surtido físico.
        </p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* Leyenda de colores interactiva */}
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

        {/* Zona de Subida */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
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
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'var(--transition)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              minHeight: '260px'
            }}
            onClick={onButtonClick}
          >
            {/* Icono de Archivo */}
            <div style={{ 
              fontSize: '3rem', 
              color: file ? 'var(--accent)' : 'var(--text-tertiary)',
              transition: 'var(--transition)'
            }}>
              {file ? '📄' : '📤'}
            </div>

            <div>
              {file ? (
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                    {file.name}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {(file.size / 1024).toFixed(1)} KB · Listo para procesar
                  </p>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Arrastra tu archivo PDF de Orden de Movimiento
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    o haz clic para buscar en tu equipo
                  </p>
                </div>
              )}
            </div>

            {file && !loading && (
              <button
                type="submit"
                className="btn"
                onClick={(e) => e.stopPropagation()} // Evita abrir explorador al hacer clic en el botón
                style={{ marginTop: '0.5rem', padding: '0.6rem 1.8rem', fontSize: '0.85rem' }}
              >
                🌈 Resaltar y Descargar PDF
              </button>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div className="spinner" style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid var(--border-subtle)',
                  borderTop: '3px solid var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Procesando PDF y consultando categorías...
                </p>
              </div>
            )}
          </div>
        </form>

        {/* Notificaciones de Estado */}
        {status && (
          <div 
            className="card animate-fade-in" 
            style={{ 
              backgroundColor: status.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
              borderColor: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
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
              margin: 0
            }}>
              {status.message}
            </p>
          </div>
        )}
      </div>

      {/* Estilos adicionales locales para animación */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .drag-active {
          transform: scale(0.985);
          box-shadow: 0 4px 20px rgba(249, 115, 22, 0.08) !important;
        }
      `}</style>
    </div>
  );
}

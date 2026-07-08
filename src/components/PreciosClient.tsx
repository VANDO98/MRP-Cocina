'use client';

import React, { useState, useMemo } from 'react';
import { savePreciosMasivo, deletePrecioHistorial } from '@/app/actions/precios';

type Historial = {
  id_precio_historial: number;
  fecha_inicio: string;
  precio_unitario: number;
};

type Insumo = {
  id_insumo: number;
  nombre_insumo: string;
  categoria_insumo: string;
  simbolo: string;
  precio_defecto: number;
  historial: Historial[];
};

export default function PreciosClient({ insumos }: { insumos: Insumo[] }) {
  // Filtros y Controles superiores (estilo ERP "Cuadre manual")
  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('TODAS');
  const [fechaVigencia, setFechaVigencia] = useState(() => new Date().toISOString().split('T')[0]);
  const [tipoGuardado, setTipoGuardado] = useState<'base' | 'historial'>('base');

  // Estado para capturar todos los inputs editados
  const [preciosEditados, setPreciosEditados] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Estado para el modal de historial
  const [insumoHistorialActivo, setInsumoHistorialActivo] = useState<Insumo | null>(null);

  // Obtener categorías únicas
  const categoriasUnicas = useMemo(() => {
    const set = new Set(insumos.map(i => i.categoria_insumo || 'Otros'));
    return ['TODAS', ...Array.from(set)];
  }, [insumos]);

  // Función para obtener el precio aplicable actual
  const getPrecioActual = (i: Insumo) => {
    const today = new Date().toISOString().split('T')[0];
    const applicable = [...i.historial]
      .filter(h => h.fecha_inicio <= today)
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0];
    return applicable ? applicable.precio_unitario : i.precio_defecto;
  };

  // Filtrar insumos
  const filteredInsumos = useMemo(() => {
    return insumos.filter(i => {
      const term = search.toLowerCase();
      const matchSearch = !term || 
        i.nombre_insumo.toLowerCase().includes(term) ||
        (i.categoria_insumo || '').toLowerCase().includes(term);

      const cat = i.categoria_insumo || 'Otros';
      const matchCategoria = categoriaFilter === 'TODAS' || cat === categoriaFilter;

      return matchSearch && matchCategoria;
    });
  }, [insumos, search, categoriaFilter]);

  // Manejar el cambio en los inputs del costo
  const handleInputChange = (id_insumo: number, value: string) => {
    setPreciosEditados(prev => ({
      ...prev,
      [id_insumo]: value
    }));
  };

  // Guardar cambios masivos (tipo "Guardar cuadre manual")
  const handleSaveAll = async () => {
    const cambios: { id_insumo: number; precio: number }[] = [];
    
    Object.entries(preciosEditados).forEach(([idStr, val]) => {
      const id = parseInt(idStr, 10);
      const precio = parseFloat(val);
      if (!isNaN(precio) && precio >= 0) {
        cambios.push({ id_insumo: id, precio });
      }
    });

    if (cambios.length === 0) {
      alert("No has realizado ninguna modificación de precio válida.");
      return;
    }

    setIsSaving(true);
    try {
      await savePreciosMasivo(cambios, tipoGuardado, fechaVigencia);
      alert("¡Precios guardados con éxito en la base de datos!");
      setPreciosEditados({}); // Limpiar cambios locales una vez guardados
    } catch (err) {
      alert("Hubo un error al guardar los precios masivamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarHistorial = async (idHistorial: number) => {
    if (confirm("¿Estás seguro de eliminar este precio del historial?")) {
      try {
        await deletePrecioHistorial(idHistorial);
        // Actualizar el modal si está abierto
        if (insumoHistorialActivo) {
          const nuevoHist = insumoHistorialActivo.historial.filter(h => h.id_precio_historial !== idHistorial);
          setInsumoHistorialActivo({ ...insumoHistorialActivo, historial: nuevoHist });
        }
        alert("Precio eliminado del historial.");
      } catch (err) {
        alert("Error al eliminar del historial.");
      }
    }
  };

  return (
    <div>
      {/* ── BARRA DE CONTROLES SUPERIOR (ESTILO CUADRE MANUAL ERP) ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Búsqueda */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Buscar Insumo
            </label>
            <input 
              type="text" 
              placeholder="Ej. Pollo, Arroz..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Filtro Categoría */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categoría
            </label>
            <select 
              value={categoriaFilter} 
              onChange={e => setCategoriaFilter(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {categoriasUnicas.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Fecha de Vigencia */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fecha de Vigencia
            </label>
            <input 
              type="date" 
              value={fechaVigencia}
              onChange={e => setFechaVigencia(e.target.value)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Guardar Como */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Guardar Como
            </label>
            <select 
              value={tipoGuardado} 
              onChange={e => setTipoGuardado(e.target.value as any)}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="base">Actualizar Precio Base (Defecto)</option>
              <option value="historial">Registrar Nuevo Historial por Fecha</option>
            </select>
          </div>

          {/* Botón Guardar */}
          <div>
            <button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className="btn"
              style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700 }}
            >
              💾 {isSaving ? 'Guardando...' : 'Guardar Precios'}
            </button>
          </div>

        </div>
      </div>

      {/* Rótulo de advertencia ERP */}
      <div style={{
        background: '#fff7ed',
        border: '1px solid #ffedd5',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1.25rem',
        marginBottom: '1rem',
        fontSize: '0.82rem',
        color: '#c2410c'
      }}>
        💡 <strong>Referencia de Costos:</strong> Modifica directamente los precios en la columna <strong>Costo Unitario (S/.)</strong> y haz clic en <strong>Guardar Precios</strong> para aplicar los cambios a todos los insumos editados.
      </div>

      {/* ── TABLA DE PRECIOS ESTILO CUADRE MANUAL ── */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
        <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, width: '100px' }}>Código</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Insumo (Item)</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Categoría</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, width: '90px' }}>Unidad</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, width: '170px' }}>Últ. Compra (Base Ref.)</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, width: '180px' }}>Costo Unitario (S/.)</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, width: '160px', textAlign: 'center' }}>Historial</th>
            </tr>
          </thead>
          <tbody>
            {filteredInsumos.map(i => {
              const precioActual = getPrecioActual(i);
              
              // Valor actual del input
              const inputValue = preciosEditados[i.id_insumo] !== undefined 
                ? preciosEditados[i.id_insumo] 
                : precioActual.toFixed(2);

              const formattedCodigo = `INS${i.id_insumo.toString().padStart(5, '0')}`;

              return (
                <tr key={i.id_insumo} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {/* Código */}
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b' }}>
                    {formattedCodigo}
                  </td>

                  {/* Nombre Insumo */}
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>
                    {i.nombre_insumo}
                  </td>

                  {/* Categoría */}
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                    {i.categoria_insumo || 'Sin categoría'}
                  </td>

                  {/* Unidad */}
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: '#64748b' }}>
                    {i.simbolo || '-'}
                  </td>

                  {/* Último Precio Base de referencia */}
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                    S/. {Number(i.precio_defecto).toFixed(4)}
                  </td>

                  {/* Input de Costo editable */}
                  <td style={{ padding: '0.65rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>S/.</span>
                      <input 
                        type="number" 
                        step="0.0001" 
                        min="0"
                        value={inputValue}
                        onChange={e => handleInputChange(i.id_insumo, e.target.value)}
                        className="input"
                        style={{ 
                          width: '100px', 
                          padding: '0.3rem 0.5rem', 
                          fontSize: '0.85rem', 
                          textAlign: 'right',
                          background: preciosEditados[i.id_insumo] !== undefined ? '#fffbeb' : '#fff',
                          borderColor: preciosEditados[i.id_insumo] !== undefined ? '#f59e0b' : 'var(--border-subtle)'
                        }}
                      />
                    </div>
                  </td>

                  {/* Acceso a Historial individual */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => setInsumoHistorialActivo(i)}
                      className="btn-action"
                      style={{ 
                        fontSize: '0.72rem', 
                        padding: '0.3rem 0.6rem',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1'
                      }}
                    >
                      📋 Ver ({i.historial.length})
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL DE HISTORIAL POR FECHA (ESTILO MODAL DE ERP) ── */}
      {insumoHistorialActivo && (
        <div className="modal-overlay" onClick={() => setInsumoHistorialActivo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Historial de Precios</h2>
              <button 
                onClick={() => setInsumoHistorialActivo(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Precios registrados a lo largo del tiempo para <strong>{insumoHistorialActivo.nombre_insumo}</strong>.
            </p>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {insumoHistorialActivo.historial.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  No hay precios programados para fechas futuras o pasadas. Se utilizará el Precio Base de S/. {insumoHistorialActivo.precio_defecto.toFixed(2)}.
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Aplica Desde</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Precio</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumoHistorialActivo.historial.map(h => {
                      const dateParts = h.fecha_inicio.split('-');
                      const displayDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : h.fecha_inicio;
                      return (
                        <tr key={h.id_precio_historial} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 600 }}>{displayDate}</td>
                          <td style={{ padding: '0.5rem' }}>S/. {h.precio_unitario.toFixed(2)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                            <button 
                              onClick={() => handleEliminarHistorial(h.id_precio_historial)}
                              style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setInsumoHistorialActivo(null)} 
                className="btn btn-outline"
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

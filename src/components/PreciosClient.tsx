'use client';

import React, { useState } from 'react';
import { updatePrecioDefecto, addPrecioHistorial, deletePrecioHistorial } from '@/app/actions/precios';

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
  const [search, setSearch] = useState('');
  const [editingDefecto, setEditingDefecto] = useState<number | null>(null);
  const [precioInput, setPrecioInput] = useState('');
  
  const [addingHistorial, setAddingHistorial] = useState<number | null>(null);
  const [histFecha, setHistFecha] = useState('');
  const [histPrecio, setHistPrecio] = useState('');

  const filtered = insumos.filter(i => i.nombre_insumo.toLowerCase().includes(search.toLowerCase()) || (i.categoria_insumo || '').toLowerCase().includes(search.toLowerCase()));

  const handleSaveDefecto = async (id: number) => {
    if (!precioInput) return;
    await updatePrecioDefecto(id, parseFloat(precioInput));
    setEditingDefecto(null);
  };

  const handleSaveHistorial = async (id: number) => {
    if (!histFecha || !histPrecio) return;
    await addPrecioHistorial(id, histFecha, parseFloat(histPrecio));
    setAddingHistorial(null);
  };

  return (
    <div>
      <input 
        type="text" 
        placeholder="Buscar insumo o categoría..." 
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '0.8rem', marginBottom: '1.5rem', borderRadius: '6px', border: '1px solid #ccc' }}
      />

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {filtered.map(i => (
          <div key={i.id_insumo} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 0.3rem 0', color: '#333' }}>{i.nombre_insumo}</h3>
                <span style={{ fontSize: '0.85rem', color: '#666', background: '#f0f0f0', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {i.categoria_insumo || 'Sin categoría'} ({i.simbolo || '-'})
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#555' }}>
                  Precio Base: 
                  {editingDefecto === i.id_insumo ? (
                    <span style={{ marginLeft: '0.5rem' }}>
                      <input type="number" step="0.01" value={precioInput} onChange={e => setPrecioInput(e.target.value)} style={{ width: '80px', padding: '0.3rem' }} />
                      <button className="btn-primary" onClick={() => handleSaveDefecto(i.id_insumo)} style={{ padding: '0.3rem 0.8rem', marginLeft: '0.3rem' }}>✓</button>
                      <button className="btn-outline" onClick={() => setEditingDefecto(null)} style={{ padding: '0.3rem 0.8rem', marginLeft: '0.3rem' }}>✕</button>
                    </span>
                  ) : (
                    <strong style={{ marginLeft: '0.5rem', color: '#111' }}>
                      S/. {Number(i.precio_defecto).toFixed(2)}
                      <button style={{ border: 'none', background: 'none', color: 'var(--primary-color)', cursor: 'pointer', marginLeft: '0.5rem' }} onClick={() => { setEditingDefecto(i.id_insumo); setPrecioInput(i.precio_defecto.toString()); }}>✎</button>
                    </strong>
                  )}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}>Historial de Precios por Fecha</h4>
                {addingHistorial !== i.id_insumo && (
                  <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => { setAddingHistorial(i.id_insumo); setHistFecha(''); setHistPrecio(''); }}>
                    + Nuevo Precio
                  </button>
                )}
              </div>

              {addingHistorial === i.id_insumo && (
                <div style={{ background: '#fff3e0', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>Aplica desde:</label>
                    <input type="date" value={histFecha} onChange={e => setHistFecha(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem' }}>Precio (S/.):</label>
                    <input type="number" step="0.01" value={histPrecio} onChange={e => setHistPrecio(e.target.value)} style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', width: '100px' }} />
                  </div>
                  <div style={{ marginTop: '1.2rem' }}>
                    <button className="btn-primary" onClick={() => handleSaveHistorial(i.id_insumo)} style={{ padding: '0.4rem 1rem' }}>Guardar</button>
                    <button className="btn-outline" onClick={() => setAddingHistorial(null)} style={{ padding: '0.4rem 1rem', marginLeft: '0.5rem' }}>Cancelar</button>
                  </div>
                </div>
              )}

              {i.historial.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#999', margin: 0 }}>No hay historial. Se usará el precio base.</p>
              ) : (
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {i.historial.map(h => (
                      <tr key={h.id_precio_historial} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '0.4rem 0', color: '#555' }}>Desde: <strong>{new Date(h.fecha_inicio + 'T12:00:00').toLocaleDateString('es-PE')}</strong></td>
                        <td style={{ padding: '0.4rem 0', color: '#111' }}>S/. {Number(h.precio_unitario).toFixed(2)}</td>
                        <td style={{ padding: '0.4rem 0', textAlign: 'right' }}>
                          <button style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }} onClick={() => deletePrecioHistorial(h.id_precio_historial)}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

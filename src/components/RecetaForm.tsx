'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveReceta } from '@/app/actions';

type Categoria = { id_categoria_receta: number; nombre_categoria: string };
type InsumoCat = { id_insumo: number; nombre_insumo: string; simbolo: string };

type Props = {
  receta?: { id_receta: number; nombre_receta: string; id_categoria_receta: number };
  detallesIniciales?: { id_insumo: number; cantidad: number }[];
  categorias: Categoria[];
  insumosList: InsumoCat[];
};

export default function RecetaForm({ receta, detallesIniciales = [], categorias, insumosList }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(receta?.nombre_receta || '');
  const [categoria, setCategoria] = useState(receta?.id_categoria_receta?.toString() || (categorias[0]?.id_categoria_receta.toString() || ''));
  const [detalles, setDetalles] = useState<{ id_insumo: number; cantidad: string }[]>(
    detallesIniciales.map(d => ({ id_insumo: d.id_insumo, cantidad: d.cantidad.toString() }))
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleAddInsumo = () => {
    if (insumosList.length > 0) {
      setDetalles([...detalles, { id_insumo: insumosList[0].id_insumo, cantidad: '0' }]);
    }
  };

  const handleRemoveInsumo = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleChangeInsumo = (index: number, field: 'id_insumo' | 'cantidad', value: string) => {
    const newDetalles = [...detalles];
    if (field === 'id_insumo') newDetalles[index].id_insumo = parseInt(value, 10);
    else newDetalles[index].cantidad = value;
    setDetalles(newDetalles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !categoria) {
      alert("El nombre y la categoría son obligatorios");
      return;
    }

    const payload = detalles.map(d => ({ id_insumo: d.id_insumo, cantidad: parseFloat(d.cantidad) || 0 })).filter(d => d.cantidad > 0);
    
    if (payload.length === 0) {
      if (!confirm("Esta receta no tiene ingredientes con cantidades válidas. ¿Deseas guardarla así?")) return;
    }

    setIsSaving(true);
    try {
      const id = await saveReceta(receta?.id_receta || null, nombre, parseInt(categoria, 10), payload);
      router.push(`/recetas/${id}`);
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar la receta");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Nombre de Receta:</label>
          <input 
            type="text" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)}
            style={{ width: '100%' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Categoría:</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ width: '100%' }} required>
            {categorias.map(c => (
              <option key={c.id_categoria_receta} value={c.id_categoria_receta}>{c.nombre_categoria}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Ingredientes (BOM)</h3>
          <button type="button" className="btn" onClick={handleAddInsumo}>+ Añadir Insumo</button>
        </div>
        
        {detalles.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic', padding: '1rem', backgroundColor: '#f9f9f9', border: '1px dashed #ccc' }}>No hay insumos en esta receta.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th style={{ width: '150px' }}>Cantidad Unitaria</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {detalles.map((d, index) => (
                <tr key={index}>
                  <td>
                    <select 
                      value={d.id_insumo} 
                      onChange={e => handleChangeInsumo(index, 'id_insumo', e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {insumosList.map(i => (
                        <option key={i.id_insumo} value={i.id_insumo}>{i.nombre_insumo} ({i.simbolo})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="any"
                      value={d.cantidad} 
                      onChange={e => handleChangeInsumo(index, 'cantidad', e.target.value)}
                      style={{ width: '100%', textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" onClick={() => handleRemoveInsumo(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button type="submit" className="btn" disabled={isSaving}>
          {isSaving ? 'Guardando...' : '💾 Guardar Receta'}
        </button>
        <button type="button" className="btn" onClick={() => router.back()} style={{ backgroundColor: '#ccc', color: '#333', borderColor: '#bbb' }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

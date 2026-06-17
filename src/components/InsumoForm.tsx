'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInsumo } from '@/app/actions';

type Categoria = { id_categoria_insumo: number; nombre_categoria: string };
type Unidad = { id_unidad: number; nombre_unidad: string; simbolo: string };

type Props = {
  categorias: Categoria[];
  unidades: Unidad[];
};

export default function InsumoForm({ categorias, unidades }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState(categorias[0]?.id_categoria_insumo.toString() || '');
  const [unidad, setUnidad] = useState(unidades[0]?.id_unidad.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !categoria || !unidad) {
      alert("Todos los campos son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      await createInsumo(nombre, parseInt(categoria, 10), parseInt(unidad, 10));
      router.push(`/insumos`);
    } catch (err: any) {
      console.error(err);
      alert("Error al guardar el insumo");
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Nombre del Insumo:</label>
          <input 
            type="text" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            placeholder="Ej: TOMATE ITALIANO"
            required
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Categoría:</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} required>
              {categorias.map(c => (
                <option key={c.id_categoria_insumo} value={c.id_categoria_insumo}>{c.nombre_categoria}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Unidad de Medida:</label>
            <select value={unidad} onChange={e => setUnidad(e.target.value)} style={{ width: '100%', padding: '0.5rem' }} required>
              {unidades.map(u => (
                <option key={u.id_unidad} value={u.id_unidad}>{u.nombre_unidad} ({u.simbolo})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
        <button type="button" className="btn btn-outline" onClick={() => router.back()} disabled={isSaving}>Cancelar</button>
        <button type="submit" className="btn" disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar Insumo'}
        </button>
      </div>
    </form>
  );
}

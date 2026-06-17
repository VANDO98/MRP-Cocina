'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveProgramaEdicion } from '@/app/actions';
import Link from 'next/link';

type RecetaDetalle = {
  id_receta: number;
  nombre_receta: string;
  raciones_programadas: number;
};

type RecetaCatalogo = {
  id_receta: number;
  nombre_receta: string;
};

type Props = {
  programa: {
    id_programa: string;
    fecha: string;
    nombre_turno: string;
  };
  recetasActuales: RecetaDetalle[];
  catalogoRecetas: RecetaCatalogo[];
};

export default function ProgramaEditarForm({ programa, recetasActuales, catalogoRecetas }: Props) {
  const router = useRouter();
  
  // Inicializar pasteData con la lista de recetas actuales en formato tabulado (copiable para excel)
  const [pasteData, setPasteData] = useState<string>(
    recetasActuales.map(r => `${r.nombre_receta}\t${r.raciones_programadas}`).join('\n')
  );
  
  const [parsedRows, setParsedRows] = useState<{ nombre: string; raciones: number; id_receta?: number }[]>(
    recetasActuales.map(r => ({
      nombre: r.nombre_receta,
      raciones: r.raciones_programadas,
      id_receta: r.id_receta
    }))
  );
  
  const [isSaving, setIsSaving] = useState(false);

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteData(text);

    const rows = text.split('\n').filter(r => r.trim() !== '');
    const newParsed = rows.map(row => {
      const cols = row.split('\t');
      let nombre = cols[0] ? cols[0].trim() : '';
      let raciones = 0;
      
      if (cols.length > 1) {
        raciones = parseInt(cols[1].trim(), 10) || 0;
      } else {
        // En caso de que se digite a mano sin tabulación, intentar buscar un espacio
        const spaceIdx = row.lastIndexOf(' ');
        if (spaceIdx !== -1) {
          const part1 = row.substring(0, spaceIdx).trim();
          const part2 = parseInt(row.substring(spaceIdx).trim(), 10);
          if (!isNaN(part2)) {
            nombre = part1;
            raciones = part2;
          }
        }
      }

      // Quitar espacios y paréntesis para comparar
      const cleanStr = (s: string) => s.replace(/[()\\s]/g, '').toLowerCase();
      const recetaFound = catalogoRecetas.find(r => cleanStr(r.nombre_receta) === cleanStr(nombre));
      
      return {
        nombre,
        raciones,
        id_receta: recetaFound?.id_receta
      };
    });

    setParsedRows(newParsed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validRows = parsedRows.filter(r => r.id_receta && r.raciones > 0);
    if (validRows.length === 0) {
      alert("Por favor ingresa o pega al menos una receta válida que exista en la base de datos.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = validRows.map(r => ({
        id_receta: r.id_receta!,
        raciones: r.raciones
      }));

      await saveProgramaEdicion(programa.id_programa, payload);
      router.push('/programas');
    } catch (e) {
      console.error(e);
      alert("Error al guardar los cambios del programa");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '750px', marginTop: '1.5rem' }}>
      
      {/* Datos del programa bloqueados */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>ID de Programa</label>
          <input type="text" value={programa.id_programa} disabled style={{ width: '100%', padding: '0.4rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', color: '#666' }} />
        </div>
        <div style={{ flex: 1.5 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Fecha</label>
          <input type="text" value={programa.fecha} disabled style={{ width: '100%', padding: '0.4rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', color: '#666' }} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Turno</label>
          <input type="text" value={programa.nombre_turno} disabled style={{ width: '100%', padding: '0.4rem', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', color: '#666' }} />
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem', fontSize: '0.9rem', color: '#4e3629' }}>
          Pegar / Modificar Lista desde Excel (Receta y Raciones)
        </label>
        <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
          Puedes borrar y volver a pegar la lista de platos completa de tu Excel, o editar los valores y nombres directamente abajo en el cuadro de texto.
        </p>
        <textarea 
          value={pasteData}
          onChange={handlePasteChange}
          placeholder="Ejemplo:&#10;RB ARROZ CHAUFA CON POLLO CARTA&#9;100&#10;POLLO A LA CHORRILLANA&#9;50"
          style={{ 
            width: '100%', 
            height: '180px', 
            padding: '0.5rem', 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}
        />
      </div>

      {parsedRows.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#4e3629', borderBottom: '1px solid #eee', paddingBottom: '0.25rem' }}>
            Vista Previa de Platos Identificados
          </h3>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.4rem', fontSize: '0.8rem' }}>Receta Leída</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center', width: '120px' }}>Raciones</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center', width: '150px' }}>Estado en la BD</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.5rem', fontSize: '0.8rem', fontWeight: 500 }}>{r.nombre || '(Vacío)'}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center', fontWeight: 'bold' }}>{r.raciones}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem', fontSize: '0.8rem', textAlign: 'center' }}>
                    {r.id_receta ? (
                      <span style={{ color: '#2e7d32', fontWeight: 'bold' }}>✓ Encontrada</span>
                    ) : (
                      <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>✗ No Registrada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botones de acción del formulario */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <Link href="/programas" className="btn" style={{ backgroundColor: '#6c757d', color: '#fff', textDecoration: 'none', padding: '0.4rem 1.2rem', borderRadius: '4px', border: 'none', fontSize: '0.85rem' }}>
          Cancelar
        </Link>
        <button
          type="submit"
          className="btn"
          disabled={isSaving}
          style={{ padding: '0.4rem 1.2rem', borderRadius: '4px', border: 'none', fontSize: '0.85rem', opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  );
}

'use client'

import { useState } from 'react';
import { createPrograma } from '@/app/actions';
import { useRouter } from 'next/navigation';

type Props = {
  turnos: { id_turno: number, nombre_turno: string }[];
  recetas: { id_receta: number, nombre_receta: string }[];
}

export default function ExcelPasteForm({ turnos, recetas }: Props) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState(turnos[0]?.id_turno.toString() || '');
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState<{ nombre: string, raciones: number, id_receta?: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteData(text);

    const rows = text.split('\n').filter(r => r.trim() !== '');
    const newParsed = rows.map(row => {
      // Intentar dividir por tabulación (copiado desde excel)
      const cols = row.split('\t');
      let nombre = cols[0] ? cols[0].trim() : '';
      let raciones = 0;
      
      if (cols.length > 1) {
        raciones = parseInt(cols[1].trim(), 10) || 0;
      }

      // Función auxiliar para limpiar strings (quita espacios y paréntesis)
      const cleanStr = (s: string) => s.replace(/[()\\s]/g, '').toLowerCase();

      // Buscar si la receta existe en la base de datos (ignorando paréntesis y espacios)
      const recetaFound = recetas.find(r => cleanStr(r.nombre_receta) === cleanStr(nombre));
      
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
    if (!fecha || !turno || parsedRows.length === 0) {
      alert("Por favor completa la fecha, turno y pega al menos una receta.");
      return;
    }

    const validRows = parsedRows.filter(r => r.id_receta && r.raciones > 0);
    if (validRows.length === 0) {
      alert("Ninguna receta válida fue identificada (o tienen 0 raciones).");
      return;
    }

    setIsSubmitting(true);
    try {
      const id = await createPrograma(fecha, parseInt(turno, 10), validRows as any);
      router.push(`/programas/${id}`);
    } catch (err: any) {
      console.error(err);
      alert("Error: " + (err?.message || "Ocurrió un problema de conexión con el servidor."));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Fecha:</label>
          <input 
            type="date" 
            value={fecha} 
            onChange={e => setFecha(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Turno:</label>
          <select 
            value={turno} 
            onChange={e => setTurno(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
            required
          >
            {turnos.map(t => (
              <option key={t.id_turno} value={t.id_turno}>{t.nombre_turno}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
          Pegar desde Excel (2 columnas: Nombre de Receta y Raciones)
        </label>
        <textarea 
          value={pasteData}
          onChange={handlePaste}
          placeholder="Ejemplo:&#10;(RB) POLLO CRISPY&#9;10&#10;(RB) ADOBO DE POLLO&#9;15"
          style={{ width: '100%', height: '150px', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace' }}
        />
      </div>

      {parsedRows.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Vista Previa de Recetas</h3>
          <table>
            <thead>
              <tr>
                <th>Receta Identificada</th>
                <th>Raciones</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((r, i) => (
                <tr key={i}>
                  <td>{r.nombre}</td>
                  <td>{r.raciones}</td>
                  <td>
                    {r.id_receta ? (
                      <span style={{ color: 'green', fontWeight: 'bold' }}>✓ Encontrada</span>
                    ) : (
                      <span style={{ color: 'red', fontWeight: 'bold' }}>✗ No existe en BD</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button type="submit" className="btn" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Crear Programa'}
      </button>
    </form>
  );
}

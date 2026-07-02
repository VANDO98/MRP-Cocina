'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DeleteProgramaButton from '@/components/DeleteProgramaButton';

const SvgPrint = () => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: '0.95em', height: '0.95em', marginRight: '0.35rem', display: 'inline-block', verticalAlign: 'middle' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.816a1.175 1.175 0 0 1 .167-1.031 3.12 3.12 0 0 0 0-3.57 1.175 1.175 0 0 1-.167-1.031 11.242 11.242 0 0 0-2.81-5.655 1.175 1.175 0 0 1-.037-1.579l.263-.263a1.175 1.175 0 0 1 1.585-.038 11.293 11.293 0 0 0 14.108 0 1.175 1.175 0 0 1 1.585.038l.263.263a1.175 1.175 0 0 1-.038 1.579 11.286 11.286 0 0 0-2.81 5.655 1.175 1.175 0 0 1-.167 1.03 3.12 3.12 0 0 0 0 3.57 1.175 1.175 0 0 1 .167 1.031 11.242 11.242 0 0 0 2.81 5.656 1.175 1.175 0 0 1 .038 1.579l-.263.263a1.175 1.175 0 0 1-1.585.038 11.293 11.293 0 0 0-14.108 0 1.175 1.175 0 0 1-1.585-.038l-.263-.263a1.175 1.175 0 0 1 .038-1.579 11.286 11.286 0 0 0 2.81-5.656Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  </svg>
);

function getTurnoBadgeClass(nombre: string) {
  const n = nombre.toUpperCase();
  if (n.includes('DESAYUNO') && n.includes('ALMUERZO')) return 'badge-turno badge-turno-consolidado';
  if (n.includes('DESAYUNO')) return 'badge-turno badge-turno-desayuno';
  if (n.includes('ALMUERZO')) return 'badge-turno badge-turno-almuerzo';
  if (n.includes('CENA')) return 'badge-turno badge-turno-cena';
  return 'badge-turno badge-turno-default';
}

type ProgRow = {
  id_programa: string;
  fecha: string;
  nombre_turno: string;
  cant_recetas: number;
};

type Props = {
  fechasOrdenadas: string[];
  porFecha: Record<string, ProgRow[]>;
};

export default function ProgramasListClient({ fechasOrdenadas, porFecha }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(7); // Mostramos 7 días por defecto (una semana)

  // Filtrar fechas basadas en el término de búsqueda
  const filteredFechas = useMemo(() => {
    if (!searchTerm.trim()) return fechasOrdenadas;
    const term = searchTerm.toLowerCase();
    
    return fechasOrdenadas.filter(fecha => {
      // Formateamos la fecha para poder buscar cosas como "15 junio" o "lunes"
      const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).toLowerCase();
      
      return fechaDisplay.includes(term) || fecha.includes(term);
    });
  }, [fechasOrdenadas, searchTerm]);

  // Paginación "Ver más"
  const visibleFechas = filteredFechas.slice(0, visibleCount);
  const hasMore = visibleFechas.length < filteredFechas.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 7);
  };

  return (
    <div>
      {/* ── BARRA DE BÚSQUEDA ── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por día, fecha o mes (ej. Lunes, 15 junio)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-subtle)', outline: 'none' }}
          />
        </div>
      </div>

      {filteredFechas.length === 0 ? (
        <div className="empty-state">
          No se encontraron programas para la búsqueda "{searchTerm}".
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {visibleFechas.map(fecha => {
            const programasDeFecha = porFecha[fecha];
            const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <div key={fecha} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      textTransform: 'capitalize',
                    }}>
                      {fechaDisplay}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}>
                      {programasDeFecha.length} turno{programasDeFecha.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link
                    href={`/programas/dia/${fecha}`}
                    className="btn-outline"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.85rem', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <SvgPrint /> Imprimir día
                  </Link>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>ID</th>
                      <th>Turno</th>
                      <th style={{ textAlign: 'center', width: '110px' }}>Recetas</th>
                      <th style={{ width: '300px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programasDeFecha.map(prog => {
                      return (
                        <tr key={prog.id_programa}>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              #{prog.id_programa}
                            </span>
                          </td>
                          <td>
                            <span className={getTurnoBadgeClass(prog.nombre_turno)}>
                              {prog.nombre_turno}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{prog.cant_recetas}</span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginLeft: '0.2rem' }}>recetas</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <Link href={`/programas/${prog.id_programa}`} className="btn-action">
                                📊 Consolidado
                              </Link>
                              <Link href={`/programas/${prog.id_programa}/editar`} className="btn-action btn-action-edit">
                                ✏️ Editar
                              </Link>
                              <DeleteProgramaButton id_programa={prog.id_programa} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
      
      {hasMore && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={handleLoadMore} 
            className="btn-outline" 
            style={{ width: '100%', maxWidth: '300px', padding: '0.7rem' }}
          >
            Cargar más días ↓
          </button>
        </div>
      )}
    </div>
  );
}

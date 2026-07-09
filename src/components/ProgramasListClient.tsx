'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DeleteProgramaButton from '@/components/DeleteProgramaButton';

// Icono de impresora para imprimir día
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
  estado: string;
};

type Props = {
  programas: ProgRow[];
};

export default function ProgramasListClient({ programas }: Props) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('TODOS');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selección individual/masiva de filas (estilo ERP)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // Resetear filtros
  const handleResetFilters = () => {
    setSearchTerm('');
    setFechaInicio('');
    setFechaFin('');
    setTurnoFilter('TODOS');
    setEstadoFilter('TODOS');
    setCurrentPage(1);
  };

  // Obtener turnos únicos para el filtro
  const turnosUnicos = useMemo(() => {
    const set = new Set(programas.map(p => p.nombre_turno));
    return ['TODOS', ...Array.from(set)];
  }, [programas]);

  // Filtrado de programas
  const filteredProgramas = useMemo(() => {
    return programas.filter(p => {
      // 1. Buscador (por ID o por fecha textual)
      const term = searchTerm.toLowerCase();
      const matchSearch = !term || 
        p.id_programa.toLowerCase().includes(term) ||
        p.fecha.includes(term) ||
        p.nombre_turno.toLowerCase().includes(term);

      // 2. Filtro de Fechas (Rango)
      const matchFechaInicio = !fechaInicio || p.fecha >= fechaInicio;
      const matchFechaFin = !fechaFin || p.fecha <= fechaFin;

      // 3. Filtro de Turno
      const matchTurno = turnoFilter === 'TODOS' || p.nombre_turno === turnoFilter;

      // 4. Filtro de Estado
      const matchEstado = estadoFilter === 'TODOS' || 
        (estadoFilter === 'CERRADO' && p.estado === 'Cerrado') ||
        (estadoFilter === 'ABIERTO' && p.estado === 'Abierto');

      return matchSearch && matchFechaInicio && matchFechaFin && matchTurno && matchEstado;
    });
  }, [programas, searchTerm, fechaInicio, fechaFin, turnoFilter, estadoFilter]);

  // Paginación de datos filtrados
  const totalPages = Math.ceil(filteredProgramas.length / itemsPerPage) || 1;
  
  // Si los filtros reducen la cantidad de páginas y la página actual queda fuera
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProgramas = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return filteredProgramas.slice(start, start + itemsPerPage);
  }, [filteredProgramas, safeCurrentPage]);

  // Manejo de checkboxes
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    const newSelected: Record<string, boolean> = {};
    if (checked) {
      paginatedProgramas.forEach(p => {
        newSelected[p.id_programa] = true;
      });
    }
    setSelectedIds(newSelected);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const isAllSelected = paginatedProgramas.length > 0 && paginatedProgramas.every(p => selectedIds[p.id_programa]);

  // Formateador de fecha local rápida
  const formatFechaLocal = (fechaStr: string) => {
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fechaStr;
  };

  return (
    <div>
      {/* ── SECCIÓN DE FILTROS ESTILO ERP (RESTAURAN.PE) ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          {/* Buscador general */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Buscar ID o Turno
            </label>
            <input 
              type="text" 
              placeholder="Ej. 2026-07-04 o Cena..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Rango de Fechas */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fecha Desde
            </label>
            <input 
              type="date" 
              value={fechaInicio}
              onChange={(e) => { setFechaInicio(e.target.value); setCurrentPage(1); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fecha Hasta
            </label>
            <input 
              type="date" 
              value={fechaFin}
              onChange={(e) => { setFechaFin(e.target.value); setCurrentPage(1); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          {/* Turno */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filtrar Turno
            </label>
            <select 
              value={turnoFilter} 
              onChange={(e) => { setTurnoFilter(e.target.value); setCurrentPage(1); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              {turnosUnicos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estado Registro
            </label>
            <select 
              value={estadoFilter} 
              onChange={(e) => { setEstadoFilter(e.target.value); setCurrentPage(1); }}
              className="input"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="TODOS">TODOS</option>
              <option value="ABIERTO">PENDIENTE (ABIERTO)</option>
              <option value="CERRADO">CERRADO (FINALIZADO)</option>
            </select>
          </div>

          {/* Botones Limpiar */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleResetFilters}
              className="btn btn-outline"
              style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              🧹 Limpiar
            </button>
          </div>

        </div>
      </div>

      {/* ── PANEL DE FILTROS ACTIVOS (Visualmente idéntico a ERP) ── */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 'var(--radius-md)',
        padding: '0.6rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.78rem',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        color: '#475569'
      }}>
        <strong style={{ color: '#1e293b' }}>Filtros habilitados:</strong>
        <span style={{ background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
          Fechas: {fechaInicio ? formatFechaLocal(fechaInicio) : 'Inicio'} al {fechaFin ? formatFechaLocal(fechaFin) : 'Fin'}
        </span>
        <span style={{ background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
          Turno: {turnoFilter}
        </span>
        <span style={{ background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
          Estado: {estadoFilter === 'TODOS' ? 'Todos' : estadoFilter === 'ABIERTO' ? 'Pendiente' : 'Cerrado'}
        </span>
        {searchTerm && (
          <span style={{ background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
            Búsqueda: "{searchTerm}"
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--text-primary)' }}>
          {filteredProgramas.length} registros encontrados
        </span>
      </div>

      {/* ── TABLA PLANA ESTILO ERP ── */}
      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
        <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ width: '45px', textAlign: 'center', padding: '0.75rem 1rem' }}>
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Código (ID)</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Fecha Producción</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Turno</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Cant. Platos</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700 }}>Estado</th>
              <th style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', textTransform: 'uppercase', color: '#475569', fontWeight: 700, textAlign: 'center', width: '380px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProgramas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                  Ningún programa coincide con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedProgramas.map(prog => {
                const isSelected = !!selectedIds[prog.id_programa];
                const dateObj = new Date(prog.fecha + 'T12:00:00');
                const weekday = dateObj.toLocaleDateString('es-PE', { weekday: 'short' });
                
                return (
                  <tr 
                    key={prog.id_programa}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? '#f1f5f9' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ textAlign: 'center', padding: '0.65rem 1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(prog.id_programa, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    
                    {/* ID */}
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                        #{prog.id_programa}
                      </span>
                    </td>
                    
                    {/* Fecha */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>
                      <Link 
                        href={`/programas/dia/${prog.fecha}`}
                        style={{ 
                          display: 'flex', 
                          gap: '0.35rem', 
                          alignItems: 'center', 
                          textDecoration: 'none', 
                          color: 'inherit',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        <span style={{ textTransform: 'capitalize', fontWeight: 600, color: '#64748b' }}>
                          {weekday}.
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          {formatFechaLocal(prog.fecha)}
                        </span>
                      </Link>
                    </td>
                    
                    {/* Turno */}
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span className={getTurnoBadgeClass(prog.nombre_turno)} style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                        {prog.nombre_turno}
                      </span>
                    </td>
                    
                    {/* Cant Recetas */}
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                      <span>{prog.cant_recetas} recetas</span>
                    </td>
                    
                    {/* Estado */}
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {prog.estado === 'Cerrado' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#d4edda',
                          color: '#155724',
                          border: '1px solid #c3e6cb'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#28a745' }} />
                          Cerrado
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          background: '#ffeeba',
                          color: '#856404',
                          border: '1px solid #ffeeba'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffc107' }} />
                          Pendiente
                        </span>
                      )}
                    </td>
                    
                    {/* Acciones */}
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        
                        <Link 
                          href={`/programas/dia/${prog.fecha}`} 
                          className="btn-action"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', background: '#f8fafc', borderColor: '#cbd5e1', fontWeight: 600 }}
                        >
                          📅 Consolidado Día
                        </Link>

                        <Link 
                          href={`/programas/${prog.id_programa}`} 
                          className="btn-action"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                        >
                          📊 Turno
                        </Link>
                        
                        <Link 
                          href={`/programas/dia/${prog.fecha}/valorizacion`} 
                          className="btn-action"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', background: 'var(--bg-muted)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                        >
                          💰 Valorizado
                        </Link>
                        
                        <Link 
                          href={`/programas/${prog.id_programa}/editar`} 
                          className="btn-action btn-action-edit"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                        >
                          ✏️ Editar
                        </Link>
                        
                        <DeleteProgramaButton id_programa={prog.id_programa} />
                      
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINACIÓN ESTILO ERP (RESTAURAN.PE) ── */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1.25rem',
          padding: '0 0.5rem',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <div>
            Mostrando {Math.min(filteredProgramas.length, (safeCurrentPage - 1) * itemsPerPage + 1)} a {Math.min(filteredProgramas.length, safeCurrentPage * itemsPerPage)} de {filteredProgramas.length} registros
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {/* Primero */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="btn-pagination"
              style={{
                padding: '0.3rem 0.6rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                background: '#fff',
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === 1 ? 0.5 : 1
              }}
            >
              Primera
            </button>
            
            {/* Anterior */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="btn-pagination"
              style={{
                padding: '0.3rem 0.6rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                background: '#fff',
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === 1 ? 0.5 : 1
              }}
            >
              Anterior
            </button>

            {/* Números de Página */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pNum = idx + 1;
              // Mostrar solo páginas adyacentes si hay demasiadas
              if (totalPages > 6 && Math.abs(pNum - safeCurrentPage) > 2 && pNum !== 1 && pNum !== totalPages) {
                if (pNum === 2 || pNum === totalPages - 1) {
                  return <span key={pNum} style={{ padding: '0.3rem 0.4rem', color: '#94a3b8' }}>...</span>;
                }
                return null;
              }

              return (
                <button
                  key={pNum}
                  onClick={() => setCurrentPage(pNum)}
                  className={`btn-pagination ${safeCurrentPage === pNum ? 'active' : ''}`}
                  style={{
                    padding: '0.3rem 0.65rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    background: safeCurrentPage === pNum ? '#2563eb' : '#fff',
                    color: safeCurrentPage === pNum ? '#fff' : '#0f172a',
                    fontWeight: safeCurrentPage === pNum ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Siguiente */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              className="btn-pagination"
              style={{
                padding: '0.3rem 0.6rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                background: '#fff',
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === totalPages ? 0.5 : 1
              }}
            >
              Siguiente
            </button>

            {/* Último */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="btn-pagination"
              style={{
                padding: '0.3rem 0.6rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                background: '#fff',
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === totalPages ? 0.5 : 1
              }}
            >
              Último
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

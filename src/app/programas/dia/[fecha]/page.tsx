import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';
import React from 'react';

export default async function DiaProgramasPage({ params }: { params: Promise<{ fecha: string }> }) {
  const { fecha } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound();

  // ── 1. Programas del día ordenados por turno ──────────────────────────────
  const programasDelDia = await db`
    SELECT p.id_programa, t.nombre_turno, t.id_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.fecha = ${fecha}
    ORDER BY t.id_turno ASC
  `;

  if (programasDelDia.length === 0) notFound();

  const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Lista de turnos ordenados (únicos, en orden del día)
  const turnos = programasDelDia.map(p => ({
    id_programa: p.id_programa as string,
    nombre_turno: p.nombre_turno as string,
  }));

  // ── 2. Traer todos los insumos con sus cantidades por programa ────────────
  const ids = turnos.map(t => t.id_programa);

  const despachos = await db`
    SELECT
      i.id_insumo,
      i.nombre_insumo,
      c.nombre_categoria AS categoria_insumo,
      u.simbolo,
      dc.id_programa,
      dc.cantidad_teorica_calculada                 AS cantidad_teorica,
      COALESCE(dc.cantidad_real_entregada, 0)       AS cantidad_real
    FROM Despacho_Consolidado dc
    JOIN Insumo i       ON dc.id_insumo  = i.id_insumo
    LEFT JOIN Categoria_Insumo c ON i.id_categoria_insumo = c.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    WHERE dc.id_programa = ANY(${ids})
    ORDER BY c.nombre_categoria ASC, i.nombre_insumo ASC
  `;

  // ── 3. Agrupar en JS ──────────────────────────────────────────────────────
  type FilaInsumo = {
    id_insumo: number;
    nombre_insumo: string;
    categoria_insumo: string;
    simbolo: string;
    total_teorico: number;
    total_real: number;
    por_turno: Record<string, number>; // nombre_turno → cantidad_teorica
  };

  const mapaInsumos: Record<number, FilaInsumo> = {};

  for (const d of despachos) {
    const id = d.id_insumo as number;
    const teo  = Number(d.cantidad_teorica);
    const real = Number(d.cantidad_real);

    // Encontrar qué turno corresponde a este programa
    const turno = turnos.find(t => t.id_programa === d.id_programa);
    const nombreTurno = turno?.nombre_turno ?? 'Desconocido';

    if (!mapaInsumos[id]) {
      mapaInsumos[id] = {
        id_insumo: id,
        nombre_insumo: d.nombre_insumo as string,
        categoria_insumo: (d.categoria_insumo as string) || 'Otros',
        simbolo: (d.simbolo as string) || '-',
        total_teorico: 0,
        total_real: 0,
        por_turno: {},
      };
    }

    mapaInsumos[id].total_teorico += teo;
    mapaInsumos[id].total_real    += real;
    mapaInsumos[id].por_turno[nombreTurno] =
      (mapaInsumos[id].por_turno[nombreTurno] ?? 0) + teo;
  }

  // Agrupar por categoría
  const agrupadoPorCategoria: Record<string, FilaInsumo[]> = {};
  for (const fila of Object.values(mapaInsumos)) {
    const cat = fila.categoria_insumo;
    if (!agrupadoPorCategoria[cat]) agrupadoPorCategoria[cat] = [];
    agrupadoPorCategoria[cat].push(fila);
  }

  const categoriasOrdenadas = Object.keys(agrupadoPorCategoria).sort((a, b) => a.localeCompare(b));
  
  // Ordenar alfabéticamente dentro de cada categoría y contar totales
  let totalInsumos = 0;

  categoriasOrdenadas.forEach(c => {
    agrupadoPorCategoria[c].sort((a, b) => a.nombre_insumo.localeCompare(b.nombre_insumo));
    totalInsumos += agrupadoPorCategoria[c].length;
  });

  // Nombres de turnos (columnas dinámicas)
  const nombresTurnos = turnos.map(t => t.nombre_turno);

  return (
    <div>
      {/* ── CONTROLES — solo pantalla ─────────────────────────────────────── */}
      <div className="no-print" style={{
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div>
          <Link href="/programas" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>
            ← Volver a Programas
          </Link>
          <h1 style={{ marginTop: '0.5rem' }}>Consolidado de <em>Insumos</em></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'capitalize' }}>
            {fechaDisplay} · {turnos.length} turno{turnos.length !== 1 ? 's' : ''} · {totalInsumos} insumos
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/programas/dia/${fecha}/valorizacion`} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontSize: '0.72rem', padding: '0.3rem 0.85rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
            💰 Reporte de Valorización
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* ── CABECERA IMPRIMIBLE ───────────────────────────────────────────── */}
      <div style={{
        borderBottom: '3px solid var(--text-primary)',
        paddingBottom: '0.6rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <p style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.2rem',
          }}>
            MRP Cocina · Consolidado de Requerimiento de Insumos
          </p>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1.4rem', textTransform: 'capitalize',
          }}>
            {fechaDisplay}
          </h2>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 2 }}>
          {turnos.map(t => (
            <div key={t.id_programa}>
              <strong>{t.nombre_turno}</strong> · Prog. {t.id_programa}
            </div>
          ))}
        </div>
      </div>

      {/* ── TABLA DE CONSOLIDADO ─────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: '200px' }}>INSUMO (UNIDAD)</th>
              <th style={{ textAlign: 'center', background: '#1a1a2e', color: '#fff', minWidth: '110px' }}>
                TOTAL CONSOLIDADO
              </th>
              <th style={{ textAlign: 'center', minWidth: '110px' }}>TOTAL ENTREGADO</th>
              {nombresTurnos.map(turno => (
                <th
                  key={turno}
                  style={{
                    textAlign: 'center',
                    minWidth: '100px',
                    background: turno.toLowerCase().includes('cena') ? '#2d1b00' : '#fff7ed',
                    color: turno.toLowerCase().includes('cena') ? '#fff' : 'var(--accent)',
                  }}
                >
                  {turno.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categoriasOrdenadas.map((cat) => (
              <React.Fragment key={cat}>
                {/* Cabecera de Categoría */}
                <tr style={{ background: '#f8f9fa' }}>
                  <td colSpan={3 + nombresTurnos.length} style={{ 
                    fontWeight: 700, 
                    fontSize: '11px', 
                    color: 'var(--accent)',
                    padding: '0.5rem 0.4rem',
                    textTransform: 'uppercase',
                    borderBottom: '2px solid var(--border-medium)'
                  }}>
                    {cat}
                  </td>
                </tr>
                {/* Filas de Insumos */}
                {agrupadoPorCategoria[cat].map((fila, idx) => {
                  const totalTeo  = fila.total_teorico;
                  const totalReal = fila.total_real;
                  const isAlternate = idx % 2 === 1;

                  return (
                    <tr
                      key={fila.id_insumo}
                      style={{ background: isAlternate ? 'var(--bg-muted)' : 'var(--bg-surface)' }}
                    >
                      <td style={{ fontWeight: 500, fontSize: '11px', paddingLeft: '1rem' }}>
                        {fila.nombre_insumo.toUpperCase()}
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '0.3rem' }}>
                          ({fila.simbolo})
                        </span>
                      </td>
                      <td style={{
                        textAlign: 'center', fontWeight: 700, fontSize: '11px',
                        background: isAlternate ? '#eef0f8' : '#f5f6fc',
                        color: '#1a1a2e',
                      }}>
                        {totalTeo > 0 ? totalTeo.toFixed(3).replace(/\.?0+$/, '') : '0'}
                      </td>
                      <td style={{
                        textAlign: 'center', fontSize: '11px',
                        color: totalReal > 0 ? 'var(--success)' : 'var(--text-tertiary)',
                        fontWeight: totalReal > 0 ? 600 : 400,
                      }}>
                        {totalReal > 0 ? totalReal.toFixed(3).replace(/\.?0+$/, '') : '0'}
                      </td>
                      {nombresTurnos.map(turno => {
                        const val = fila.por_turno[turno] ?? 0;
                        return (
                          <td
                            key={turno}
                            style={{
                              textAlign: 'center',
                              fontSize: '11px',
                              fontWeight: val > 0 ? 500 : 400,
                              color: val > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)',
                              background: val > 0
                                ? (turno.toLowerCase().includes('cena')
                                  ? (isAlternate ? '#fff3e0' : '#fffbf5')
                                  : 'transparent')
                                : 'transparent',
                            }}
                          >
                            {val > 0 ? val.toFixed(3).replace(/\.?0+$/, '') : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── FIRMAS ───────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: '2rem',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '1rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '2rem',
        fontSize: '0.72rem',
        color: 'var(--text-tertiary)',
      }}>
        {['Jefe de Cocina', 'Almacén / Despacho', 'Supervisión'].map(firma => (
          <div key={firma}>
            <div style={{ borderBottom: '1px solid var(--border-medium)', marginBottom: '0.3rem', height: '2rem' }} />
            <span>{firma}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

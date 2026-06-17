'use client';

import { useState } from 'react';
import DespachoInput from './DespachoInput';
import RacionesProducidasInput from './RacionesProducidasInput';
import DespachoDiarioInput from './DespachoDiarioInput';

type Insumo = {
  id_insumo: number;
  nombre_insumo: string;
  id_categoria_insumo: number;
  simbolo: string;
  total_teorico: number;
  total_real: number | null;
};

type Receta = {
  id_receta: number;
  nombre_receta: string;
  raciones_programadas: number;
  raciones_producidas: number | null;
};

type DespachoDiario = {
  id_insumo: number;
  nombre_insumo: string;
  simbolo: string;
  total_teorico_dia: number;
  total_real_dia: number;
  desgloses: {
    id_programa: string;
    nombre_turno: string;
    cantidad_teorica: number;
    cantidad_real: number;
  }[];
};

type Props = {
  programa: any;
  recetasProgramadas: Receta[];
  insumos: Insumo[];
  mapCruces: Record<number, Record<number, number>>;
  despachosDiarios: DespachoDiario[];
};

export default function PivotTableClient({ programa, recetasProgramadas, insumos, mapCruces, despachosDiarios }: Props) {
  const [mostrarProteinas, setMostrarProteinas] = useState(true);
  const [mostrarAbarrotes, setMostrarAbarrotes] = useState(true);
  const [vista, setVista] = useState<'pivot' | 'consumo' | 'diario'>('pivot');

  const filteredInsumos = insumos.filter(i => {
    const isProteinaVerdura = [2, 3, 4, 10].includes(i.id_categoria_insumo);
    if (isProteinaVerdura) return mostrarProteinas;
    return mostrarAbarrotes;
  });

  // Preparar filas para la tabla plana de consumos agrupadas por receta
  const filasConsumo: any[] = [];
  for (const rp of recetasProgramadas) {
    for (const insumo of filteredInsumos) {
      const totalTeorico = insumo.total_teorico;
      const totalReal = insumo.total_real !== null ? insumo.total_real : 0; // Usar 0 si es null

      const cantidadUnitaria = mapCruces[insumo.id_insumo]?.[rp.id_receta] 
        ? mapCruces[insumo.id_insumo][rp.id_receta] / rp.raciones_programadas 
        : 0;

      if (cantidadUnitaria > 0) {
        const cantidadRequerida = cantidadUnitaria * rp.raciones_programadas;
        
        // Entregado proporcional: requerida * (totalReal / totalTeorico)
        const factor = totalTeorico > 0 ? (totalReal / totalTeorico) : 0;
        const entregadoProporcional = cantidadRequerida * factor;

        // Ratio Real: proporcional / racionesProducidas
        const racionesProducidas = rp.raciones_producidas !== null ? rp.raciones_producidas : 0;
        const ratioReal = racionesProducidas > 0 ? (entregadoProporcional / racionesProducidas) : 0;

        filasConsumo.push({
          fecha: programa.fecha,
          codigo: programa.id_programa,
          turno: programa.nombre_turno,
          receta: rp.nombre_receta,
          insumo: `${insumo.nombre_insumo} (${insumo.simbolo || '-'})`,
          cantidadRequerida,
          entregadoProporcional,
          ratioReal
        });
      }
    }
  }

  const copiarAlPortapapeles = () => {
    const encabezados = ['Fecha', 'Codigo', 'Turno', 'Receta', 'Insumo', 'Cantidad Requerida', 'Entregado proporcional', 'Ratio Real'];
    const lineas = [encabezados.join('\t')];
    
    filasConsumo.forEach(f => {
      lineas.push([
        f.fecha,
        f.codigo,
        f.turno,
        f.receta,
        f.insumo,
        f.cantidadRequerida.toFixed(6).replace(/\.?0+$/, ''),
        f.entregadoProporcional.toFixed(6).replace(/\.?0+$/, ''),
        f.ratioReal.toFixed(6).replace(/\.?0+$/, '')
      ].join('\t'));
    });

    navigator.clipboard.writeText(lineas.join('\n'));
    alert('¡Tabla copiada al portapapeles! Ya puedes pegarla en Excel con Ctrl+V.');
  };

  return (
    <div>
      {/* Selector de vistas minimalista estilo pestañas de Excel */}
      <div className="no-print" style={{ display: 'flex', gap: '0.2rem', marginBottom: '1rem', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={() => setVista('pivot')} 
          style={{ 
            padding: '0.5rem 1.2rem', 
            cursor: 'pointer', 
            border: '1px solid #ddd',
            borderBottom: vista === 'pivot' ? '2px solid var(--primary-color)' : '1px solid transparent',
            background: vista === 'pivot' ? '#fff' : '#f9f9f9', 
            color: vista === 'pivot' ? 'var(--primary-color)' : '#666',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            position: 'relative',
            bottom: '-1px'
          }}
        >
          📊 Tabla Dinámica (Consolidado)
        </button>
        <button 
          onClick={() => setVista('diario')} 
          style={{ 
            padding: '0.5rem 1.2rem', 
            cursor: 'pointer', 
            border: '1px solid #ddd',
            borderBottom: vista === 'diario' ? '2px solid var(--primary-color)' : '1px solid transparent',
            background: vista === 'diario' ? '#fff' : '#f9f9f9', 
            color: vista === 'diario' ? 'var(--primary-color)' : '#666',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            position: 'relative',
            bottom: '-1px'
          }}
        >
          🥦 Proteínas y Verduras (Día Completo)
        </button>
        <button 
          onClick={() => setVista('consumo')} 
          style={{ 
            padding: '0.5rem 1.2rem', 
            cursor: 'pointer', 
            border: '1px solid #ddd',
            borderBottom: vista === 'consumo' ? '2px solid var(--primary-color)' : '1px solid transparent',
            background: vista === 'consumo' ? '#fff' : '#f9f9f9', 
            color: vista === 'consumo' ? 'var(--primary-color)' : '#666',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            position: 'relative',
            bottom: '-1px'
          }}
        >
          📋 Cálculo de Consumo (Plano para Excel)
        </button>
      </div>

      {/* Controles de filtros e impresion mas limpios */}
      <div className="no-print" style={{ marginBottom: '1.2rem', padding: '0.6rem 0.8rem', backgroundColor: '#fcfbfa', border: '1px solid #e8e6e3', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {vista !== 'diario' ? (
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#4e3629', fontSize: '0.85rem' }}>FILTRAR INSUMOS:</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', color: '#333' }}>
              <input
                type="checkbox"
                checked={mostrarProteinas}
                onChange={e => setMostrarProteinas(e.target.checked)}
                style={{ accentColor: 'var(--primary-color)' }}
              />
              Proteínas y Verduras
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', color: '#333' }}>
              <input
                type="checkbox"
                checked={mostrarAbarrotes}
                onChange={e => setMostrarAbarrotes(e.target.checked)}
                style={{ accentColor: 'var(--primary-color)' }}
              />
              Abarrotes, Lácteos, etc.
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#2e7d32', fontSize: '0.85rem' }}>Consolidado de Proteínas y Verduras de la fecha: {programa.fecha}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {vista === 'consumo' && (
            <button className="btn" onClick={copiarAlPortapapeles} style={{ backgroundColor: '#2e7d32', padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}>
              📋 Copiar para Excel
            </button>
          )}
          <button className="btn" onClick={() => window.print()} style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}>
            🖨️ Imprimir a PDF
          </button>
        </div>
      </div>

      {vista === 'pivot' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: '1000px', borderCollapse: 'collapse' }}>
            <thead>
              {/* Fila: Estimado de Raciones */}
              <tr>
                <th></th>
                <th style={{ backgroundColor: '#f1f8f3', color: '#2e7d32', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ddd' }}>RACIONES EST.:</th>
                <th style={{ backgroundColor: '#fffcf7', color: '#4e3629', textAlign: 'center', border: '1px solid #ddd' }}></th>
                {recetasProgramadas.map(rp => (
                  <th key={rp.id_receta} style={{ backgroundColor: '#f5f5f5', color: '#444', textAlign: 'center', fontWeight: 'normal', fontSize: '0.8rem', border: '1px solid #ddd' }}>
                    {rp.raciones_programadas}
                  </th>
                ))}
              </tr>
              {/* Fila: Real Producido (Editores) */}
              <tr>
                <th></th>
                <th style={{ backgroundColor: '#f0f4f8', color: '#1d3557', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ddd' }}>REAL PRODUCIDO:</th>
                <th style={{ backgroundColor: '#fffcf7', color: '#4e3629', textAlign: 'center', border: '1px solid #ddd' }}></th>
                {recetasProgramadas.map(rp => (
                  <th key={rp.id_receta} style={{ backgroundColor: '#f7fafc', textAlign: 'center', padding: '0.2rem', border: '1px solid #ddd' }}>
                    <RacionesProducidasInput 
                      id_programa={programa.id_programa}
                      id_receta={rp.id_receta}
                      racionesProgramadas={rp.raciones_programadas}
                      valorInicial={rp.raciones_producidas}
                    />
                  </th>
                ))}
              </tr>
              {/* Fila: Nombres de columnas */}
              <tr>
                <th style={{ backgroundColor: '#eee', color: '#333', fontSize: '0.8rem', border: '1px solid #ddd' }}>INSUMO (UNIDAD)</th>
                <th style={{ backgroundColor: '#f1f8f3', color: '#2e7d32', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd' }}>TOTAL CONSOLIDADO</th>
                <th style={{ backgroundColor: '#fff5f5', color: '#c62828', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd' }}>TOTAL ENTREGADO</th>
                {recetasProgramadas.map(rp => (
                  <th key={rp.id_receta} style={{ backgroundColor: '#eee', color: '#333', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rp.nombre_receta}>
                    {rp.nombre_receta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInsumos.map(insumo => (
                <tr key={insumo.id_insumo}>
                  <td style={{ fontWeight: 600, border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}>{insumo.nombre_insumo} ({insumo.simbolo || '-'})</td>
                  <td style={{ backgroundColor: '#fcfdfd', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '0.85rem' }}>
                    {insumo.total_teorico.toFixed(4).replace(/\.?0+$/, '')}
                  </td>
                  <td style={{ padding: '0.15rem 0.3rem', border: '1px solid #ddd' }}>
                    <DespachoInput id_programa={programa.id_programa} id_insumo={insumo.id_insumo} valorInicial={insumo.total_real} />
                  </td>
                  {recetasProgramadas.map(rp => {
                    const valor = mapCruces[insumo.id_insumo]?.[rp.id_receta];
                    return (
                      <td key={rp.id_receta} style={{ textAlign: 'center', color: '#888', border: '1px solid #eee', fontSize: '0.8rem', padding: '0.3rem' }}>
                        {valor ? valor.toFixed(4).replace(/\.?0+$/, '') : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredInsumos.length === 0 && (
                <tr>
                  <td colSpan={recetasProgramadas.length + 3} style={{ textAlign: 'center', padding: '2rem' }}>
                    No hay insumos en esta categoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'diario' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#fdfbf7', borderBottom: '2px solid #ddd' }}>
                <th style={{ border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'left' }}>Insumo (Unidad)</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'right', width: '180px' }}>Teórico Requerido Día</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'center', width: '180px' }}>Total Entregado Día</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.5rem', textAlign: 'left' }}>Prorrateo / Distribución por Turno</th>
              </tr>
            </thead>
            <tbody>
              {despachosDiarios.map(dd => (
                <tr key={dd.id_insumo} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ fontWeight: 600, border: '1px solid #ddd', padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}>
                    {dd.nombre_insumo} ({dd.simbolo})
                  </td>
                  <td style={{ textAlign: 'right', border: '1px solid #ddd', padding: '0.4rem 0.5rem', fontSize: '0.85rem', backgroundColor: '#fcfdfd' }}>
                    {dd.total_teorico_dia.toFixed(4).replace(/\.?0+$/, '')}
                  </td>
                  <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '0.2rem 0.5rem', backgroundColor: '#fffdf9' }}>
                    <DespachoDiarioInput 
                      fecha={programa.fecha} 
                      id_insumo={dd.id_insumo} 
                      valorInicial={dd.total_real_dia} 
                    />
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '0.4rem 0.5rem', fontSize: '0.8rem', color: '#555' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {dd.desgloses.map((dg, idx) => (
                        <span key={idx} style={{ backgroundColor: '#f5f5f5', padding: '0.15rem 0.4rem', borderRadius: '3px', border: '1px solid #e2d9cd' }}>
                          <strong>{dg.nombre_turno}:</strong> {dg.cantidad_real.toFixed(4).replace(/\.?0+$/, '')} {dd.simbolo} 
                          <span style={{ color: '#888', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                            (Teo: {dg.cantidad_teorica.toFixed(4).replace(/\.?0+$/, '')})
                          </span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {despachosDiarios.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    No hay insumos de proteínas o verduras registrados para los programas de esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'consumo' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Fecha</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Código</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Turno</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Receta</th>
                <th style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Insumo</th>
                <th style={{ textAlign: 'right', border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Cantidad Requerida</th>
                <th style={{ textAlign: 'right', border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Entregado proporcional</th>
                <th style={{ textAlign: 'right', border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.4rem' }}>Ratio Real</th>
              </tr>
            </thead>
            <tbody>
              {filasConsumo.map((f, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem' }}>{f.fecha}</td>
                  <td style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem' }}>{f.codigo}</td>
                  <td style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem' }}>{f.turno}</td>
                  <td style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem', fontWeight: 600 }}>{f.receta}</td>
                  <td style={{ border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem' }}>{f.insumo}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem' }}>{f.cantidadRequerida.toFixed(4).replace(/\.?0+$/, '')}</td>
                  <td style={{ textAlign: 'right', border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem', fontWeight: 'bold', backgroundColor: f.entregadoProporcional > 0 ? '#fdfbeb' : '#fafafa', color: f.entregadoProporcional > 0 ? '#000' : '#888' }}>
                    {f.entregadoProporcional > 0 ? f.entregadoProporcional.toFixed(4).replace(/\.?0+$/, '') : '0'}
                  </td>
                  <td style={{ textAlign: 'right', border: '1px solid #ddd', fontSize: '0.8rem', padding: '0.3rem 0.4rem', fontWeight: 'bold', backgroundColor: f.ratioReal > 0 ? '#f4fbf7' : '#fafafa', color: f.ratioReal > 0 ? '#0f5132' : '#888' }}>
                    {f.ratioReal > 0 ? f.ratioReal.toFixed(6).replace(/\.?0+$/, '') : '-'}
                  </td>
                </tr>
              ))}
              {filasConsumo.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    No hay consumos que calcular con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import DespachoInput from './DespachoInput';
import RacionesProducidasInput from './RacionesProducidasInput';
import DespachoDiarioInput from './DespachoDiarioInput';
import * as XLSX from 'xlsx-js-style';

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

const getTurnoLogico = (nombreReceta: string): string => {
  const nombre = nombreReceta.trim().toUpperCase();
  if (nombre.startsWith('BF') || nombre.startsWith('DESAYUNO') || nombre.startsWith('DES')) return 'Desayuno';
  if (nombre.startsWith('RB') || nombre.startsWith('ALMUERZO') || nombre.startsWith('ALM') || nombre.startsWith('LN')) return 'Almuerzo';
  if (nombre.startsWith('CN') || nombre.startsWith('CENA') || nombre.startsWith('CEN')) return 'Cena';
  return 'Otros';
};

export default function PivotTableClient({ programa, recetasProgramadas, insumos, mapCruces, despachosDiarios }: Props) {
  const [mostrarProteinas, setMostrarProteinas] = useState(true);
  const [mostrarAbarrotes, setMostrarAbarrotes] = useState(true);
  const [vista, setVista] = useState<'pivot' | 'diario' | 'consumo' | 'raciones'>('pivot');

  // Clasificar recetas por turno lógico
  const recetasConTurno = recetasProgramadas.map(rp => ({
    ...rp,
    turnoLogico: getTurnoLogico(rp.nombre_receta)
  }));

  // Obtener lista de turnos lógicos activos
  const turnosActivosSet = new Set<string>();
  recetasConTurno.forEach(rp => {
    turnosActivosSet.add(rp.turnoLogico);
  });
  const ordenTurnos = ['Desayuno', 'Almuerzo', 'Cena', 'Otros'];
  const turnosActivos = ordenTurnos.filter(t => turnosActivosSet.has(t));
  turnosActivosSet.forEach(t => {
    if (!turnosActivos.includes(t)) {
      turnosActivos.push(t);
    }
  });

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

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();
    const data: any[][] = [];

    // Encabezados informativos iniciales
    data.push([`CONSOLIDADO DE PRODUCTOS - PROGRAMA: ${programa.id_programa}`]);
    data.push([`Fecha: ${programa.fecha}`, `Turno General: ${programa.nombre_turno}`]);
    data.push([]); // Fila vacía para separar

    // Fila 4: Encabezados de columnas de Excel
    const filaEncabezados = ['INSUMO (UNIDAD)', 'TOTAL CONSOLIDADO', 'TOTAL ENTREGADO'];
    turnosActivos.forEach(t => {
      filaEncabezados.push(t.toUpperCase());
    });
    data.push(filaEncabezados);

    // Filas de insumos
    filteredInsumos.forEach(insumo => {
      // Calcular la cantidad requerida por cada turno activo
      const cantidadesPorTurno: Record<string, number> = {};
      turnosActivos.forEach(t => {
        cantidadesPorTurno[t] = 0;
      });

      recetasConTurno.forEach(rp => {
        const valor = mapCruces[insumo.id_insumo]?.[rp.id_receta];
        if (valor) {
          cantidadesPorTurno[rp.turnoLogico] += valor;
        }
      });

      const fila = [
        `${insumo.nombre_insumo} (${insumo.simbolo || '-'})`,
        Number(insumo.total_teorico.toFixed(4)),
        insumo.total_real !== null ? Number(insumo.total_real) : 0
      ];

      turnosActivos.forEach(t => {
        const valorTurno = cantidadesPorTurno[t];
        fila.push(valorTurno > 0 ? Number(valorTurno.toFixed(4)) : '');
      });

      data.push(fila);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Aplicar estilos visuales a cada celda de Excel usando xlsx-js-style
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;

        // Estilo básico de borde y fuente para todas las celdas del Excel
        ws[cell_ref].s = {
          font: { name: 'Arial', size: 9 },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } }
          }
        };

        // Fila 1: Título Principal
        if (R === 0) {
          ws[cell_ref].s = {
            ...ws[cell_ref].s,
            font: { name: 'Arial', size: 12, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4A3B32' } }, // Marrón oscuro de la cabecera
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }

        // Fila 2: Fecha y Turno General
        if (R === 1) {
          ws[cell_ref].s = {
            ...ws[cell_ref].s,
            font: { name: 'Arial', size: 10, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '795548' } }, // Marrón de turno
            alignment: { horizontal: 'left', vertical: 'center' }
          };
        }

        // Fila 4: Encabezados de Columnas de la Tabla (R = 3)
        if (R === 3) {
          let bgCol = 'EAEAEA'; // Gris medio para columnas
          let textCol = '333333';

          if (C === 0) bgCol = 'D6E4D0'; // Verde grisáceo para Insumo
          else if (C === 1) bgCol = 'C6E0B4'; // Verde para Total Consolidado
          else if (C === 2) bgCol = 'F8CBAD'; // Naranja/Rojo suave para Total Entregado
          else {
            const turnoNombre = filaEncabezados[C].toUpperCase();
            if (turnoNombre.includes('DESAYUNO')) bgCol = 'FFF2CC'; // Amarillo suave
            else if (turnoNombre.includes('ALMUERZO')) bgCol = 'DDEBF7'; // Azul suave
            else if (turnoNombre.includes('CENA')) bgCol = 'E1D5E7'; // Púrpura suave
          }

          ws[cell_ref].s = {
            ...ws[cell_ref].s,
            font: { name: 'Arial', size: 9, bold: true, color: { rgb: textCol } },
            fill: { fgColor: { rgb: bgCol } },
            alignment: { horizontal: C === 0 ? 'left' : 'center', vertical: 'center' }
          };
        }

        // Filas de Datos (R >= 4)
        if (R >= 4) {
          ws[cell_ref].s.alignment = {
            horizontal: C === 0 ? 'left' : 'right',
            vertical: 'center'
          };

          // Columna de Total Consolidado con fondo verde muy sutil
          if (C === 1) {
            ws[cell_ref].s.fill = { fgColor: { rgb: 'F2F7F2' } };
          }
          // Columna de Total Entregado con fondo rojo muy sutil
          if (C === 2) {
            ws[cell_ref].s.fill = { fgColor: { rgb: 'FFF6F6' } };
          }
        }
      }
    }

    // Dar anchos automáticos y holgados a las columnas de Excel
    const wscols = [
      { wch: 38 }, // Insumo (Unidad)
      { wch: 20 }, // Total Consolidado
      { wch: 20 }, // Total Entregado
    ];
    turnosActivos.forEach(() => {
      wscols.push({ wch: 15 }); // Cada columna de turno
    });
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');
    XLSX.writeFile(wb, `Consolidado_${programa.id_programa}.xlsx`);
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
        <button 
          onClick={() => setVista('raciones')} 
          style={{ 
            padding: '0.5rem 1.2rem', 
            cursor: 'pointer', 
            border: '1px solid #ddd',
            borderBottom: vista === 'raciones' ? '2px solid var(--primary-color)' : '1px solid transparent',
            background: vista === 'raciones' ? '#fff' : '#f9f9f9', 
            color: vista === 'raciones' ? 'var(--primary-color)' : '#666',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            position: 'relative',
            bottom: '-1px'
          }}
        >
          📝 Registrar Real Producido
        </button>
      </div>

      {/* Controles de filtros e impresion mas limpios */}
      <div className="no-print" style={{ marginBottom: '1.2rem', padding: '0.6rem 0.8rem', backgroundColor: '#fcfbfa', border: '1px solid #e8e6e3', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {vista !== 'diario' && vista !== 'raciones' ? (
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
          {vista === 'pivot' && (
            <button className="btn" onClick={exportarExcel} style={{ backgroundColor: '#1f6f43', padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}>
              📥 Descargar Excel
            </button>
          )}
          <button className="btn" onClick={() => window.print()} style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }}>
            🖨️ Imprimir a PDF
          </button>
        </div>
      </div>

      {vista === 'pivot' && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ backgroundColor: '#eee', color: '#333', fontSize: '0.8rem', border: '1px solid #ddd' }}>INSUMO (UNIDAD)</th>
                  <th style={{ backgroundColor: '#f1f8f3', color: '#2e7d32', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', width: '150px' }}>TOTAL CONSOLIDADO</th>
                  <th style={{ backgroundColor: '#fff5f5', color: '#c62828', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', width: '150px' }}>TOTAL ENTREGADO</th>
                  {turnosActivos.map(t => (
                    <th key={t} style={{ backgroundColor: '#eee', color: '#333', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', width: '120px' }}>
                      {t.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInsumos.map(insumo => {
                  // Calcular cantidades por turno para este insumo
                  const cantidadesPorTurno: Record<string, number> = {};
                  turnosActivos.forEach(t => {
                    cantidadesPorTurno[t] = 0;
                  });

                  recetasConTurno.forEach(rp => {
                    const valor = mapCruces[insumo.id_insumo]?.[rp.id_receta];
                    if (valor) {
                      cantidadesPorTurno[rp.turnoLogico] += valor;
                    }
                  });

                  return (
                    <tr key={insumo.id_insumo}>
                      <td style={{ fontWeight: 600, border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.3rem 0.5rem' }}>{insumo.nombre_insumo} ({insumo.simbolo || '-'})</td>
                      <td style={{ backgroundColor: '#fcfdfd', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '0.85rem' }}>
                        {insumo.total_teorico.toFixed(4).replace(/\.?0+$/, '')}
                      </td>
                      <td style={{ padding: '0.15rem 0.3rem', border: '1px solid #ddd' }}>
                        <DespachoInput id_programa={programa.id_programa} id_insumo={insumo.id_insumo} valorInicial={insumo.total_real} />
                      </td>
                      {turnosActivos.map(t => {
                        const valor = cantidadesPorTurno[t];
                        return (
                          <td key={t} style={{ textAlign: 'center', color: '#555', border: '1px solid #eee', fontSize: '0.8rem', padding: '0.3rem' }}>
                            {valor > 0 ? valor.toFixed(4).replace(/\.?0+$/, '') : ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {filteredInsumos.length === 0 && (
                  <tr>
                    <td colSpan={turnosActivos.length + 3} style={{ textAlign: 'center', padding: '2rem' }}>
                      No hay insumos en esta categoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
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

      {vista === 'raciones' && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', backgroundColor: '#fff', border: '1px solid #ddd' }}>
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--secondary-color)', fontWeight: 600 }}>
            📝 REGISTRO DE RACIONES REALES PRODUCIDAS
          </h2>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.8rem' }}>
            Ingresa la cantidad de raciones reales que la cocina llegó a preparar para cada plato en este turno.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '0.35rem 0.5rem', border: '1px solid #ddd', fontSize: '0.8rem', textAlign: 'left' }}>RECETA</th>
                <th style={{ padding: '0.35rem 0.5rem', border: '1px solid #ddd', fontSize: '0.8rem', textAlign: 'center', width: '150px' }}>RACIONES ESTIMADAS</th>
                <th style={{ padding: '0.35rem 0.5rem', border: '1px solid #ddd', fontSize: '0.8rem', textAlign: 'center', width: '150px' }}>REAL PRODUCIDO</th>
              </tr>
            </thead>
            <tbody>
              {recetasProgramadas.map(rp => (
                <tr key={rp.id_receta}>
                  <td style={{ padding: '0.35rem 0.5rem', border: '1px solid #ddd', fontWeight: 600, fontSize: '0.85rem' }}>{rp.nombre_receta}</td>
                  <td style={{ padding: '0.35rem 0.5rem', border: '1px solid #ddd', textAlign: 'center', color: '#666', fontSize: '0.85rem' }}>{rp.raciones_programadas}</td>
                  <td style={{ padding: '0.2rem', border: '1px solid #ddd', textAlign: 'center' }}>
                    <RacionesProducidasInput 
                      id_programa={programa.id_programa}
                      id_receta={rp.id_receta}
                      racionesProgramadas={rp.raciones_programadas}
                      valorInicial={rp.raciones_producidas}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

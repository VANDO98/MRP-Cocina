'use client';

import React, { useState } from 'react';
import DespachoInput from './DespachoInput';
import RacionesProducidasInput from './RacionesProducidasInput';
import DespachoDiarioInput from './DespachoDiarioInput';
import * as XLSX from 'xlsx-js-style';

type Insumo = {
  id_insumo: number;
  nombre_insumo: string;
  categoria_insumo: string;
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
  categoria_insumo: string;
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

type RecetaDia = {
  id_programa: string;
  id_receta: number;
  nombre_receta: string;
  nombre_turno: string;
  id_turno: number;
  raciones_programadas: number;
  raciones_producidas: number | null;
};

type Props = {
  programa: any;
  recetasProgramadas: Receta[];
  insumos: Insumo[];
  mapCruces: Record<number, Record<number, number>>;
  despachosDiarios: DespachoDiario[];
  todasRecetasDelDia: RecetaDia[];
};

export default function PivotTableClient({ programa, recetasProgramadas, insumos, mapCruces, despachosDiarios, todasRecetasDelDia }: Props) {
  const [mostrarProteinas, setMostrarProteinas] = useState(true);
  const [mostrarAbarrotes, setMostrarAbarrotes] = useState(true);
  const [vista, setVista] = useState<'pivot' | 'diario' | 'consumo' | 'raciones'>('pivot');
  const [mostrarDetalleRecetas, setMostrarDetalleRecetas] = useState(false);

  // El turno activo para este programa consolidado es el turno general oficial
  const turnosActivos = [programa.nombre_turno];

  const filteredInsumos = insumos.filter(i => {
    const isProteina = [3, 4, 10].includes(i.id_categoria_insumo);
    if (isProteina) return mostrarProteinas;
    return mostrarAbarrotes;
  });

  const insumosPorCategoria: Record<string, Insumo[]> = {};
  filteredInsumos.forEach(i => {
    const cat = i.categoria_insumo || 'Otros';
    if (!insumosPorCategoria[cat]) insumosPorCategoria[cat] = [];
    insumosPorCategoria[cat].push(i);
  });
  const categoriasOrdenadas = Object.keys(insumosPorCategoria).sort((a, b) => a.localeCompare(b));

  // Agrupar despachos diarios por categoría
  const diariosPorCategoria: Record<string, DespachoDiario[]> = {};
  despachosDiarios.forEach(d => {
    const cat = d.categoria_insumo || 'Otros';
    if (!diariosPorCategoria[cat]) diariosPorCategoria[cat] = [];
    diariosPorCategoria[cat].push(d);
  });
  const categoriasDiarioOrdenadas = Object.keys(diariosPorCategoria).sort((a, b) => a.localeCompare(b));
  categoriasDiarioOrdenadas.forEach(c => {
    diariosPorCategoria[c].sort((a, b) => a.nombre_insumo.localeCompare(b.nombre_insumo));
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

    // Filas de insumos agrupados por categoría
    categoriasOrdenadas.forEach(cat => {
      // Cabecera de categoría
      const filaCat = [cat.toUpperCase()];
      // Llenar vacíos para el resto de columnas
      for (let i = 0; i < turnosActivos.length + 2; i++) filaCat.push('');
      data.push(filaCat);

      insumosPorCategoria[cat].forEach(insumo => {
        // Calcular la cantidad requerida por cada turno activo
        const cantidadesPorTurno: Record<string, number> = {
          [programa.nombre_turno]: insumo.total_teorico
        };

        const fila: any[] = [
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
          const valColA = ws[XLSX.utils.encode_cell({ c: 0, r: R })]?.v;
          const valColB = ws[XLSX.utils.encode_cell({ c: 1, r: R })]?.v;

          // Es fila de cabecera de categoría si la col B está vacía y la col A no incluye '('
          if (!valColB && typeof valColA === 'string' && !valColA.includes('(')) {
            ws[cell_ref].s = {
              ...ws[cell_ref].s,
              font: { name: 'Arial', size: 10, bold: true, color: { rgb: 'E65100' } }, // Color naranja/acento
              fill: { fgColor: { rgb: 'F5F5F5' } },
              alignment: { horizontal: 'left', vertical: 'center' }
            };
          } else {
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
          🥩 Proteínas (Día Completo)
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
        <a 
          href={`/programas/dia/${programa.fecha}/valorizacion`}
          style={{ 
            padding: '0.5rem 1.2rem', 
            cursor: 'pointer', 
            border: '1px solid #ddd',
            borderBottom: '1px solid transparent',
            background: '#f9f9f9', 
            color: 'var(--primary-color)',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            position: 'relative',
            bottom: '-1px',
            textDecoration: 'none',
            display: 'inline-block'
          }}
        >
          💰 Reporte de Valorización (Food Cost)
        </a>
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
              Proteínas
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
            {vista === 'pivot' && (
              <>
                <span style={{ margin: '0 0.5rem', color: '#ccc' }}>|</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem', color: '#333' }}>
                  <input
                    type="checkbox"
                    checked={mostrarDetalleRecetas}
                    onChange={e => setMostrarDetalleRecetas(e.target.checked)}
                    style={{ accentColor: 'var(--primary-color)' }}
                  />
                  Ver desglose por recetas (platos)
                </label>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#2e7d32', fontSize: '0.85rem' }}>Consolidado de Proteínas de la fecha: {programa.fecha}</span>
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
                {mostrarDetalleRecetas ? (
                  // Cabecera detallada por recetas individuales
                  <>
                    {/* Fila: Estimado de Raciones */}
                    <tr className="no-print">
                      <th></th>
                      <th style={{ backgroundColor: '#f1f8f3', color: '#2e7d32', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #ddd' }}>RACIONES EST.:</th>
                      <th style={{ backgroundColor: '#fffcf7', color: '#4e3629', textAlign: 'center', border: '1px solid #ddd' }}></th>
                      {recetasProgramadas.map(rp => (
                        <th key={rp.id_receta} style={{ backgroundColor: '#f5f5f5', color: '#444', textAlign: 'center', fontWeight: 'normal', fontSize: '0.8rem', border: '1px solid #ddd' }}>
                          {rp.raciones_programadas}
                        </th>
                      ))}
                    </tr>
                    {/* Fila de Nombres de Columnas */}
                    <tr>
                      <th style={{ backgroundColor: '#eee', color: '#333', fontSize: '0.8rem', border: '1px solid #ddd' }}>INSUMO (UNIDAD)</th>
                      <th style={{ backgroundColor: '#f1f8f3', color: '#2e7d32', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', width: '130px' }}>TOTAL CONSOLIDADO</th>
                      <th style={{ backgroundColor: '#fff5f5', color: '#c62828', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', width: '130px' }}>TOTAL ENTREGADO</th>
                      {recetasProgramadas.map(rp => (
                        <th key={rp.id_receta} style={{ backgroundColor: '#eee', color: '#333', textAlign: 'center', fontSize: '0.8rem', border: '1px solid #ddd', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rp.nombre_receta}>
                          {rp.nombre_receta}
                        </th>
                      ))}
                    </tr>
                  </>
                ) : (
                  // Cabecera compacta por turnos unificados
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
                )}
              </thead>
              <tbody>
                {categoriasOrdenadas.map(cat => (
                  <React.Fragment key={cat}>
                    {/* Fila Cabecera de Categoría */}
                    <tr style={{ background: '#f8f9fa' }}>
                      <td colSpan={mostrarDetalleRecetas ? recetasProgramadas.length + 3 : turnosActivos.length + 3} style={{ 
                        fontWeight: 700, 
                        fontSize: '0.8rem', 
                        color: 'var(--accent)', 
                        padding: '0.5rem 0.6rem', 
                        textTransform: 'uppercase', 
                        borderBottom: '2px solid var(--border-medium)' 
                      }}>
                        {cat}
                      </td>
                    </tr>
                    {/* Filas de Insumos */}
                    {insumosPorCategoria[cat].map(insumo => {
                      const cantidadesPorTurno: Record<string, number> = {
                        [programa.nombre_turno]: insumo.total_teorico
                      };

                      return (
                        <tr key={insumo.id_insumo}>
                          <td style={{ fontWeight: 600, border: '1px solid #ddd', fontSize: '0.85rem', padding: '0.3rem 0.5rem', paddingLeft: '1.2rem' }}>{insumo.nombre_insumo} ({insumo.simbolo || '-'})</td>
                          <td style={{ backgroundColor: '#fcfdfd', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '0.85rem' }}>
                            {insumo.total_teorico.toFixed(4).replace(/\.?0+$/, '')}
                          </td>
                          <td style={{ padding: '0.15rem 0.3rem', border: '1px solid #ddd' }}>
                            <DespachoInput id_programa={programa.id_programa} id_insumo={insumo.id_insumo} valorInicial={insumo.total_real} />
                          </td>
                          {mostrarDetalleRecetas ? (
                            recetasProgramadas.map(rp => {
                              const valor = mapCruces[insumo.id_insumo]?.[rp.id_receta];
                              return (
                                <td key={rp.id_receta} style={{ textAlign: 'center', color: '#888', border: '1px solid #eee', fontSize: '0.8rem', padding: '0.3rem' }}>
                                  {valor ? valor.toFixed(4).replace(/\.?0+$/, '') : ''}
                                </td>
                              );
                            })
                          ) : (
                            turnosActivos.map(t => {
                              const valor = cantidadesPorTurno[t];
                              return (
                                <td key={t} style={{ textAlign: 'center', color: '#555', border: '1px solid #eee', fontSize: '0.8rem', padding: '0.3rem' }}>
                                  {valor > 0 ? valor.toFixed(4).replace(/\.?0+$/, '') : ''}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                {filteredInsumos.length === 0 && (
                  <tr>
                    <td colSpan={mostrarDetalleRecetas ? recetasProgramadas.length + 3 : turnosActivos.length + 3} style={{ textAlign: 'center', padding: '2rem' }}>
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
              {categoriasDiarioOrdenadas.map(cat => (
                <React.Fragment key={cat}>
                  {/* Cabecera de Categoría */}
                  <tr style={{ background: '#f8f9fa' }}>
                    <td colSpan={4} style={{ 
                      fontWeight: 700, 
                      fontSize: '0.8rem', 
                      color: 'var(--accent)', 
                      padding: '0.5rem 0.6rem', 
                      textTransform: 'uppercase', 
                      borderBottom: '2px solid var(--border-medium)' 
                    }}>
                      {cat}
                    </td>
                  </tr>
                  {diariosPorCategoria[cat].map(dd => (
                    <tr key={dd.id_insumo} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ fontWeight: 600, border: '1px solid #ddd', padding: '0.4rem 0.5rem', paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
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
                </React.Fragment>
              ))}
              {despachosDiarios.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    No hay insumos de proteínas registrados para los programas de esta fecha.
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

      {vista === 'raciones' && (() => {
        // Agrupar todasRecetasDelDia por turno
        const turnosUnicos: { nombre_turno: string; id_turno: number }[] = [];
        const recetasPorTurno: Record<string, RecetaDia[]> = {};
        todasRecetasDelDia.forEach(r => {
          if (!recetasPorTurno[r.nombre_turno]) {
            recetasPorTurno[r.nombre_turno] = [];
            turnosUnicos.push({ nombre_turno: r.nombre_turno, id_turno: r.id_turno });
          }
          recetasPorTurno[r.nombre_turno].push(r);
        });
        // Ordenar turnos por id_turno
        turnosUnicos.sort((a, b) => a.id_turno - b.id_turno);

        const totalProgramadasDia = todasRecetasDelDia.reduce((s, r) => s + r.raciones_programadas, 0);

        return (
          <div style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--accent-light)', border: '1px solid #fed7aa', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.78rem', color: '#9a3412', margin: 0 }}>
                <strong>📋 Vista consolidada del día {programa.fecha}</strong> — Muestra todos los turnos.
                Si un mismo plato aparece en varios turnos, tiene su propia fila para evitar confusión.
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-muted)' }}>
                  <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'left' }}>RECETA / PLATO</th>
                  <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'center', width: '140px' }}>RACIONES ESTIMADAS</th>
                  <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'center', width: '140px' }}>REAL PRODUCIDO</th>
                  <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-subtle)', fontSize: '0.75rem', textAlign: 'center', width: '90px' }}>CUMPL.</th>
                </tr>
              </thead>
              <tbody>
                {turnosUnicos.map(turno => {
                  const recetas = recetasPorTurno[turno.nombre_turno] || [];
                  const totalTurno = recetas.reduce((s, r) => s + r.raciones_programadas, 0);
                  const isCena = turno.nombre_turno.toLowerCase().includes('cena');
                  return (
                    <>
                      {/* Cabecera de turno */}
                      <tr key={`hdr-${turno.nombre_turno}`} style={{ background: isCena ? '#1a1a2e' : '#f0f0f0' }}>
                        <td
                          colSpan={4}
                          style={{
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: isCena ? '#fff' : 'var(--text-primary)',
                            borderLeft: `3px solid ${isCena ? 'var(--accent)' : 'var(--border-medium)'}`,
                          }}
                        >
                          TURNO: {turno.nombre_turno}
                          <span style={{ fontWeight: 400, marginLeft: '1rem', opacity: 0.7 }}>
                            {recetas.length} platos · {totalTurno} raciones estimadas
                          </span>
                        </td>
                      </tr>
                      {/* Filas de recetas */}
                      {recetas.map((rp, idx) => {
                        const prod = rp.raciones_producidas;
                        const cumpl = prod !== null && rp.raciones_programadas > 0
                          ? (prod / rp.raciones_programadas) * 100 : null;
                        return (
                          <tr key={`${rp.id_programa}-${rp.id_receta}`} style={{ background: idx % 2 === 0 ? '#fff' : 'var(--bg-muted)' }}>
                            <td style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-subtle)', fontWeight: 500, fontSize: '0.82rem' }}>
                              {rp.nombre_receta}
                            </td>
                            <td style={{ padding: '0.3rem', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {rp.raciones_programadas}
                            </td>
                            <td style={{ padding: '0.2rem', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                              <RacionesProducidasInput
                                id_programa={rp.id_programa}
                                id_receta={rp.id_receta}
                                racionesProgramadas={rp.raciones_programadas}
                                valorInicial={rp.raciones_producidas}
                              />
                            </td>
                            <td style={{ padding: '0.3rem', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                              {cumpl !== null ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.1rem 0.45rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  background: cumpl >= 95 ? 'var(--success-bg)' : 'var(--warning-bg)',
                                  color: cumpl >= 95 ? 'var(--success)' : 'var(--warning)',
                                }}>
                                  {cumpl.toFixed(0)}%
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.72rem' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
                {/* Fila total del día */}
                <tr style={{ background: '#1a1a2e', color: '#fff', fontWeight: 700 }}>
                  <td style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: '#fff' }}>TOTAL DEL DÍA</td>
                  <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--accent)' }}>{totalProgramadasDia}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}

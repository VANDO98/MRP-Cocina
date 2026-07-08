'use client';

import React from 'react';
import * as XLSX from 'xlsx-js-style';

type Fila = {
  plato: string;
  porciones: number;
  categoria: string;
  insumo: string;
  simbolo: string;
  precio: number;
  qtyProyectada: number;
  qtyProducida: number;
  qtyRealDespachada: number;
  cp: number;
  cpr: number;
  crd: number;
};

type TurnoData = {
  id_programa: string;
  nombre_turno: string;
  costoProyectado: number;
  costoProducido: number;
  costoDespachado: number;
  filas: Fila[];
};

type Props = {
  fecha: string;
  datosPorTurno: TurnoData[];
};

export default function ExportarValorizacionDiaBtn({ fecha, datosPorTurno }: Props) {
  const handleExport = () => {
    // Aplanar los datos para el Excel
    const excelData: any[] = [];

    datosPorTurno.forEach(turno => {
      // Agregar fila de encabezado de turno
      excelData.push({
        "TURNO": turno.nombre_turno.toUpperCase(),
        "PLATO": "",
        "PORCIONES": "",
        "CATEGORÍA": "",
        "INSUMO": "",
        "PRECIO (S/.)": "",
        "TEÓRICO PROD.": "",
        "COSTO T. PROD. (S/.)": "",
        "DESPACHO REAL": "",
        "COSTO REAL (S/.)": ""
      });

      turno.filas.forEach(f => {
        excelData.push({
          "TURNO": "",
          "PLATO": f.plato,
          "PORCIONES": f.porciones,
          "CATEGORÍA": f.categoria,
          "INSUMO": f.insumo,
          "PRECIO (S/.)": Number(f.precio.toFixed(2)),
          "TEÓRICO PROD.": Number(f.qtyProducida.toFixed(3)),
          "COSTO T. PROD. (S/.)": Number(f.cpr.toFixed(2)),
          "DESPACHO REAL": Number(f.qtyRealDespachada.toFixed(3)),
          "COSTO REAL (S/.)": Number(f.crd.toFixed(2))
        });
      });

      // Agregar fila de total de turno
      excelData.push({
        "TURNO": `TOTAL ${turno.nombre_turno.toUpperCase()}`,
        "PLATO": "",
        "PORCIONES": "",
        "CATEGORÍA": "",
        "INSUMO": "",
        "PRECIO (S/.)": "",
        "TEÓRICO PROD.": "",
        "COSTO T. PROD. (S/.)": Number(turno.costoProducido.toFixed(2)),
        "DESPACHO REAL": "",
        "COSTO REAL (S/.)": Number(turno.costoDespachado.toFixed(2))
      });

      // Fila vacía para separar turnos
      excelData.push({});
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Estilos de la tabla
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "212121" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const turnoRowStyle = {
      font: { bold: true, size: 11, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: "E2E8F0" } }
    };

    const totalRowStyle = {
      font: { bold: true, color: { rgb: "0F172A" } },
      fill: { fgColor: { rgb: "F1F5F9" } }
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J1');
    
    // Aplicar estilos a las filas
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const isHeader = R === 0;
      
      // Determinar si es fila de Turno o de Total leyendo la celda de la columna A
      const cellRefA = XLSX.utils.encode_cell({ r: R, c: 0 });
      const cellValA = ws[cellRefA]?.v || '';

      const isTurnoRow = cellValA && !cellValA.startsWith('TOTAL') && excelData[R - 1]?.PLATO === "";
      const isTotalRow = cellValA && cellValA.startsWith('TOTAL');

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;

        if (isHeader) {
          ws[cellRef].s = headerStyle;
        } else if (isTurnoRow) {
          ws[cellRef].s = turnoRowStyle;
        } else if (isTotalRow) {
          ws[cellRef].s = totalRowStyle;
        }
      }
    }

    ws['!cols'] = [
      { wch: 15 }, // TURNO
      { wch: 35 }, // PLATO
      { wch: 12 }, // PORCIONES
      { wch: 15 }, // CATEGORÍA
      { wch: 30 }, // INSUMO
      { wch: 15 }, // PRECIO (S/.)
      { wch: 15 }, // TEÓRICO PROD.
      { wch: 22 }, // COSTO T. PROD.
      { wch: 15 }, // DESPACHO REAL
      { wch: 20 }, // COSTO REAL
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Valorización ${fecha}`);
    XLSX.writeFile(wb, `Valorizacion_${fecha}.xlsx`);
  };

  return (
    <button 
      onClick={handleExport}
      className="btn btn-outline"
      style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
    >
      <span style={{ marginRight: '5px' }}>📥</span> Exportar Excel del Día
    </button>
  );
}

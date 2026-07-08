'use client'

import { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getValorizacionHistoricaExcel } from '@/app/actions';

export default function ExportarValorizacionBtn() {
  const [isOpen, setIsOpen] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!fechaInicio || !fechaFin) {
      alert("Por favor, selecciona ambas fechas.");
      return;
    }
    if (fechaInicio > fechaFin) {
      alert("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    setIsExporting(true);
    try {
      const data = await getValorizacionHistoricaExcel(fechaInicio, fechaFin);
      
      if (data.length === 0) {
        alert("No hay datos de producción en el rango seleccionado.");
        setIsExporting(false);
        return;
      }

      // Preparar datos para Excel
      const excelData = data.map(row => ({
        "DÍA": row.fecha,
        "TURNO": row.turno,
        "PLATO": row.plato,
        "PORCIONES": row.raciones,
        "CATEGORÍA": row.categoria,
        "INSUMO": row.insumo,
        "PRECIO UNITARIO (S/.)": Number(row.precio_unitario.toFixed(2)),
        "CANT. TEÓRICA": Number(row.cantidad_teorica.toFixed(3)),
        "COSTO TEÓRICO (S/.)": Number(row.costo_teorico.toFixed(2)),
        "DESPACHO REAL": Number(row.cantidad_real.toFixed(3)),
        "COSTO REAL (S/.)": Number(row.costo_real.toFixed(2)),
        "UNIDAD": row.simbolo
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Estilos
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "212121" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:L1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = headerStyle;
      }

      ws['!cols'] = [
        { wch: 12 }, // DIA
        { wch: 15 }, // TURNO
        { wch: 35 }, // PLATO
        { wch: 12 }, // PORCIONES
        { wch: 15 }, // CATEGORIA
        { wch: 30 }, // INSUMO
        { wch: 22 }, // PRECIO UNITARIO
        { wch: 18 }, // CANT. TEÓRICA
        { wch: 20 }, // COSTO TEÓRICO
        { wch: 18 }, // DESPACHO REAL
        { wch: 20 }, // COSTO REAL
        { wch: 10 }, // UNIDAD
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Valorización Histórica");
      XLSX.writeFile(wb, `Valorizacion_${fechaInicio}_al_${fechaFin}.xlsx`);

      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Hubo un error al exportar la valorización.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button 
        className="btn btn-outline" 
        onClick={() => setIsOpen(true)}
        style={{ marginRight: '10px' }}
      >
        <span style={{ marginRight: '5px' }}>📊</span> Exportar Excel
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Exportar Valorización</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Selecciona el rango de fechas para descargar el consolidado por Día, Turno, Plato e Insumo.
            </p>
            
            <div style={{ display: 'grid', gap: '15px', marginBottom: '25px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Fecha Inicio</label>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={e => setFechaInicio(e.target.value)} 
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px' }}>Fecha Fin</label>
                <input 
                  type="date" 
                  value={fechaFin} 
                  onChange={e => setFechaFin(e.target.value)} 
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
              >
                Cancelar
              </button>
              <button 
                className="btn" 
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Generando Excel...' : 'Descargar Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

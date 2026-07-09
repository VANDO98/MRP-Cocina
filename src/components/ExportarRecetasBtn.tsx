'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { getRecetasDetalladasExcel } from '@/app/actions';

export default function ExportarRecetasBtn() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await getRecetasDetalladasExcel();

      if (data.length === 0) {
        alert("No hay recetas registradas para exportar.");
        setIsExporting(false);
        return;
      }

      // Agrupar filas por id_receta
      const porReceta: Record<number, typeof data> = {};
      data.forEach(row => {
        if (!porReceta[row.id_receta]) {
          porReceta[row.id_receta] = [];
        }
        porReceta[row.id_receta].push(row);
      });

      const excelData: any[] = [];

      // Estructurar el excel con agrupamientos y totales
      Object.keys(porReceta).forEach(idStr => {
        const id = Number(idStr);
        const filas = porReceta[id];
        const primera = filas[0];

        // Fila de Encabezado de la Receta
        excelData.push({
          "ID RECETA": primera.id_receta,
          "RECETA": primera.nombre_receta.toUpperCase(),
          "CATEGORÍA RECETA": primera.categoria_receta.toUpperCase(),
          "CATEGORÍA INSUMO": "",
          "INSUMO": "",
          "CANT. UNITARIA": "",
          "UNIDAD": "",
          "PRECIO UNITARIO (S/.)": "",
          "COSTO INSUMO (S/.)": ""
        });

        let costoReceta = 0;

        // Insumos
        filas.forEach(f => {
          costoReceta += f.costo_insumo;
          excelData.push({
            "ID RECETA": "",
            "RECETA": "",
            "CATEGORÍA RECETA": "",
            "CATEGORÍA INSUMO": f.categoria_insumo,
            "INSUMO": f.insumo,
            "CANT. UNITARIA": f.cantidad_unitaria !== null ? Number(f.cantidad_unitaria.toFixed(3)) : 0,
            "UNIDAD": f.simbolo,
            "PRECIO UNITARIO (S/.)": Number(f.precio_unitario.toFixed(2)),
            "COSTO INSUMO (S/.)": Number(f.costo_insumo.toFixed(2))
          });
        });

        // Fila de Total de la Receta
        excelData.push({
          "ID RECETA": `TOTAL ${primera.nombre_receta.toUpperCase()}`,
          "RECETA": "",
          "CATEGORÍA RECETA": "",
          "CATEGORÍA INSUMO": "",
          "INSUMO": "",
          "CANT. UNITARIA": "",
          "UNIDAD": "",
          "PRECIO UNITARIO (S/.)": "",
          "COSTO INSUMO (S/.)": Number(costoReceta.toFixed(2))
        });

        // Fila vacía separadora
        excelData.push({});
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Estilos
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "212121" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      const recipeHeaderStyle = {
        font: { bold: true, color: { rgb: "1E293B" }, size: 11 },
        fill: { fgColor: { rgb: "E2E8F0" } }
      };

      const recipeTotalStyle = {
        font: { bold: true, color: { rgb: "0F172A" } },
        fill: { fgColor: { rgb: "F1F5F9" } }
      };

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:I1');

      for (let R = range.s.r; R <= range.e.r; ++R) {
        const isHeader = R === 0;
        
        // Identificar tipo de fila usando la columna A ("ID RECETA")
        const cellRefA = XLSX.utils.encode_cell({ r: R, c: 0 });
        const valA = ws[cellRefA]?.v || '';

        const isRecipeHeader = valA && typeof valA === 'number';
        const isRecipeTotal = valA && typeof valA === 'string' && valA.startsWith('TOTAL');

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) continue;

          if (isHeader) {
            ws[cellRef].s = headerStyle;
          } else if (isRecipeHeader) {
            ws[cellRef].s = recipeHeaderStyle;
          } else if (isRecipeTotal) {
            ws[cellRef].s = recipeTotalStyle;
          }
        }
      }

      ws['!cols'] = [
        { wch: 25 }, // ID RECETA / TOTAL
        { wch: 30 }, // RECETA
        { wch: 20 }, // CATEGORÍA RECETA
        { wch: 20 }, // CATEGORÍA INSUMO
        { wch: 30 }, // INSUMO
        { wch: 18 }, // CANT. UNITARIA
        { wch: 10 }, // UNIDAD
        { wch: 22 }, // PRECIO UNITARIO
        { wch: 20 }, // COSTO INSUMO
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Fichas Técnicas BOM");
      XLSX.writeFile(wb, `Catalogo_Recetas_BOM.xlsx`);

    } catch (err) {
      console.error(err);
      alert("Hubo un error al exportar el catálogo de recetas.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="btn btn-outline"
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <span>📥</span> {isExporting ? 'Exportando...' : 'Exportar Excel'}
    </button>
  );
}

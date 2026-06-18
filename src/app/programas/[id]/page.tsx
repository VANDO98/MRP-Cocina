import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PivotTableClient from '@/components/PivotTableClient';

export default async function ProgramaPivotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const programas = await db`
    SELECT p.id_programa, p.fecha, t.nombre_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.id_programa = ${id}
  `;
  const programa = programas[0];

  if (!programa) notFound();

  const fechaFormateada = new Date(programa.fecha).toISOString().split('T')[0];

  const recetasProgramadas = await db`
    SELECT pd.id_receta, r.nombre_receta, pd.raciones_programadas, pd.raciones_producidas
    FROM Programa_Detalle pd
    JOIN Receta r ON pd.id_receta = r.id_receta
    WHERE pd.id_programa = ${id}
    ORDER BY r.nombre_receta ASC
  `;

  // Mapear recetas programadas
  const recetasMapped = recetasProgramadas.map(rp => ({
    id_receta: rp.id_receta,
    nombre_receta: rp.nombre_receta,
    raciones_programadas: Number(rp.raciones_programadas),
    raciones_producidas: rp.raciones_producidas !== null ? Number(rp.raciones_producidas) : null
  }));

  // Traer consolidado y datos de insumos
  const insumosQuery = await db`
    SELECT i.id_insumo, i.nombre_insumo, c.nombre_categoria as categoria_insumo, i.id_categoria_insumo, u.simbolo, dc.cantidad_teorica_calculada as total_teorico, dc.cantidad_real_entregada as total_real
    FROM Despacho_Consolidado dc
    JOIN Insumo i ON dc.id_insumo = i.id_insumo
    LEFT JOIN Categoria_Insumo c ON i.id_categoria_insumo = c.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    WHERE dc.id_programa = ${id}
    ORDER BY c.nombre_categoria ASC, i.nombre_insumo ASC
  `;

  const insumosMapped = insumosQuery.map(i => ({
    id_insumo: i.id_insumo,
    nombre_insumo: i.nombre_insumo,
    categoria_insumo: i.categoria_insumo || 'Otros',
    id_categoria_insumo: i.id_categoria_insumo,
    simbolo: i.simbolo || '-',
    total_teorico: Number(i.total_teorico || 0),
    total_real: i.total_real !== null ? Number(i.total_real) : null
  }));

  // Traer el detalle cruzado para pintar las celdas de la tabla dinámica
  const cruces = await db`
    SELECT rd.id_insumo, rd.id_receta, rd.cantidad_unitaria, pd.raciones_programadas
    FROM Receta_Detalle rd
    JOIN Programa_Detalle pd ON rd.id_receta = pd.id_receta AND pd.id_programa = ${id}
  `;

  // Mapa rápido de cruces: map[id_insumo][id_receta] = (cantidad_unitaria * raciones)
  const mapCruces: Record<number, Record<number, number>> = {};
  for (const c of cruces) {
    if (!mapCruces[c.id_insumo]) mapCruces[c.id_insumo] = {};
    mapCruces[c.id_insumo][c.id_receta] = Number(c.cantidad_unitaria) * Number(c.raciones_programadas);
  }

  // 1. Obtener todos los programas de esa fecha
  const programasDelDia = await db`
    SELECT p.id_programa, t.nombre_turno, t.id_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.fecha = ${fechaFormateada}
    ORDER BY t.id_turno ASC
  `;

  // 1b. Todas las recetas de TODOS los programas del día (para el registro consolidado de raciones)
  const todasRecetasDelDiaQuery = await db`
    SELECT
      pd.id_programa,
      pd.id_receta,
      r.nombre_receta,
      t.nombre_turno,
      t.id_turno,
      pd.raciones_programadas,
      pd.raciones_producidas
    FROM Programa_Detalle pd
    JOIN Receta r ON pd.id_receta = r.id_receta
    JOIN Programa_Produccion p ON pd.id_programa = p.id_programa
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.fecha = ${fechaFormateada}
    ORDER BY t.id_turno ASC, r.nombre_receta ASC
  `;

  const todasRecetasDelDia = todasRecetasDelDiaQuery.map(r => ({
    id_programa: r.id_programa as string,
    id_receta: r.id_receta as number,
    nombre_receta: r.nombre_receta as string,
    nombre_turno: r.nombre_turno as string,
    id_turno: r.id_turno as number,
    raciones_programadas: Number(r.raciones_programadas),
    raciones_producidas: r.raciones_producidas !== null ? Number(r.raciones_producidas) : null,
  }));

  // 2. Obtener todos los insumos de categoría 2, 3, 4, 10 del día para el consolidado
  const consumosDiariosQuery = await db`
    SELECT 
      i.id_insumo,
      i.nombre_insumo,
      c.nombre_categoria as categoria_insumo,
      i.id_categoria_insumo,
      u.simbolo,
      dc.id_programa,
      dc.cantidad_teorica_calculada as cantidad_teorica,
      COALESCE(dc.cantidad_real_entregada, 0) as cantidad_real
    FROM Despacho_Consolidado dc
    JOIN Insumo i ON dc.id_insumo = i.id_insumo
    LEFT JOIN Categoria_Insumo c ON i.id_categoria_insumo = c.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
    WHERE p.fecha = ${fechaFormateada} AND i.id_categoria_insumo IN (3, 4, 10)
    ORDER BY c.nombre_categoria ASC, i.nombre_insumo ASC
  `;

  // Agrupar en JS para pasarlo de forma estructurada
  const mapaDiario: Record<number, {
    id_insumo: number;
    nombre_insumo: string;
    categoria_insumo: string;
    simbolo: string;
    total_teorico_dia: number;
    total_real_dia: number;
    desgloses: { id_programa: string; nombre_turno: string; cantidad_teorica: number; cantidad_real: number; }[]
  }> = {};

  for (const c of consumosDiariosQuery) {
    if (!mapaDiario[c.id_insumo]) {
      mapaDiario[c.id_insumo] = {
        id_insumo: c.id_insumo,
        nombre_insumo: c.nombre_insumo,
        categoria_insumo: (c.categoria_insumo as string) || 'Otros',
        simbolo: c.simbolo || '-',
        total_teorico_dia: 0,
        total_real_dia: 0,
        desgloses: []
      };
    }

    const prog = programasDelDia.find(p => p.id_programa === c.id_programa);
    const nombre_turno = prog ? prog.nombre_turno : 'Desconocido';

    mapaDiario[c.id_insumo].total_teorico_dia += Number(c.cantidad_teorica);
    mapaDiario[c.id_insumo].total_real_dia += Number(c.cantidad_real);
    mapaDiario[c.id_insumo].desgloses.push({
      id_programa: c.id_programa,
      nombre_turno: nombre_turno,
      cantidad_teorica: Number(c.cantidad_teorica),
      cantidad_real: Number(c.cantidad_real)
    });
  }

  const despachosDiarios = Object.values(mapaDiario);

  const programaMod = {
    id_programa: programa.id_programa as string,
    fecha: fechaFormateada,
    nombre_turno: programa.nombre_turno as string
  };

  return (
    <div>
      <Link href="/programas" className="no-print" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600 }}>
        &larr; Volver a Programas
      </Link>
      
      <div className="card" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Consolidado: {programa.id_programa}</h1>
        <p style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>Fecha: {fechaFormateada} | Turno: {programa.nombre_turno}</p>
      </div>

      <PivotTableClient 
        programa={programaMod} 
        recetasProgramadas={recetasMapped} 
        insumos={insumosMapped} 
        mapCruces={mapCruces} 
        despachosDiarios={despachosDiarios}
        todasRecetasDelDia={todasRecetasDelDia}
      />
    </div>
  );
}

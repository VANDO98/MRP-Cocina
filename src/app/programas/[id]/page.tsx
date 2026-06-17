import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PivotTableClient from '@/components/PivotTableClient';

export default async function ProgramaPivotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const programa = db.prepare(`
    SELECT p.id_programa, p.fecha, t.nombre_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.id_programa = ?
  `).get(id) as any;

  if (!programa) notFound();

  const recetasProgramadas = db.prepare(`
    SELECT pd.id_receta, r.nombre_receta, pd.raciones_programadas, pd.raciones_producidas
    FROM Programa_Detalle pd
    JOIN Receta r ON pd.id_receta = r.id_receta
    WHERE pd.id_programa = ?
  `).all(id) as any[];

  // Traer consolidado y datos de insumos
  const insumosQuery = db.prepare(`
    SELECT i.id_insumo, i.nombre_insumo, i.id_categoria_insumo, u.simbolo, dc.cantidad_teorica_calculada as total_teorico, dc.cantidad_real_entregada as total_real
    FROM Despacho_Consolidado dc
    JOIN Insumo i ON dc.id_insumo = i.id_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    WHERE dc.id_programa = ?
    ORDER BY i.nombre_insumo ASC
  `).all(id) as any[];

  // Traer el detalle cruzado para pintar las celdas de la tabla dinámica
  const cruces = db.prepare(`
    SELECT rd.id_insumo, rd.id_receta, rd.cantidad_unitaria, pd.raciones_programadas
    FROM Receta_Detalle rd
    JOIN Programa_Detalle pd ON rd.id_receta = pd.id_receta AND pd.id_programa = ?
  `).all(id) as any[];

  // Mapa rápido de cruces: map[id_insumo][id_receta] = (cantidad_unitaria * raciones)
  const mapCruces: Record<number, Record<number, number>> = {};
  for (const c of cruces) {
    if (!mapCruces[c.id_insumo]) mapCruces[c.id_insumo] = {};
    mapCruces[c.id_insumo][c.id_receta] = c.cantidad_unitaria * c.raciones_programadas;
  }

  // 1. Obtener todos los programas de esa fecha
  const programasDelDia = db.prepare(`
    SELECT p.id_programa, t.nombre_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.fecha = ?
    ORDER BY t.id_turno ASC
  `).all(programa.fecha) as any[];

  // 2. Obtener todos los insumos de categoría 2, 3, 4, 10 del día para el consolidado
  const consumosDiariosQuery = db.prepare(`
    SELECT 
      i.id_insumo,
      i.nombre_insumo,
      i.id_categoria_insumo,
      u.simbolo,
      dc.id_programa,
      dc.cantidad_teorica_calculada as cantidad_teorica,
      COALESCE(dc.cantidad_real_entregada, 0) as cantidad_real
    FROM Despacho_Consolidado dc
    JOIN Insumo i ON dc.id_insumo = i.id_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
    WHERE p.fecha = ? AND i.id_categoria_insumo IN (2, 3, 4, 10)
    ORDER BY i.nombre_insumo ASC
  `).all(programa.fecha) as any[];

  // Agrupar en JS para pasarlo de forma estructurada
  const mapaDiario: Record<number, {
    id_insumo: number;
    nombre_insumo: string;
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
        simbolo: c.simbolo || '-',
        total_teorico_dia: 0,
        total_real_dia: 0,
        desgloses: []
      };
    }

    const prog = programasDelDia.find(p => p.id_programa === c.id_programa);
    const nombre_turno = prog ? prog.nombre_turno : 'Desconocido';

    mapaDiario[c.id_insumo].total_teorico_dia += c.cantidad_teorica;
    mapaDiario[c.id_insumo].total_real_dia += c.cantidad_real;
    mapaDiario[c.id_insumo].desgloses.push({
      id_programa: c.id_programa,
      nombre_turno: nombre_turno,
      cantidad_teorica: c.cantidad_teorica,
      cantidad_real: c.cantidad_real
    });
  }

  const despachosDiarios = Object.values(mapaDiario);

  return (
    <div>
      <Link href="/programas" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600 }}>
        &larr; Volver a Programas
      </Link>
      
      <div className="card" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Consolidado: {programa.id_programa}</h1>
        <p style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>Fecha: {programa.fecha} | Turno: {programa.nombre_turno}</p>
      </div>

      <PivotTableClient 
        programa={programa} 
        recetasProgramadas={recetasProgramadas} 
        insumos={insumosQuery} 
        mapCruces={mapCruces} 
        despachosDiarios={despachosDiarios}
      />
    </div>
  );
}

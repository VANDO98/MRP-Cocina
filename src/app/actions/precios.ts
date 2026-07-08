'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updatePrecioDefecto(id_insumo: number, precio: number) {
  await db`UPDATE Insumo SET precio_defecto = ${precio} WHERE id_insumo = ${id_insumo}`;
  revalidatePath('/precios');
}

export async function addPrecioHistorial(id_insumo: number, fecha_inicio: string, precio: number) {
  await db`
    INSERT INTO Precio_Insumo_Historial (id_insumo, fecha_inicio, precio_unitario)
    VALUES (${id_insumo}, ${fecha_inicio}, ${precio})
  `;
  revalidatePath('/precios');
}

export async function deletePrecioHistorial(id_precio_historial: number) {
  await db`DELETE FROM Precio_Insumo_Historial WHERE id_precio_historial = ${id_precio_historial}`;
  revalidatePath('/precios');
}

export async function savePreciosMasivo(
  cambios: { id_insumo: number; precio: number }[],
  tipo: 'base' | 'historial',
  fecha: string
) {
  if (cambios.length === 0) return;

  await db.begin(async sql => {
    if (tipo === 'base') {
      for (const c of cambios) {
        await sql`
          UPDATE Insumo 
          SET precio_defecto = ${c.precio} 
          WHERE id_insumo = ${c.id_insumo}
        `;
      }
    } else {
      for (const c of cambios) {
        const exist = await sql`
          SELECT id_precio_historial 
          FROM Precio_Insumo_Historial 
          WHERE id_insumo = ${c.id_insumo} AND fecha_inicio = ${fecha}
        `;
        if (exist.length > 0) {
          await sql`
            UPDATE Precio_Insumo_Historial 
            SET precio_unitario = ${c.precio} 
            WHERE id_precio_historial = ${exist[0].id_precio_historial}
          `;
        } else {
          await sql`
            INSERT INTO Precio_Insumo_Historial (id_insumo, fecha_inicio, precio_unitario)
            VALUES (${c.id_insumo}, ${fecha}, ${c.precio})
          `;
        }
      }
    }
  });

  revalidatePath('/precios');
}


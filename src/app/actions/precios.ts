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

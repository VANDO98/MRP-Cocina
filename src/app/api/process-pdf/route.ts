import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PDFDocument, rgb } from 'pdf-lib';

// Polyfills para entorno Node.js / Serverless requeridos por pdfjs-dist
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: any) {
      if (Array.isArray(init)) {
        this.a = init[0] ?? 1;
        this.b = init[1] ?? 0;
        this.c = init[2] ?? 0;
        this.d = init[3] ?? 1;
        this.e = init[4] ?? 0;
        this.f = init[5] ?? 0;
      } else if (typeof init === 'object' && init !== null) {
        this.a = init.a ?? 1;
        this.b = init.b ?? 0;
        this.c = init.c ?? 0;
        this.d = init.d ?? 1;
        this.e = init.e ?? 0;
        this.f = init.f ?? 0;
      }
    }
  }
  (globalThis as any).DOMMatrix = DOMMatrix;
}

if (typeof globalThis.Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {};
}

if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {};
}

// Definición de colores RGB normalizados
const COLOR_VERDE = rgb(0.0, 1.0, 0.0);   // Verduras
const COLOR_ROJO = rgb(1.0, 0.0, 0.0);    // Cárnicos
const COLOR_AZUL = rgb(0.0, 0.0, 1.0);    // Abarrotes / Secos

// Función de mapeo de color según categoría (ID y Nombre)
function getColorForCategory(idCategoria: number | null, nombreCategoria: string | null) {
  if (!nombreCategoria) return null;
  const name = nombreCategoria.toUpperCase();
  const id = idCategoria;
  
  // 1. Verde para Verduras (id=2 en la DB original, o coincidencia de texto)
  if (id === 2 || name.includes('VERDURA') || name.includes('FRUTA')) {
    return COLOR_VERDE;
  }
  
  // 2. Rojo para Cárnicos (id=3, 4, 10 en la DB original, o coincidencia de texto)
  if (
    id === 3 || id === 4 || id === 10 || 
    name.includes('CARNIC') || name.includes('CÁRNIC') || name.includes('AVE') || 
    name.includes('HUEVO') || name.includes('PESCADO') || name.includes('MARISCO') || 
    name.includes('POLLO') || name.includes('CARNE')
  ) {
    return COLOR_ROJO;
  }
  
  // 3. Azul para Abarrotes / Secos (id=1, 5, 7, 8, 9 en la DB original, o coincidencia de texto)
  if (
    id === 1 || id === 5 || id === 7 || id === 8 || id === 9 || 
    name.includes('ABARROTE') || name.includes('SECO') || name.includes('LACTEO') || 
    name.includes('LÁCTEO') || name.includes('EMBUTIDO') || name.includes('PASTEL') || 
    name.includes('BEBIDA') || name.includes('GASEOSA') || name.includes('SNACK') || 
    name.includes('ESPECIA') || name.includes('CONDIMENT') || name.includes('CONSERVA')
  ) {
    return COLOR_AZUL;
  }
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo PDF.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = new Uint8Array(arrayBuffer);

    // 1. Obtener insumos y categorías de PostgreSQL en una sola query
    const insumosDb = await db`
      SELECT i.nombre_insumo, ci.id_categoria_insumo, ci.nombre_categoria
      FROM Insumo i
      LEFT JOIN Categoria_Insumo ci ON i.id_categoria_insumo = ci.id_categoria_insumo
    `;

    // Mapear insumos a categorías en memoria para búsqueda O(1)
    const insumoMap = new Map<string, { id: number | null; categoria: string | null }>();
    for (const row of insumosDb) {
      const nameKey = row.nombre_insumo.toLowerCase().trim();
      insumoMap.set(nameKey, {
        id: row.id_categoria_insumo,
        categoria: row.nombre_categoria
      });
    }

    // 2. Cargar pdfjs-dist dinámicamente para evitar problemas de compilación de worker
    // @ts-ignore
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Parsear el PDF para extraer textos y coordenadas
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
      disableFontFace: true
    });
    
    const pdfDocRead = await loadingTask.promise;
    const numPages = pdfDocRead.numPages;

    // 3. Cargar el PDF original en pdf-lib para modificarlo
    const pdfDocWrite = await PDFDocument.load(arrayBuffer);
    const writePages = pdfDocWrite.getPages();

    // Regex para extraer el insumo: "0.180000 (I) AJO PELADO"
    // Captura la cantidad en grupo 1 y el nombre del insumo en grupo 2
    const insumoRegex = /^([\d.]+)\s+\(I\)\s+(.+)$/i;

    // 4. Analizar e inyectar el resaltado por página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pageRead = await pdfDocRead.getPage(pageNum);
      const textContent = await pageRead.getTextContent();
      const pageWrite = writePages[pageNum - 1];

      for (const item of textContent.items) {
        // @ts-ignore
        const textStr = item.str || '';
        const trimmedText = textStr.trim();

        if (!trimmedText) continue;

        const match = trimmedText.match(insumoRegex);
        if (match) {
          const rawInsumoName = match[2].trim();
          const cleanInsumoName = rawInsumoName.toLowerCase();

          // Buscar el insumo en la base de datos mapeada
          const insumoData = insumoMap.get(cleanInsumoName);

          if (insumoData) {
            const color = getColorForCategory(insumoData.id, insumoData.categoria);
            
            if (color) {
              // @ts-ignore
              const x = item.transform[4];
              // @ts-ignore
              const y = item.transform[5];
              // @ts-ignore
              const width = item.width;
              // @ts-ignore
              const height = item.height || item.transform[3] || 10;

              // Dibujar un rectángulo semitransparente sobre el texto del insumo
              // Restamos el 15% del alto a la coordenada Y para centrar el sombreado sobre la línea base
              pageWrite.drawRectangle({
                x: x,
                y: y - height * 0.15,
                width: width,
                height: height * 1.3,
                color: color,
                opacity: 0.3, // Opacidad al 30% como requiere la restricción
              });
            }
          }
        }
      }
    }

    // 5. Generar el PDF modificado
    const modifiedPdfBytes = await pdfDocWrite.save();

    // Retornar el PDF como una respuesta binaria de descarga
    return new Response(modifiedPdfBytes.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Orden_Movimiento_Picking_${Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('❌ Error al procesar el archivo PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el archivo PDF: ' + error.message },
      { status: 500 }
    );
  }
}

'use client';

export default function PrintButton() {
  return (
    <button
      className="btn"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
      onClick={() => window.print()}
    >
      🖨️ Imprimir / Descargar PDF
    </button>
  );
}

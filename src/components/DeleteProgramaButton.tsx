'use client';

import { useState } from 'react';
import { deletePrograma } from '@/app/actions';

export default function DeleteProgramaButton({ id_programa }: { id_programa: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirm = window.confirm(`¿Estás seguro de que deseas eliminar el programa "${id_programa}"? Esta acción borrará permanentemente todos los consumos y despachos registrados en este turno.`);
    if (!confirm) return;

    setIsDeleting(true);
    try {
      await deletePrograma(id_programa);
    } catch (e) {
      console.error(e);
      alert("Error al eliminar el programa");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="btn-action btn-action-delete"
      style={{
        opacity: isDeleting ? 0.6 : 1
      }}
    >
      🗑️ Borrar
    </button>
  );
}

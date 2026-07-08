'use client';

import { useState } from 'react';
import { createTurno, toggleTurnoActivo } from '@/app/actions';

type Turno = {
  id_turno: number;
  nombre_turno: string;
  activo: boolean;
};

type Props = {
  initialTurnos: Turno[];
};

export default function TurnosClient({ initialTurnos }: Props) {
  const [turnos, setTurnos] = useState<Turno[]>(initialTurnos);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    setIsSubmitting(true);
    try {
      const id = await createTurno(nuevoNombre);
      
      // Actualizar estado local
      const nombreLimpio = nuevoNombre.trim().toUpperCase();
      const yaExisteIndex = turnos.findIndex(t => t.nombre_turno === nombreLimpio);
      if (yaExisteIndex > -1) {
        // Si ya existía pero estaba inactivo, lo activamos
        const newTurnos = [...turnos];
        newTurnos[yaExisteIndex].activo = true;
        setTurnos(newTurnos);
      } else {
        setTurnos(prev => [
          ...prev,
          { id_turno: id, nombre_turno: nombreLimpio, activo: true }
        ].sort((a, b) => a.nombre_turno.localeCompare(b.nombre_turno)));
      }

      setNuevoNombre('');
      alert("Turno creado con éxito");
    } catch (err: any) {
      alert(err.message || "Error al crear el turno");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: number, currentActivo: boolean) => {
    try {
      await toggleTurnoActivo(id, !currentActivo);
      setTurnos(prev => prev.map(t => {
        if (t.id_turno === id) {
          return { ...t, activo: !currentActivo };
        }
        return t;
      }));
    } catch (err) {
      alert("Error al alternar estado del turno");
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      
      {/* Formulario de creación */}
      <div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>+ Agregar Nuevo Turno</h2>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Nombre del Turno
              </label>
              <input 
                type="text" 
                placeholder="Ej. Tarde, Media Noche, Refuerzo..."
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                className="input"
                style={{ width: '100%' }}
                required
                disabled={isSubmitting}
              />
            </div>
            <button 
              type="submit" 
              className="btn" 
              style={{ width: '100%' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Crear Turno'}
            </button>
          </form>
        </div>
      </div>

      {/* Listado de turnos */}
      <div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Turnos Registrados</h2>
          </div>
          <table style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.75rem 1.5rem' }}>Turno</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>Estado</th>
                <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map(t => (
                <tr key={t.id_turno} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                    {t.nombre_turno}
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                    {t.activo ? (
                      <span className="badge-turno badge-turno-consolidado" style={{ fontSize: '0.7rem' }}>
                        Activo
                      </span>
                    ) : (
                      <span className="badge-turno" style={{ fontSize: '0.7rem', background: '#e2e8f0', color: '#64748b' }}>
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                    <button
                      onClick={() => handleToggle(t.id_turno, t.activo)}
                      className={t.activo ? "btn-action btn-action-edit" : "btn-action"}
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.6rem',
                        background: t.activo ? '#fee2e2' : '#dcfce7',
                        color: t.activo ? '#991b1b' : '#166534',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}
                    >
                      {t.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

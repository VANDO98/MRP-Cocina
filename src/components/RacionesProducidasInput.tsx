'use client'

import { useState } from 'react';
import { updateRacionesProducidas } from '@/app/actions';

type Props = {
  id_programa: string;
  id_receta: number;
  racionesProgramadas: number;
  valorInicial: number | null;
};

export default function RacionesProducidasInput({ id_programa, id_receta, racionesProgramadas, valorInicial }: Props) {
  const [valor, setValor] = useState(valorInicial !== null ? valorInicial.toString() : '0');
  const [isSaving, setIsSaving] = useState(false);

  const handleFocus = () => {
    if (valor === '0') {
      setValor('');
    }
  };

  const handleBlur = async () => {
    setIsSaving(true);
    let valorFinal = valor;
    if (valor === '') {
      valorFinal = '0';
      setValor('0');
    }
    try {
      const num = parseInt(valorFinal, 10);
      await updateRacionesProducidas(id_programa, id_receta, num);
    } catch (e) {
      console.error(e);
      alert("Error al guardar las raciones producidas");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Buscar todos los inputs de la clase raciones-input
      const inputs = Array.from(document.querySelectorAll('.raciones-input')) as HTMLInputElement[];
      const index = inputs.indexOf(e.currentTarget);
      if (index !== -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
        inputs[index + 1].select();
      }
    }
  };

  const esCero = valor === '0' || valor === '' || parseInt(valor, 10) === 0;

  return (
    <input 
      type="number" 
      step="1"
      min="0"
      className="raciones-input"
      value={valor}
      onChange={e => setValor(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={isSaving}
      style={{
        width: '75px',
        padding: '0.2rem 0.3rem',
        border: esCero ? '1px solid #d1d5db' : '1px solid #a3cfbb',
        borderRadius: '4px',
        backgroundColor: isSaving ? '#f0f0f0' : (esCero ? '#faf8f5' : '#f4fbf7'),
        color: esCero ? '#9c9c9c' : '#0f5132',
        textAlign: 'center',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      placeholder="0"
    />
  );
}

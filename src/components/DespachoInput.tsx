'use client'

import { useState } from 'react';
import { updateDespachoManual } from '@/app/actions';

export default function DespachoInput({ id_programa, id_insumo, valorInicial }: { id_programa: string, id_insumo: number, valorInicial: number | null }) {
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
      const num = parseFloat(valorFinal);
      await updateDespachoManual(id_programa, id_insumo, num);
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Buscar todos los inputs de la misma columna con la clase despacho-input
      const inputs = Array.from(document.querySelectorAll('.despacho-input')) as HTMLInputElement[];
      const index = inputs.indexOf(e.currentTarget);
      if (index !== -1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
        inputs[index + 1].select(); // Opcional: seleccionar el texto para facilitar la sobreescritura
      }
    }
  };

  const esCero = valor === '0' || valor === '' || parseFloat(valor) === 0;

  return (
    <input 
      type="number" 
      step="any"
      className="despacho-input"
      value={valor}
      onChange={e => setValor(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={isSaving}
      style={{
        width: '100%',
        padding: '0.25rem 0.4rem',
        border: esCero ? '1px solid #d1d5db' : '1px solid #a3cfbb',
        borderRadius: '4px',
        backgroundColor: isSaving ? '#f0f0f0' : (esCero ? '#faf8f5' : '#f4fbf7'),
        color: esCero ? '#9c9c9c' : '#0f5132',
        textAlign: 'right',
        fontWeight: esCero ? 'normal' : 'bold',
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      placeholder="0.00"
    />
  );
}

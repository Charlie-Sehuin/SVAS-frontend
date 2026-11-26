import type { BeneficioPlan } from '../types/api';

/** "4 al año", "USD 1,00 por litro", "12 %": el valor de un beneficio como lo lee el cliente (igual que el PDF y el chat). */
export function textoBeneficio(b: Pick<BeneficioPlan, 'tipo' | 'unidad' | 'valor'>): string {
  const n = Number(b.valor);
  if (b.tipo === 'PRECIO') {
    const precio = n.toFixed(2).replace('.', ',');
    return b.unidad.includes('USD') ? b.unidad.replace('USD', `USD ${precio}`) : `${precio} ${b.unidad}`;
  }
  const num = Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  return b.tipo === 'PORCENTAJE' ? `${num} %` : `${num} ${b.unidad}`;
}

/** Texto de una celda de la tabla comparativa: lo que ofrece el plan o "No incluye". */
export const NO_INCLUYE = 'No incluye';

import { describe, expect, it } from 'vitest';
import { textoBeneficio } from './beneficios';

describe('textoBeneficio', () => {
  it('cantidad: "4 al año"', () => {
    expect(textoBeneficio({ tipo: 'CANTIDAD', unidad: 'al año', valor: '4.00' })).toBe('4 al año');
  });

  it('precio: la moneda lleva el valor, con dos decimales y coma', () => {
    expect(textoBeneficio({ tipo: 'PRECIO', unidad: 'USD por litro', valor: '1.00' })).toBe('USD 1,00 por litro');
    expect(textoBeneficio({ tipo: 'PRECIO', unidad: 'USD por litro', valor: '2.5' })).toBe('USD 2,50 por litro');
  });

  it('porcentaje: "12 %"', () => {
    expect(textoBeneficio({ tipo: 'PORCENTAJE', unidad: '% de descuento', valor: '12.00' })).toBe('12 %');
  });
});

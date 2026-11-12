import { describe, expect, it } from 'vitest';
import { formatearMonto, formatearPorcentaje, iniciales, montoEnPalabras, partesMonto, tiempoTranscurrido } from './format';

describe('format', () => {
  it('formatea montos que llegan como string decimal sin recalcular nada', () => {
    expect(formatearMonto('640.40')).toBe('USD 640.40');
    expect(formatearMonto('1250')).toBe('USD 1,250.00');
    expect(formatearMonto('54.18', 'PEN')).toBe('S/ 54.18');
    expect(partesMonto('53.37')).toEqual({ simbolo: 'USD', cifra: '53.37' });
  });

  it('lee el monto en palabras para lectores de pantalla', () => {
    expect(montoEnPalabras('53.37')).toBe('53 dólares con 37 centavos');
    expect(montoEnPalabras('480.00')).toBe('480 dólares');
    expect(montoEnPalabras('1')).toBe('1 dólar');
    expect(montoEnPalabras('0.50', 'PEN')).toBe('0 soles con 50 céntimos');
  });

  it('formatea porcentajes y tiempos', () => {
    expect(formatearPorcentaje('5.00')).toBe('5 %');
    expect(formatearPorcentaje('12.50')).toBe('12,5 %');
    const ahora = new Date('2026-11-12T12:00:00Z');
    expect(tiempoTranscurrido('2026-11-12T11:45:00Z', ahora)).toBe('hace 15 min');
    expect(tiempoTranscurrido('2026-11-12T07:00:00Z', ahora)).toBe('hace 5 h');
  });

  it('saca iniciales para el avatar', () => {
    expect(iniciales('Ana Ríos')).toBe('AR');
    expect(iniciales('luis')).toBe('L');
  });
});

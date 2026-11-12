import { describe, expect, it } from 'vitest';
import type { PrimaCotizada } from '../../../shared/types/api';
import { agruparPorAseguradora, aseguradorasDe } from './agrupar';

const prima = (o: Partial<PrimaCotizada> & Pick<PrimaCotizada, 'id' | 'aseguradoraId' | 'aseguradora' | 'plan'>): PrimaCotizada => ({
  planId: `plan-${o.id}`,
  resumen: null,
  disponible: true,
  sumaAsegurada: '15000.00',
  rangoSuma: { minima: '12000.00', maxima: '16800.00' },
  prima: '600.00',
  primaMensual: '50.00',
  motivoNoDisponible: null,
  ...o,
});

const PRIMAS: PrimaCotizada[] = [
  prima({ id: '1', aseguradoraId: 'rimac', aseguradora: 'Rímac', plan: 'Oro', primaMensual: '51.23' }),
  prima({ id: '2', aseguradoraId: 'rimac', aseguradora: 'Rímac', plan: 'Plata', primaMensual: '36.59' }),
  prima({ id: '3', aseguradoraId: 'mapfre', aseguradora: 'Mapfre', plan: 'Total', primaMensual: '74.71' }),
  prima({ id: '4', aseguradoraId: 'mapfre', aseguradora: 'Mapfre', plan: 'Esencial', primaMensual: '52.84' }),
  prima({
    id: '5',
    aseguradoraId: 'qualitas',
    aseguradora: 'Qualitas',
    plan: 'Plus',
    disponible: false,
    sumaAsegurada: null,
    rangoSuma: null,
    prima: null,
    primaMensual: null,
    motivoNoDisponible: 'SIN_RANGO',
  }),
];

describe('agruparPorAseguradora', () => {
  it('por precio: la aseguradora con la cuota más baja primero y, dentro de cada una, de menor a mayor', () => {
    const g = agruparPorAseguradora(PRIMAS, 'precio');
    expect(g.map((x) => x.aseguradora)).toEqual(['Rímac', 'Mapfre', 'Qualitas']);
    expect(g[0]!.disponibles.map((p) => p.plan)).toEqual(['Plata', 'Oro']);
    expect(g[1]!.disponibles.map((p) => p.plan)).toEqual(['Esencial', 'Total']);
  });

  it('compara los montos como números, no como texto ("9.99" es menor que "10.00")', () => {
    const g = agruparPorAseguradora(
      [
        prima({ id: 'a', aseguradoraId: 'x', aseguradora: 'X', plan: 'A', primaMensual: '10.00' }),
        prima({ id: 'b', aseguradoraId: 'y', aseguradora: 'Y', plan: 'B', primaMensual: '9.99' }),
      ],
      'precio',
    );
    expect(g.map((x) => x.aseguradora)).toEqual(['Y', 'X']);
  });

  it('por aseguradora: A–Z', () => {
    expect(agruparPorAseguradora(PRIMAS, 'aseguradora').map((x) => x.aseguradora)).toEqual(['Mapfre', 'Rímac', 'Qualitas']);
  });

  it('la aseguradora que no cotiza va siempre al final y sus planes quedan como no disponibles', () => {
    const g = agruparPorAseguradora(PRIMAS, 'aseguradora');
    const ultima = g[g.length - 1]!;
    expect(ultima.aseguradora).toBe('Qualitas');
    expect(ultima.disponibles).toHaveLength(0);
    expect(ultima.noDisponibles).toHaveLength(1);
  });

  it('un plan marcado disponible pero sin cuota mensual no se ofrece como comprable', () => {
    const g = agruparPorAseguradora(
      [prima({ id: 'z', aseguradoraId: 'z', aseguradora: 'Z', plan: 'Z', primaMensual: null })],
      'precio',
    );
    expect(g[0]!.disponibles).toHaveLength(0);
    expect(g[0]!.noDisponibles).toHaveLength(1);
  });

  it('filtra por aseguradora', () => {
    const g = agruparPorAseguradora(PRIMAS, 'precio', 'mapfre');
    expect(g).toHaveLength(1);
    expect(g[0]!.aseguradora).toBe('Mapfre');
  });

  it('aseguradorasDe lista cada aseguradora una vez, A–Z', () => {
    expect(aseguradorasDe(PRIMAS).map((a) => a.nombre)).toEqual(['Mapfre', 'Qualitas', 'Rímac']);
  });
});

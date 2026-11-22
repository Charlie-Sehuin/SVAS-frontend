import { describe, expect, it } from 'vitest';
import type { CuotaResumen, PolizaResumen } from '../../../shared/types/api';
import { avisosDeCuotas, cuandoVence, DIAS_AVISO_CUOTA } from './avisos';

const cuota = (numero: number, estado: 'PENDIENTE' | 'CONFIRMADO', dias: number | null): CuotaResumen => ({
  numero,
  monto: '54.18',
  fechaVencimiento: '2026-12-12',
  estado,
  diasParaVencer: estado === 'PENDIENTE' ? dias : null,
  montoAcumulado: estado === 'PENDIENTE' ? '54.18' : null,
});

const poliza = (id: string, cuotas: CuotaResumen[], modo: 'CUOTAS' | 'UNICO' = 'CUOTAS'): PolizaResumen =>
  ({
    id,
    ordenId: `orden-${id}`,
    numero: `LAP-${id}`,
    vehiculo: { marca: 'Toyota', modelo: 'Corolla', anio: 2022, placa: null },
    pago: { modo, montoTotal: '650.16', numeroCuotas: cuotas.length || null, cuotas },
  }) as unknown as PolizaResumen;

describe('cuandoVence', () => {
  it('lo dice en palabras, con singular y plural', () => {
    expect(cuandoVence(-1)).toBe('venció hace 1 día');
    expect(cuandoVence(-4)).toBe('venció hace 4 días');
    expect(cuandoVence(0)).toBe('vence hoy');
    expect(cuandoVence(1)).toBe('vence mañana');
    expect(cuandoVence(5)).toBe('vence en 5 días');
  });
});

describe('avisosDeCuotas', () => {
  it('avisa la primera cuota pendiente de la póliza, no las que vienen después', () => {
    const avisos = avisosDeCuotas([poliza('a', [cuota(1, 'CONFIRMADO', null), cuota(2, 'PENDIENTE', -3), cuota(3, 'PENDIENTE', 27)])]);

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ severidad: 'vencida', titulo: 'Cuota 2 de tu póliza LAP-a', polizaId: 'a' });
    expect(avisos[0]!.detalle).toBe('Toyota Corolla · venció hace 3 días');
  });

  it('una cuota por vencer pronto avisa; una que vence más tarde, todavía no', () => {
    const cerca = poliza('cerca', [cuota(2, 'PENDIENTE', DIAS_AVISO_CUOTA)]);
    const lejos = poliza('lejos', [cuota(2, 'PENDIENTE', DIAS_AVISO_CUOTA + 1)]);

    const avisos = avisosDeCuotas([cerca, lejos]);

    expect(avisos.map((a) => a.polizaId)).toEqual(['cerca']);
    expect(avisos[0]!.severidad).toBe('por-vencer');
  });

  it('una cuota que vence hoy avisa como "por vencer", no como vencida', () => {
    const [a] = avisosDeCuotas([poliza('hoy', [cuota(2, 'PENDIENTE', 0)])]);
    expect(a!.severidad).toBe('por-vencer');
    expect(a!.detalle).toContain('vence hoy');
  });

  it('ordena: primero la más atrasada, luego las que vencen pronto', () => {
    const avisos = avisosDeCuotas([
      poliza('pronto', [cuota(2, 'PENDIENTE', 2)]),
      poliza('atrasada', [cuota(2, 'PENDIENTE', -10)]),
      poliza('poco', [cuota(2, 'PENDIENTE', -1)]),
    ]);
    expect(avisos.map((a) => a.polizaId)).toEqual(['atrasada', 'poco', 'pronto']);
  });

  it('sin avisos: pólizas al contado, todo pagado o sin cuotas', () => {
    expect(
      avisosDeCuotas([
        poliza('contado', [], 'UNICO'),
        poliza('pagada', [cuota(1, 'CONFIRMADO', null), cuota(2, 'CONFIRMADO', null)]),
      ]),
    ).toEqual([]);
    expect(avisosDeCuotas([])).toEqual([]);
  });

  it('una póliza sin pago registrado no rompe', () => {
    expect(avisosDeCuotas([{ id: 'x', pago: null } as unknown as PolizaResumen])).toEqual([]);
  });
});

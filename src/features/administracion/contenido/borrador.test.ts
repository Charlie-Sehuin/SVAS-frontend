import { describe, expect, it } from 'vitest';
import type { ContenidoPlanAdmin } from '../../../shared/types/api';
import { aBorrador, aPeticion, hayErrores, validar } from './borrador';

const CODIGOS = ['DANO_CHOQUE', 'RC_TERCEROS', 'LUNAS'];

const contenido = (extra: Partial<ContenidoPlanAdmin> = {}): ContenidoPlanAdmin => ({
  planId: 'p1',
  aseguradora: 'Rímac',
  plan: 'Oro',
  activo: false,
  resumen: 'Cobertura ampliada',
  descripcion: 'Todo lo de Plata más lunas',
  idealPara: 'Quien no quiere preocuparse',
  coberturas: [
    { codigo: 'DANO_CHOQUE', nombre: 'Daño propio', categoria: 'DANOS_PROPIOS', definida: true, incluida: true, detalle: null, limiteMonto: null },
    { codigo: 'RC_TERCEROS', nombre: 'Responsabilidad civil', categoria: 'RESPONSABILIDAD', definida: true, incluida: true, detalle: 'Hasta USD 200,000', limiteMonto: '200000.00' },
    { codigo: 'LUNAS', nombre: 'Lunas', categoria: 'ADICIONAL', definida: true, incluida: false, detalle: null, limiteMonto: null },
  ],
  exclusiones: ['Conducir con alcohol'],
  requisitos: [{ tipo: 'CONDUCTOR', texto: 'Licencia vigente', obligatorio: true }],
  contenidoActualizadoEn: '2026-11-01T10:00:00-05:00',
  completitud: null,
  advertencias: [],
  ...extra,
});

describe('borrador del contenido de un plan', () => {
  it('un contenido completo no tiene errores', () => {
    expect(hayErrores(validar(aBorrador(contenido()), CODIGOS))).toBe(false);
  });

  it('una cobertura que el plan aún no define queda "sin definir" y bloquea (RN-42: sí o no a todas)', () => {
    const c = contenido();
    c.coberturas[2] = { ...c.coberturas[2]!, definida: false, incluida: null };
    const errores = validar(aBorrador(c), CODIGOS);
    expect(errores.sinDefinir).toBe(1);
    expect(hayErrores(errores)).toBe(true);
  });

  it('exige resumen, descripción e "ideal para", con sus largos máximos', () => {
    const vacio = validar(aBorrador(contenido({ resumen: null, descripcion: null, idealPara: null })), CODIGOS);
    expect(vacio.resumen).toBe('El resumen es obligatorio');
    expect(vacio.descripcion).toBe('La descripción es obligatoria');
    expect(vacio.idealPara).toBe('El campo "ideal para" es obligatorio');
    const largo = validar(aBorrador(contenido({ resumen: 'x'.repeat(161) })), CODIGOS);
    expect(largo.resumen).toBe('El resumen admite hasta 160 caracteres');
  });

  it('exige al menos una exclusión y un requisito, sin vacíos ni repetidos', () => {
    const sin = validar(aBorrador(contenido({ exclusiones: [], requisitos: [] })), CODIGOS);
    expect(sin.exclusiones.general).toBe('Indica al menos una exclusión');
    expect(sin.requisitos.general).toBe('Indica al menos un requisito');

    const mal = validar(aBorrador(contenido({ exclusiones: ['Alcohol', '  ', 'Alcohol'] })), CODIGOS);
    expect(mal.exclusiones.porFila[1]).toBe('Una exclusión no puede ir vacía');
    expect(mal.exclusiones.porFila[2]).toBe('Hay exclusiones repetidas');
  });

  it('el límite de una cobertura incluida debe ser un monto mayor que 0 con hasta 2 decimales', () => {
    const b = aBorrador(contenido());
    for (const [valor, mensaje] of [
      ['0', 'Debe ser mayor que 0'],
      ['10.123', 'Monto con hasta 2 decimales'],
      ['abc', 'Monto con hasta 2 decimales'],
    ] as const) {
      b.coberturas.RC_TERCEROS = { ...b.coberturas.RC_TERCEROS!, limite: valor };
      expect(validar(b, CODIGOS).coberturas.RC_TERCEROS?.limite).toBe(mensaje);
    }
    b.coberturas.RC_TERCEROS = { ...b.coberturas.RC_TERCEROS!, limite: '' };
    expect(validar(b, CODIGOS).coberturas.RC_TERCEROS).toBeUndefined();
  });

  it('el cuerpo del PUT: detalle vacío viaja null y una cobertura no incluida nunca lleva límite', () => {
    const b = aBorrador(contenido());
    // El administrador marca "No incluida" una cobertura que tenía límite: el límite no debe viajar.
    b.coberturas.RC_TERCEROS = { incluida: false, detalle: '', limite: '200000.00' };
    const cuerpo = aPeticion(b, CODIGOS);
    expect(cuerpo.coberturas).toEqual([
      { codigo: 'DANO_CHOQUE', incluida: true, detalle: null, limiteMonto: null },
      { codigo: 'RC_TERCEROS', incluida: false, detalle: null, limiteMonto: null },
      { codigo: 'LUNAS', incluida: false, detalle: null, limiteMonto: null },
    ]);
  });

  it('el cuerpo del PUT recorta los textos y manda el límite como número', () => {
    const b = aBorrador(contenido());
    b.resumen = '  Resumen nuevo  ';
    b.exclusiones = ['  Alcohol  '];
    b.coberturas.RC_TERCEROS = { incluida: true, detalle: '  Hasta USD 250,000 ', limite: '250000,50' };
    const cuerpo = aPeticion(b, CODIGOS);
    expect(cuerpo.resumen).toBe('Resumen nuevo');
    expect(cuerpo.exclusiones).toEqual(['Alcohol']);
    expect(cuerpo.coberturas[1]).toEqual({ codigo: 'RC_TERCEROS', incluida: true, detalle: 'Hasta USD 250,000', limiteMonto: 250000.5 });
  });
});

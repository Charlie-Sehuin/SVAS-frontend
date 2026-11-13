import { parseDecimal } from '../../../shared/lib/forms';
import type { ContenidoPlanAdmin, GuardarContenidoRequest, TipoRequisito } from '../../../shared/types/api';

/**
 * Lo que se edita del contenido de un plan, tal como lo escribe la persona (todo texto). La lógica de validación vive aquí,
 * sin React, para probarla sola: repite las reglas del backend (RN-42), que vuelve a validar al guardar.
 */
export interface BorradorCobertura {
  /** `null` = todavía sin definir (el plan debe decir sí o no a cada cobertura activa, RN-42). */
  incluida: boolean | null;
  detalle: string;
  limite: string;
}
export interface BorradorRequisito {
  tipo: TipoRequisito;
  texto: string;
  obligatorio: boolean;
}
export interface Borrador {
  resumen: string;
  descripcion: string;
  idealPara: string;
  /** Por código de cobertura. */
  coberturas: Record<string, BorradorCobertura>;
  exclusiones: string[];
  requisitos: BorradorRequisito[];
}

export const aBorrador = (c: ContenidoPlanAdmin): Borrador => ({
  resumen: c.resumen ?? '',
  descripcion: c.descripcion ?? '',
  idealPara: c.idealPara ?? '',
  coberturas: Object.fromEntries(
    c.coberturas.map((x) => [x.codigo, { incluida: x.definida ? x.incluida : null, detalle: x.detalle ?? '', limite: x.limiteMonto ?? '' }]),
  ),
  exclusiones: [...c.exclusiones],
  requisitos: c.requisitos.map((r) => ({ tipo: r.tipo, texto: r.texto, obligatorio: r.obligatorio })),
});

export const MAX = { resumen: 160, descripcion: 1000, idealPara: 200, detalle: 200, exclusion: 240, requisito: 240, exclusiones: 30, requisitos: 20 } as const;

export interface ErroresContenido {
  resumen?: string;
  descripcion?: string;
  idealPara?: string;
  /** Por código de cobertura. */
  coberturas: Record<string, { detalle?: string; limite?: string }>;
  sinDefinir: number;
  exclusiones: { general?: string; porFila: Record<number, string> };
  requisitos: { general?: string; porFila: Record<number, string> };
}

const dosDecimales = (t: string) => /^\d+([.,]\d{1,2})?$/.test(t.trim());

export function validar(b: Borrador, codigos: string[]): ErroresContenido {
  const e: ErroresContenido = { coberturas: {}, sinDefinir: 0, exclusiones: { porFila: {} }, requisitos: { porFila: {} } };

  if (!b.resumen.trim()) e.resumen = 'El resumen es obligatorio';
  else if (b.resumen.trim().length > MAX.resumen) e.resumen = `El resumen admite hasta ${MAX.resumen} caracteres`;
  if (!b.descripcion.trim()) e.descripcion = 'La descripción es obligatoria';
  else if (b.descripcion.trim().length > MAX.descripcion) e.descripcion = `La descripción admite hasta ${MAX.descripcion} caracteres`;
  if (!b.idealPara.trim()) e.idealPara = 'El campo "ideal para" es obligatorio';
  else if (b.idealPara.trim().length > MAX.idealPara) e.idealPara = `"Ideal para" admite hasta ${MAX.idealPara} caracteres`;

  for (const codigo of codigos) {
    const c = b.coberturas[codigo];
    if (!c || c.incluida === null) {
      e.sinDefinir += 1;
      continue;
    }
    const err: { detalle?: string; limite?: string } = {};
    if (c.detalle.trim().length > MAX.detalle) err.detalle = `Hasta ${MAX.detalle} caracteres`;
    if (c.incluida && c.limite.trim() !== '') {
      const n = parseDecimal(c.limite);
      if (n === null || !dosDecimales(c.limite)) err.limite = 'Monto con hasta 2 decimales';
      else if (n <= 0) err.limite = 'Debe ser mayor que 0';
    }
    if (err.detalle || err.limite) e.coberturas[codigo] = err;
  }

  if (b.exclusiones.length === 0) e.exclusiones.general = 'Indica al menos una exclusión';
  if (b.exclusiones.length > MAX.exclusiones) e.exclusiones.general = `Máximo ${MAX.exclusiones} exclusiones por plan`;
  const vistas = new Set<string>();
  b.exclusiones.forEach((x, i) => {
    const t = x.trim();
    if (!t) e.exclusiones.porFila[i] = 'Una exclusión no puede ir vacía';
    else if (t.length > MAX.exclusion) e.exclusiones.porFila[i] = `Hasta ${MAX.exclusion} caracteres`;
    else if (vistas.has(t)) e.exclusiones.porFila[i] = 'Hay exclusiones repetidas';
    vistas.add(t);
  });

  if (b.requisitos.length === 0) e.requisitos.general = 'Indica al menos un requisito';
  if (b.requisitos.length > MAX.requisitos) e.requisitos.general = `Máximo ${MAX.requisitos} requisitos por plan`;
  b.requisitos.forEach((r, i) => {
    const t = r.texto.trim();
    if (!t) e.requisitos.porFila[i] = 'El texto del requisito es obligatorio';
    else if (t.length > MAX.requisito) e.requisitos.porFila[i] = `Hasta ${MAX.requisito} caracteres`;
  });

  return e;
}

export const hayErrores = (e: ErroresContenido) =>
  !!(e.resumen || e.descripcion || e.idealPara) ||
  e.sinDefinir > 0 ||
  Object.keys(e.coberturas).length > 0 ||
  !!e.exclusiones.general ||
  Object.keys(e.exclusiones.porFila).length > 0 ||
  !!e.requisitos.general ||
  Object.keys(e.requisitos.porFila).length > 0;

/** Cuerpo de `PUT`. Solo se llama con el borrador ya validado. Un detalle vacío viaja `null` (el backend no admite texto vacío). */
export function aPeticion(b: Borrador, codigos: string[]): GuardarContenidoRequest {
  return {
    resumen: b.resumen.trim(),
    descripcion: b.descripcion.trim(),
    idealPara: b.idealPara.trim(),
    coberturas: codigos.map((codigo) => {
      const c = b.coberturas[codigo]!;
      const incluida = c.incluida === true;
      return {
        codigo,
        incluida,
        detalle: c.detalle.trim() === '' ? null : c.detalle.trim(),
        // Una cobertura que el plan no incluye no lleva límite (el backend lo rechaza).
        limiteMonto: incluida && c.limite.trim() !== '' ? parseDecimal(c.limite) : null,
      };
    }),
    exclusiones: b.exclusiones.map((x) => x.trim()),
    requisitos: b.requisitos.map((r) => ({ tipo: r.tipo, texto: r.texto.trim(), obligatorio: r.obligatorio })),
  };
}

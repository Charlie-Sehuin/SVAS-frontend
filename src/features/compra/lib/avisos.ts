import type { CuotaResumen, PolizaResumen } from '../../../shared/types/api';

/** Una cuota que vence en este número de días o menos ya se avisa (también las vencidas). */
export const DIAS_AVISO_CUOTA = 7;

export type SeveridadAviso = 'vencida' | 'por-vencer';

/**
 * Lo que muestra la campanita. Hoy solo hay avisos de cuotas; más adelante entran las renovaciones de póliza con la
 * misma forma. Todo sale de `GET /polizas/mias`: aquí no se calcula dinero ni fechas (los días ya vienen del backend).
 */
export interface AvisoCuenta {
  id: string;
  severidad: SeveridadAviso;
  titulo: string;
  detalle: string;
  /** La cuota pendiente que motiva el aviso. */
  cuota: CuotaResumen;
  polizaId: string;
  polizaNumero: string;
}

const dias = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;

/** Cuándo vence, en palabras: "venció hace 3 días", "vence hoy", "vence mañana", "vence en 5 días". */
export function cuandoVence(diasParaVencer: number): string {
  if (diasParaVencer < 0) return `venció hace ${dias(-diasParaVencer)}`;
  if (diasParaVencer === 0) return 'vence hoy';
  if (diasParaVencer === 1) return 'vence mañana';
  return `vence en ${dias(diasParaVencer)}`;
}

/**
 * Un aviso por póliza con cuotas por atender: la PRIMERA cuota pendiente (la que hay que pagar antes que las demás,
 * porque se paga en orden). Primero las vencidas, de la más atrasada a la menos; luego las que vencen pronto.
 * Las cuotas que vencen en más de `DIAS_AVISO_CUOTA` días no avisan todavía.
 */
export function avisosDeCuotas(polizas: PolizaResumen[]): AvisoCuenta[] {
  const avisos: AvisoCuenta[] = [];
  for (const p of polizas) {
    const siguiente = (p.pago?.cuotas ?? [])
      .filter((c) => c.estado === 'PENDIENTE' && c.diasParaVencer !== null)
      .sort((a, b) => a.numero - b.numero)[0];
    if (!siguiente || siguiente.diasParaVencer === null || siguiente.diasParaVencer > DIAS_AVISO_CUOTA) continue;
    const vencida = siguiente.diasParaVencer < 0;
    avisos.push({
      id: `cuota-${p.id}-${siguiente.numero}`,
      severidad: vencida ? 'vencida' : 'por-vencer',
      titulo: `Cuota ${siguiente.numero} de tu póliza ${p.numero}`,
      detalle: `${p.vehiculo.marca} ${p.vehiculo.modelo} · ${cuandoVence(siguiente.diasParaVencer)}`,
      cuota: siguiente,
      polizaId: p.id,
      polizaNumero: p.numero,
    });
  }
  return avisos.sort((a, b) => (a.cuota.diasParaVencer ?? 0) - (b.cuota.diasParaVencer ?? 0));
}

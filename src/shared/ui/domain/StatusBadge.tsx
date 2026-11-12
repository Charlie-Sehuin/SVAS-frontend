import { Badge, type BadgeProps } from '../badge';

/**
 * Única fuente de verdad de estados (arquitectura §4.2, tabla 2.3 / diseño
 * §3.5): un estado = un color en todo el sistema, y SIEMPRE con texto.
 */
type Tone = NonNullable<BadgeProps['tone']>;

const ESTADOS = {
  cotizacion: {
    REGISTRADA: { tone: 'progress', texto: 'Cotizada' },
    NO_CONCRETADA: { tone: 'neutral', texto: 'No concretada' },
    CONVERTIDA: { tone: 'success', texto: 'Convertida' },
  },
  solicitud: {
    PENDIENTE: { tone: 'pending', texto: 'Pendiente' },
    EN_ATENCION: { tone: 'progress', texto: 'En atención' },
    CERRADA: { tone: 'neutral', texto: 'Cerrada' },
  },
  seguimiento: {
    EN_SEGUIMIENTO: { tone: 'progress', texto: 'En seguimiento' },
    CONVERTIDO: { tone: 'success', texto: 'Convertido' },
    DESCARTADO: { tone: 'neutral', texto: 'Descartado' },
  },
  pago: {
    PENDIENTE: { tone: 'pending', texto: 'Pendiente' },
    CONFIRMADO: { tone: 'success', texto: 'Confirmado' },
    RECHAZADO: { tone: 'danger', texto: 'Rechazado' },
  },
  cuota: {
    PENDIENTE: { tone: 'pending', texto: 'Pendiente' },
    CONFIRMADO: { tone: 'success', texto: 'Pagada' },
  },
  orden: {
    PENDIENTE_PAGO: { tone: 'pending', texto: 'Pendiente de pago' },
    CONFIRMADO: { tone: 'success', texto: 'Confirmada' },
  },
  usuario: {
    ACTIVO: { tone: 'success', texto: 'Activo' },
    INACTIVO: { tone: 'neutral', texto: 'Inactivo' },
  },
  completitud: {
    COMPLETO: { tone: 'success', texto: 'Completo' },
    INCOMPLETO: { tone: 'warning', texto: 'Incompleto' },
    INCOHERENTE: { tone: 'warning', texto: 'Incoherente' },
  },
} as const satisfies Record<string, Record<string, { tone: Tone; texto: string }>>;

export type EntidadEstado = keyof typeof ESTADOS;
export type ValorEstado<E extends EntidadEstado> = keyof (typeof ESTADOS)[E] & string;

interface StatusBadgeProps<E extends EntidadEstado> {
  entity: E;
  value: ValorEstado<E> | (string & {});
  className?: string;
}

export function StatusBadge<E extends EntidadEstado>({ entity, value, className }: StatusBadgeProps<E>) {
  const tabla = ESTADOS[entity] as Record<string, { tone: Tone; texto: string }>;
  const def = tabla[value] ?? { tone: 'neutral' as Tone, texto: value.replaceAll('_', ' ').toLowerCase() };
  return (
    <Badge tone={def.tone} className={className}>
      {def.texto}
    </Badge>
  );
}

/** Texto del estado sin el badge (para tooltips, aria, tablas compactas). */
export function textoEstado<E extends EntidadEstado>(entity: E, value: string): string {
  const tabla = ESTADOS[entity] as Record<string, { tone: Tone; texto: string }>;
  return tabla[value]?.texto ?? value;
}

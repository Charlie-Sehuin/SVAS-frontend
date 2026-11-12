/**
 * Enums del dominio. Espejo EXACTO de los enums de Postgres tal como los
 * expone el backend (`svas-backend/src/shared/types/enums.ts`, doc de dominio
 * §4.2). Si cambia un enum en el backend, se cambia aquí en la misma PR.
 * Son `string literal unions` y no `enum` de TS: son la frontera del JSON.
 */
export type Rol = 'CLIENTE' | 'ASESOR' | 'ADMINISTRADOR';
export type RolInterno = Exclude<Rol, 'CLIENTE'>;

export type UsoVehiculo = 'PARTICULAR' | 'COMERCIAL_LIGERO' | 'TRANSPORTE_PASAJEROS';
export type CanalContacto = 'LLAMADA' | 'WHATSAPP';
export type EstadoCotizacion = 'REGISTRADA' | 'CONVERTIDA' | 'NO_CONCRETADA';
/** Opciones de venta de una cotización (campo `opciones`). */
export type OpcionCotizacion = 'COMPRA_INMEDIATA' | 'ASESORIA';
export type MotivoAsesoria = 'DUDA' | 'NEGOCIACION' | 'DESCUENTO' | 'INSPECCION' | 'NO_ASEGURABLE';
export type MotivoDerivacion = Extract<MotivoAsesoria, 'INSPECCION' | 'NO_ASEGURABLE'>;
export type OrigenCaso = 'SISTEMA' | 'CLIENTE';
export type EstadoSolicitudAsesoria = 'PENDIENTE' | 'EN_ATENCION' | 'CERRADA';
export type TipoDescuento = 'PRIMERA_COMPRA' | 'NEGOCIADO';
export type EstadoSeguimiento = 'EN_SEGUIMIENTO' | 'CONVERTIDO' | 'DESCARTADO';
export type MotivoCierre = 'PRECIO' | 'YA_CONTRATO' | 'NO_RESPONDE' | 'SIN_INTERES' | 'OTRO';
export type ResultadoIntento = 'CONTACTADO' | 'NO_RESPONDE' | 'RECHAZA' | 'ACEPTA';
export type ModoPago = 'UNICO' | 'CUOTAS';
export type EstadoPago = 'PENDIENTE' | 'CONFIRMADO' | 'RECHAZADO';
export type EstadoCuota = 'PENDIENTE' | 'CONFIRMADO';
export type EstadoOrden = 'PENDIENTE_PAGO' | 'CONFIRMADO';
export type CanalVenta = 'AUTONOMO' | 'ASESORIA' | 'TELEMARKETING';
export type TipoCampo = 'TEXTO' | 'NUMERO' | 'LISTA';
export type OrigenValores = 'ESTATICO' | 'CATALOGO';
export type ZonaRiesgo = 'ALTA' | 'MEDIA' | 'BAJA';
export type CondicionTaller = 'AFILIADO' | 'CUALQUIERA';
export type VariablePerfil = 'ESTACIONA_COCHERA' | 'KM_MES_ALTO' | 'USO_NOCTURNO';
export type MotivoNoDisponible = 'SIN_RANGO' | 'PESO_FALTANTE' | 'ERROR_ESTRATEGIA';

export const USOS_VEHICULO: readonly UsoVehiculo[] = ['PARTICULAR', 'COMERCIAL_LIGERO', 'TRANSPORTE_PASAJEROS'];
export const TIPOS_CAMPO: readonly TipoCampo[] = ['TEXTO', 'NUMERO', 'LISTA'];

/** Textos en lenguaje llano para mostrar enums (voz y tono, diseño visual §14). */
export const TEXTO_USO: Record<UsoVehiculo, string> = {
  PARTICULAR: 'Particular',
  COMERCIAL_LIGERO: 'Comercial ligero',
  TRANSPORTE_PASAJEROS: 'Transporte de pasajeros',
};
export const TEXTO_TIPO_CAMPO: Record<TipoCampo, string> = {
  TEXTO: 'Texto',
  NUMERO: 'Número',
  LISTA: 'Lista de opciones',
};
export const TEXTO_ROL: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  ASESOR: 'Asesor',
  ADMINISTRADOR: 'Administrador',
};

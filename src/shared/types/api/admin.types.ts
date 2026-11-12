import type { OrigenValores, Rol, RolInterno, TipoCampo, UsoVehiculo } from '../enums';
import type { FechaIso, Monto, Uuid } from './comunes.types';
import type { Usuario } from './seguridad.types';

/** Respuesta paginada (usuarios, bitácora). */
export interface Paginada<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

/* ───────────── Usuarios (RF-31) ───────────── */
export type PaginaUsuarios = Paginada<Usuario>;
export interface FiltroUsuarios {
  rol?: Rol;
  activo?: boolean;
  busqueda?: string;
  pagina: number;
  tamano: number;
}
export interface CrearUsuarioResponse {
  usuario: Usuario;
  /** Se muestra UNA sola vez; no hay SMTP propio para invitaciones. */
  contrasenaTemporal: string;
}
export type { RolInterno };

/* ───────────── Catálogo ───────────── */
export type CodigoEstrategia = 'RIMAC' | 'PACIFICO' | 'LA_POSITIVA' | 'MAPFRE' | 'QUALITAS';

export interface AseguradoraAdmin {
  id: Uuid;
  nombre: string;
  activa: boolean;
  codigoEstrategia: CodigoEstrategia;
}

export interface PlanAdmin {
  id: Uuid;
  aseguradoraId: Uuid;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}
export interface CrearPlanRequest {
  aseguradoraId: Uuid;
  nombre: string;
  descripcion?: string | null;
}
export interface EditarPlanRequest {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface CampoAdmin {
  id: Uuid;
  aseguradoraId: Uuid;
  nombre: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  activo: boolean;
  origenValores: OrigenValores;
  valores: string[];
}
export interface GuardarCampoRequest {
  nombre: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  origenValores: OrigenValores;
  valores: string[];
  activo?: boolean;
}
export interface CrearCampoRequest extends GuardarCampoRequest {
  aseguradoraId: Uuid;
}

export interface ReglaInspeccion {
  aseguradoraId: Uuid;
  uso: UsoVehiculo;
  requiereInspeccion: boolean;
}

/** Porcentajes y tipo de cambio llegan como string decimal. */
export interface ParametrosComerciales {
  descuentoPrimeraCompra: Monto;
  descuentoMaximo: Monto;
  maxIntentos: number;
  diasSeguimiento: number;
  maxCuotas: number;
  vigenciaEnlaceDias: number;
  horasAbandono: number;
  moneda: string;
  tipoCambioReferencial: Monto;
}
/** Se envían como número (el backend valida decimales). */
export interface ActualizarParametrosRequest {
  descuentoPrimeraCompra?: number;
  descuentoMaximo?: number;
  maxIntentos?: number;
  diasSeguimiento?: number;
  maxCuotas?: number;
  vigenciaEnlaceDias?: number;
  horasAbandono?: number;
  moneda?: string;
  tipoCambioReferencial?: number;
}

/* ───────────── Bitácora (RNF-12) ───────────── */
export interface EntradaBitacora {
  id: Uuid;
  usuarioId: Uuid | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  /** Solo lo ve el ADMINISTRADOR; suele traer `antes` / `despues`. */
  detalle: unknown;
  fecha: FechaIso;
}
export type PaginaBitacora = Paginada<EntradaBitacora>;
export interface FiltroBitacora {
  entidad?: string;
  desde?: string;
  hasta?: string;
  pagina: number;
  tamano: number;
}

export interface PanelAdmin {
  aseguradoras: { total: number; activas: number };
  planes: { total: number; activos: number };
  campos: { total: number; activos: number };
  ultimosCambios: EntradaBitacora[];
}

/* ───────────── Tarifas (doc de dominio §17) ───────────── */
export type TablaPeso = 'marca' | 'modelo' | 'anio' | 'tipo' | 'ubigeo';

export interface TarifaPlan {
  planId: Uuid;
  plan: string;
  aseguradoraId: Uuid;
  /** `null` = el plan aún no tiene tarifa y no cotiza. */
  tasaBase: string | null;
  parametros: Record<string, unknown> | null;
  actualizadoEn: FechaIso | null;
}
export interface GuardarTarifaPlanRequest {
  tasaBase: number;
  parametros: Record<string, unknown>;
}

export interface PesoVista {
  clave: string;
  nombre: string;
  peso: string;
}
export interface FilaPeso {
  clave: string;
  peso: number;
}

export interface RangoVista {
  modeloId: Uuid;
  marca: string;
  modelo: string;
  anio: number;
  sumaMinima: Monto;
  sumaMaxima: Monto;
}
export interface FilaRango {
  modeloId: Uuid;
  anio: number;
  sumaMinima: number;
  sumaMaxima: number;
}
export interface ResumenCarga {
  recibidas: number;
  cambiadas: number;
  total: number;
}

export interface FaltanteTarifa {
  aseguradoraId: Uuid;
  codigoEstrategia: CodigoEstrategia;
  modeloId: Uuid;
  marca: string;
  modelo: string;
  anio: number;
  sinRango: boolean;
  pesosFaltantes: TablaPeso[];
}
export interface CompletitudTarifas {
  completa: boolean;
  sinRango: number;
  conPesosFaltantes: number;
  items: FaltanteTarifa[];
}

/* Simulador (RN-41) */
export interface SimularTarifaRequest {
  modeloId: Uuid;
  anio: number;
  ubigeo: string;
  sumaAsegurada?: number;
}

/** Instantánea del cálculo (RN-41). Además de los campos fijos, cada estrategia añade sus pasos (p. ej. `tasa`, `cargoFijo`). */
export interface DetalleCalculoTarifa {
  estrategia: string;
  sumaAsegurada: Monto;
  rango: { minima: Monto; maxima: Monto };
  tasaBase: string;
  parametros: Record<string, unknown>;
  pesos: Record<string, string>;
  ubigeoPorDefecto?: boolean;
  primaAnual: Monto;
  totalEnCuotas: Monto;
  [paso: string]: unknown;
}

export interface SimulacionPlan {
  planId: Uuid;
  plan: string;
  disponible: boolean;
  motivoNoDisponible: 'SIN_RANGO' | 'PESO_FALTANTE' | 'ERROR_ESTRATEGIA' | null;
  sumaAsegurada: Monto | null;
  prima: Monto | null;
  primaMensual: Monto | null;
  detalleCalculo: DetalleCalculoTarifa | null;
}
export interface SimulacionAseguradora {
  aseguradoraId: Uuid;
  aseguradora: string;
  codigoEstrategia: CodigoEstrategia;
  rangoSuma: { minima: Monto; maxima: Monto } | null;
  errorSuma?: string;
  planes: SimulacionPlan[];
}
export interface SimularTarifaResponse {
  vehiculo: { marca: string; modelo: string; tipo: string; anio: number; ubigeo: string };
  aseguradoras: SimulacionAseguradora[];
}

import type {
  CanalContacto,
  EstadoCotizacion,
  MotivoDerivacion,
  MotivoNoDisponible,
  OpcionCotizacion,
  OrigenValores,
  TipoCampo,
  UsoVehiculo,
} from '../enums';
import type { DetalleCalculoTarifa } from './admin.types';
import type { FechaIso, Monto, Uuid, Warning } from './comunes.types';

/* ───────────── Catálogo público (doc conexión §6 · Cotización) ───────────── */

export interface AseguradoraCatalogo {
  id: Uuid;
  nombre: string;
}

/** Campo del formulario dinámico (RF-02, RN-17). */
export interface CampoCatalogo {
  nombre: string;
  tipo: TipoCampo;
  obligatorio: boolean;
  origenValores: OrigenValores;
  /** Vacío cuando `origenValores = 'CATALOGO'` (marca, modelo, anio, ubigeo). */
  valoresPermitidos: string[];
  /** Aseguradoras que piden este campo: "Pacífico necesita el distrito…". */
  aseguradoras: string[];
}

export interface CatalogoCampos {
  aseguradoras: AseguradoraCatalogo[];
  campos: CampoCatalogo[];
}

export interface Marca {
  id: Uuid;
  nombre: string;
}
export interface Modelo {
  id: Uuid;
  nombre: string;
  tipo: string;
}
export interface Departamento {
  departamento: string;
}
export interface Provincia {
  provincia: string;
}
export interface Distrito {
  ubigeo: string;
  distrito: string;
}

/* ───────────── Cotización ───────────── */

export interface RangoSuma {
  minima: Monto;
  maxima: Monto;
}

/** Una prima cotizada = un plan de una aseguradora. */
export interface PrimaCotizada {
  id: Uuid;
  aseguradoraId: Uuid;
  aseguradora: string;
  planId: Uuid;
  plan: string;
  /** Frase de venta; `null` hasta que exista el contenido del plan. */
  resumen: string | null;
  disponible: boolean;
  sumaAsegurada: Monto | null;
  rangoSuma: RangoSuma | null;
  /** Prima anual al contado. */
  prima: Monto | null;
  /** Cuota si elige 12 cuotas (RN-38); es el precio protagonista. */
  primaMensual: Monto | null;
  motivoNoDisponible: MotivoNoDisponible | null;
  /** Solo lo recibe ASESOR/ADMIN (RN-41). */
  detalleCalculo?: DetalleCalculoTarifa | null;
}

export interface Cotizacion {
  id: Uuid;
  estado: EstadoCotizacion;
  opciones: OpcionCotizacion[];
  motivoDerivacion: MotivoDerivacion | null;
  primas: PrimaCotizada[];
  creadoEn?: FechaIso;
  vehiculo?: VehiculoCotizado;
  ubicacion?: { ubigeo: string; distrito?: string; provincia?: string; departamento?: string };
  contacto?: ContactoCotizacion;
}

export interface VehiculoCotizado {
  marca: string;
  modelo: string;
  anio: number;
  uso: UsoVehiculo;
  tipo?: string;
  placa?: string | null;
}

export interface ContactoCotizacion {
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  canalPreferido: CanalContacto;
}

export interface CrearCotizacionRequest {
  vehiculo: {
    uso: UsoVehiculo;
    marcaId: Uuid;
    modeloId: Uuid;
    anio: number;
    clase?: string | null;
    placa?: string | null;
  };
  ubicacion: { ubigeo: string };
  contacto: ContactoCotizacion;
  /** Campos extra del catálogo (RF-02) que no caben arriba. */
  [extra: string]: unknown;
}

export interface CrearCotizacionResponse {
  cotizacion: Cotizacion;
  /** Solo llega aquí; se guarda en sessionStorage, nunca en localStorage. */
  tokenAcceso: string;
  warning?: Warning;
}

export interface ActualizarSumaRequest {
  sumaAsegurada: Monto;
}

export interface ActualizarSumaResponse {
  /** Solo las primas de esa aseguradora. */
  primas: PrimaCotizada[];
  warning?: Warning;
}

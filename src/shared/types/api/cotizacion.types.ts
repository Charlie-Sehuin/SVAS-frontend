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

/** Resumen del vehículo que devuelve el backend (no incluye el contacto del cliente). */
export interface VehiculoCotizado {
  uso: UsoVehiculo;
  marca: string;
  modelo: string;
  tipo: string;
  anio: number;
  ubigeo: string;
  distrito?: string;
}

export interface Cotizacion {
  id: Uuid;
  estado: EstadoCotizacion;
  fecha: FechaIso;
  opciones: OpcionCotizacion[];
  motivoDerivacion: MotivoDerivacion | null;
  vehiculo: VehiculoCotizado;
  primas: PrimaCotizada[];
}

export interface ContactoCotizacion {
  nombres: string;
  apellidos: string;
  /** Celular peruano de 9 dígitos que empieza con 9. */
  telefono: string;
  email: string;
  canalPreferido: CanalContacto;
}

/** Cuerpo de `POST /cotizaciones`. No lleva suma asegurada ni documento (se pide al comprar). */
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
}

export interface CrearCotizacionResponse {
  cotizacion: Cotizacion;
  /** Solo llega aquí; se guarda en sessionStorage, nunca en localStorage. */
  tokenAcceso: string;
  warning?: Warning;
}

/** `GET /cotizaciones/:id/resumen`. */
export interface ResumenCotizacionResponse {
  cotizacion: Cotizacion;
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

/** `GET /cotizaciones/mias` (CLIENTE). */
export interface MiCotizacion {
  id: Uuid;
  fecha: FechaIso;
  estado: EstadoCotizacion;
  vehiculo: { marca: string; modelo: string; anio: number };
  /** La cuota mensual más baja entre sus planes disponibles. */
  primaMensualDesde: Monto | null;
}

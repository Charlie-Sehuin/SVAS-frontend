import type { CodigoEstrategia, TablaPeso } from '../types/api';

/**
 * Qué usa cada aseguradora en su fórmula. Es un ESPEJO de las Estrategias del backend
 * (`svas-backend/src/integracion/estrategias/*`, doc de dominio §17.5): el backend no expone
 * estos datos por API. Si cambia una Estrategia, se cambia aquí en la misma PR.
 *
 * Esto solo decide qué pantallas y campos se muestran. La fórmula vive únicamente en el backend (RN-40)
 * y el backend vuelve a validar todo lo que se guarda.
 */
export interface UsoPesos {
  requeridos: readonly TablaPeso[];
  opcionales: readonly TablaPeso[];
}

export const PESOS_POR_ESTRATEGIA: Record<CodigoEstrategia, UsoPesos> = {
  RIMAC: { requeridos: ['marca', 'modelo', 'anio'], opcionales: [] },
  PACIFICO: { requeridos: ['marca', 'modelo', 'anio'], opcionales: ['ubigeo'] },
  LA_POSITIVA: { requeridos: ['marca', 'modelo', 'anio', 'tipo'], opcionales: [] },
  MAPFRE: { requeridos: ['marca', 'modelo', 'anio'], opcionales: [] },
  QUALITAS: { requeridos: ['marca', 'modelo', 'anio'], opcionales: [] },
};

/** Lo que usa la clase base del backend (`EstrategiaBase`) cuando una aseguradora no lo cambia. */
const PESOS_POR_DEFECTO: UsoPesos = { requeridos: ['marca', 'modelo', 'anio'], opcionales: [] };

/**
 * Pesos de una aseguradora. Si el backend agrega una aseguradora y aún no está en la tabla de arriba,
 * se usa lo de la clase base en vez de romper la pantalla (el código llega como texto de la API).
 */
export function usoPesos(codigo: string): UsoPesos {
  return (PESOS_POR_ESTRATEGIA as Partial<Record<string, UsoPesos>>)[codigo] ?? PESOS_POR_DEFECTO;
}

/** Parámetros de plan de una aseguradora; una aseguradora desconocida no muestra ninguno. */
export function parametrosDe(codigo: string): ParametroPlan[] {
  return (PARAMETROS_POR_ESTRATEGIA as Partial<Record<string, ParametroPlan[]>>)[codigo] ?? [];
}

export const NOMBRE_PESO: Record<TablaPeso, string> = {
  marca: 'Marca',
  modelo: 'Modelo',
  anio: 'Año',
  tipo: 'Tipo de vehículo',
  ubigeo: 'Distrito (ubigeo)',
};

export function tablasDe(codigo: string): TablaPeso[] {
  const u = usoPesos(codigo);
  return [...u.requeridos, ...u.opcionales];
}

/** Rango válido de un peso (RN-40): menor que 1 = descuento, mayor que 1 = recargo. */
export const PESO_MIN = 0.5;
export const PESO_MAX = 3;
export const PESO_DECIMALES = 3;

/** Tasa base: fracción (0.0420 = 4,2 %), hasta 4 decimales, entre 0.0001 y 0.9999. */
export const TASA_MIN = 0.0001;
export const TASA_MAX = 0.9999;
export const TASA_DECIMALES = 4;

/** Parámetros propios de cada plan (`tarifa_plan.parametros`). El backend rechaza claves que no sean estas. */
export interface ParametroPlan {
  clave: string;
  etiqueta: string;
  ayuda: string;
  /** `monto` = USD; `fraccion` = 0.05 = 5 %. */
  tipo: 'monto' | 'fraccion';
  min: number;
  /** Tope; si `maxExclusivo`, el valor debe ser estrictamente menor. */
  max: number;
  maxExclusivo?: boolean;
  /** Si el mínimo es exclusivo (el valor debe ser mayor que `min`). */
  minExclusivo?: boolean;
}

export const PARAMETROS_POR_ESTRATEGIA: Record<CodigoEstrategia, ParametroPlan[]> = {
  RIMAC: [],
  PACIFICO: [
    {
      clave: 'cargo_fijo_anual',
      etiqueta: 'Cargo fijo anual (USD)',
      ayuda: 'Monto que se suma a la prima de cada plan.',
      tipo: 'monto',
      min: 0,
      max: 10_000,
    },
  ],
  LA_POSITIVA: [
    {
      clave: 'recargo_pago_mensual',
      etiqueta: 'Recargo por pago en cuotas',
      ayuda: 'Fracción: 0.05 = 5 %. Se refleja en el total que se cobra en 12 cuotas.',
      tipo: 'fraccion',
      min: 0,
      max: 1,
      maxExclusivo: true,
    },
  ],
  MAPFRE: [
    {
      clave: 'prima_minima_anual',
      etiqueta: 'Prima mínima anual (USD)',
      ayuda: 'Ninguna prima anual baja de este monto.',
      tipo: 'monto',
      min: 0,
      minExclusivo: true,
      max: 100_000,
    },
  ],
  QUALITAS: [
    {
      clave: 'descuento_comercial',
      etiqueta: 'Descuento comercial',
      ayuda: 'Fracción: 0.05 = 5 %.',
      tipo: 'fraccion',
      min: 0,
      max: 1,
      maxExclusivo: true,
    },
  ],
};

/** Etiqueta legible de una clave técnica (p. ej. `cargo_fijo_anual` → "Cargo fijo anual"). */
export function etiquetaParametro(clave: string): string {
  const p = Object.values(PARAMETROS_POR_ESTRATEGIA)
    .flat()
    .find((x) => x.clave === clave);
  if (p) return p.etiqueta.replace(/ \(USD\)$/, '');
  const texto = clave.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

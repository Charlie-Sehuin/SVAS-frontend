import { api } from '../../../shared/lib/api-client';
import { qs } from '../../../shared/lib/forms';
import type {
  CoberturaAdmin,
  EscenarioAdmin,
  FactorAdmin,
  FilaCoberturaRequest,
  FilaFactorRequest,
  FilaFrecuenciaRequest,
  FilaZonaRequest,
  FrecuenciaAdmin,
  GuardarEscenarioRequest,
  ResumenCargaChoque,
  ZonaAdmin,
} from '../../../shared/types/api';
import type { UsoVehiculo, ZonaRiesgo } from '../../../shared/types/enums';

/** Catálogo de la Prueba de Choque (solo ADMINISTRADOR). Cada guardado deja el antes y el después en la bitácora. */

export const listarEscenariosAdmin = () => api.get('admin/prueba-choque/escenarios').json<EscenarioAdmin[]>();

/** Crea el escenario si el código no existe; si existe, lo reemplaza. */
export const guardarEscenario = (codigo: string, body: GuardarEscenarioRequest) =>
  api.put(`admin/prueba-choque/escenarios/${codigo}`, { json: body }).json<EscenarioAdmin>();

export const listarCoberturasAdmin = (f: { planId?: string | undefined; escenario?: string | undefined }) =>
  api.get('admin/prueba-choque/coberturas', { searchParams: qs({ ...f }) }).json<CoberturaAdmin[]>();

export const guardarCoberturas = (filas: FilaCoberturaRequest[]) =>
  api.put('admin/prueba-choque/coberturas', { json: { filas } }).json<ResumenCargaChoque>();

export const listarFrecuenciasAdmin = (f: { escenario?: string | undefined; uso?: UsoVehiculo | undefined }) =>
  api.get('admin/prueba-choque/frecuencias', { searchParams: qs({ ...f }) }).json<FrecuenciaAdmin[]>();

export const guardarFrecuencias = (filas: FilaFrecuenciaRequest[]) =>
  api.put('admin/prueba-choque/frecuencias', { json: { filas } }).json<ResumenCargaChoque>();

/** Solo los distritos con zona propia; el resto cuenta como MEDIA. */
export const listarZonasAdmin = (zona?: ZonaRiesgo) =>
  api.get('admin/prueba-choque/zonas', { searchParams: qs({ zona }) }).json<ZonaAdmin[]>();

export const guardarZonas = (filas: FilaZonaRequest[]) =>
  api.put('admin/prueba-choque/zonas', { json: { filas } }).json<ResumenCargaChoque>();

export const listarFactoresAdmin = (escenario?: string) =>
  api.get('admin/prueba-choque/factores', { searchParams: qs({ escenario }) }).json<FactorAdmin[]>();

export const guardarFactores = (filas: FilaFactorRequest[]) =>
  api.put('admin/prueba-choque/factores', { json: { filas } }).json<ResumenCargaChoque>();

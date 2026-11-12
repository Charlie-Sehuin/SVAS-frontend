import { api } from '../../../shared/lib/api-client';
import { qs } from '../../../shared/lib/forms';
import type {
  CatalogoCampos,
  Departamento,
  Distrito,
  Marca,
  Modelo,
  Provincia,
} from '../../../shared/types/api';

/** Catálogo público del formulario de cotización (doc conexión §6). Sin JWT. */
export const obtenerCampos = () => api.get('catalogo/campos').json<CatalogoCampos>();
export const listarMarcas = () => api.get('catalogo/vehiculos/marcas').json<Marca[]>();
export const listarModelos = (marcaId: string) =>
  api.get(`catalogo/vehiculos/marcas/${marcaId}/modelos`).json<Modelo[]>();
export const listarAnios = (modeloId: string) => api.get(`catalogo/vehiculos/modelos/${modeloId}/anios`).json<number[]>();

export const listarDepartamentos = () => api.get('catalogo/ubigeos/departamentos').json<Departamento[]>();
export const listarProvincias = (departamento: string) =>
  api.get('catalogo/ubigeos/provincias', { searchParams: qs({ departamento }) }).json<Provincia[]>();
export const listarDistritos = (departamento: string, provincia: string) =>
  api.get('catalogo/ubigeos/distritos', { searchParams: qs({ departamento, provincia }) }).json<Distrito[]>();

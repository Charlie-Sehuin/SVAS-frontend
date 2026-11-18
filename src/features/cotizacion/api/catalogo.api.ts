import { api } from '../../../shared/lib/api-client';
import { qs } from '../../../shared/lib/forms';
import type {
  CatalogoCampos,
  Departamento,
  Distrito,
  Marca,
  Modelo,
  Provincia,
  TarjetaLeida,
  VehiculoReconocido,
} from '../../../shared/types/api';

/** Catálogo público del formulario de cotización (doc conexión §6). Sin JWT. */
export const obtenerCampos = () => api.get('catalogo/campos').json<CatalogoCampos>();
export const listarMarcas = () => api.get('catalogo/vehiculos/marcas').json<Marca[]>();
export const listarModelos = (marcaId: string) =>
  api.get(`catalogo/vehiculos/marcas/${marcaId}/modelos`).json<Modelo[]>();
export const listarAnios = (modeloId: string) => api.get(`catalogo/vehiculos/modelos/${modeloId}/anios`).json<number[]>();

/** Foto del auto → marca y modelo del catálogo. Multipart: ky pone solo el Content-Type con el boundary. */
export const reconocerVehiculo = (foto: Blob) => {
  const body = new FormData();
  body.append('foto', foto, 'foto.jpg');
  return api.post('catalogo/vehiculos/reconocer', { body }).json<VehiculoReconocido>();
};

/** Tarjeta de propiedad (foto o PDF) → marca, modelo, año y placa. Los PDF viajan tal cual. */
export const leerTarjeta = (archivo: Blob) => {
  const body = new FormData();
  body.append('tarjeta', archivo, archivo.type === 'application/pdf' ? 'tarjeta.pdf' : 'tarjeta.jpg');
  return api.post('catalogo/vehiculos/leer-tarjeta', { body }).json<TarjetaLeida>();
};

export const listarDepartamentos = () => api.get('catalogo/ubigeos/departamentos').json<Departamento[]>();
export const listarProvincias = (departamento: string) =>
  api.get('catalogo/ubigeos/provincias', { searchParams: qs({ departamento }) }).json<Provincia[]>();
export const listarDistritos = (departamento: string, provincia: string) =>
  api.get('catalogo/ubigeos/distritos', { searchParams: qs({ departamento, provincia }) }).json<Distrito[]>();

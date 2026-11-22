import type { VehiculoGuardado } from '../../../shared/types/api';
import type { BorradorCotizar } from '../store/useCotizarWizardStore';

/** "Toyota Corolla 2022" */
export const nombreVehiculo = (v: Pick<VehiculoGuardado, 'marca' | 'modelo' | 'anio'>) => `${v.marca.nombre} ${v.modelo.nombre} ${v.anio}`;

/**
 * Lo que el formulario de cotizar necesita de un auto ya cotizado: vehículo, uso, placa, clase y dónde circula.
 * El contacto no va aquí (con la sesión iniciada el paso de contacto se prellena con los datos de la cuenta).
 * Sin placa se marca "No tengo placa" y sin ubicación se deja vacía: la persona solo completa lo que falte.
 */
export function vehiculoABorrador(v: VehiculoGuardado): Pick<BorradorCotizar, 'vehiculo' | 'uso' | 'placa' | 'sinPlaca' | 'clase' | 'ubicacion'> {
  return {
    vehiculo: { marcaId: v.marca.id, modeloId: v.modelo.id, anio: String(v.anio) },
    uso: v.uso,
    placa: v.placa ?? '',
    sinPlaca: v.placa === null,
    clase: v.clase ?? '',
    ubicacion: v.ubicacion
      ? { departamento: v.ubicacion.departamento, provincia: v.ubicacion.provincia, ubigeo: v.ubicacion.ubigeo }
      : { departamento: '', provincia: '', ubigeo: '' },
  };
}

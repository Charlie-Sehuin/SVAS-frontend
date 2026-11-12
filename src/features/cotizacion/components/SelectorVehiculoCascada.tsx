import { Field } from '../../../shared/ui/field';
import { Select } from '../../../shared/ui/select';
import { useAnios, useMarcas, useModelos } from '../hooks/useCatalogo';

export interface ValorVehiculo {
  marcaId: string;
  modeloId: string;
  anio: string;
}
export const VEHICULO_VACIO: ValorVehiculo = { marcaId: '', modeloId: '', anio: '' };

interface Props {
  value: ValorVehiculo;
  onChange: (v: ValorVehiculo) => void;
  disabled?: boolean;
  /** Errores por campo (zod o backend). */
  errores?: Partial<Record<keyof ValorVehiculo, string>>;
  /** Si es true, el año no se pide (p. ej. filtros de rangos de suma). */
  sinAnio?: boolean;
  /** Alto compacto para backoffice. */
  compact?: boolean;
}

/**
 * Marca → modelo → año encadenados con `GET /catalogo/vehiculos/*` (arquitectura §6.9).
 * Al cambiar la marca se limpian modelo y año; al cambiar el modelo, el año. Los siguientes
 * permanecen deshabilitados hasta tener opciones y muestran "Cargando…". El año NO tiene valor
 * por defecto (RN-44) y el tipo de vehículo no se pregunta: lo deduce el backend.
 */
export function SelectorVehiculoCascada({ value, onChange, disabled, errores, sinAnio, compact }: Props) {
  const marcas = useMarcas();
  const modelos = useModelos(value.marcaId || null);
  const anios = useAnios(value.modeloId || null);

  return (
    <>
      <Field label="Marca" required error={errores?.marcaId ?? (marcas.isError ? 'No pudimos cargar las marcas.' : undefined)}>
        {(p) => (
          <Select
            {...p}
            compact={compact}
            value={value.marcaId}
            disabled={disabled || marcas.isLoading}
            onChange={(e) => onChange({ marcaId: e.target.value, modeloId: '', anio: '' })}
          >
            <option value="">{marcas.isLoading ? 'Cargando…' : 'Selecciona la marca'}</option>
            {marcas.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Modelo" required error={errores?.modeloId ?? (modelos.isError ? 'No pudimos cargar los modelos.' : undefined)}>
        {(p) => (
          <Select
            {...p}
            compact={compact}
            value={value.modeloId}
            disabled={disabled || !value.marcaId || modelos.isLoading}
            onChange={(e) => onChange({ ...value, modeloId: e.target.value, anio: '' })}
          >
            <option value="">{modelos.isLoading ? 'Cargando…' : value.marcaId ? 'Selecciona el modelo' : 'Primero elige la marca'}</option>
            {modelos.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {sinAnio ? null : (
        <Field
          label="Año"
          required
          error={errores?.anio ?? (anios.isError ? 'No pudimos cargar los años.' : undefined)}
          help={anios.data && anios.data.length === 0 ? 'Ninguna aseguradora cotiza este modelo.' : undefined}
        >
          {(p) => (
            <Select
              {...p}
              compact={compact}
              value={value.anio}
              disabled={disabled || !value.modeloId || anios.isLoading}
              onChange={(e) => onChange({ ...value, anio: e.target.value })}
            >
              <option value="">{anios.isLoading ? 'Cargando…' : value.modeloId ? 'Selecciona el año' : 'Primero elige el modelo'}</option>
              {anios.data?.map((a) => (
                <option key={a} value={String(a)}>
                  {a}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
    </>
  );
}

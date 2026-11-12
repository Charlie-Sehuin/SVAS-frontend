import { Field } from '../../../shared/ui/field';
import { Select } from '../../../shared/ui/select';
import { useDepartamentos, useDistritos, useProvincias } from '../hooks/useCatalogo';

export interface ValorUbigeo {
  departamento: string;
  provincia: string;
  /** Ubigeo de 6 dígitos del distrito elegido: es lo que se envía al backend. */
  ubigeo: string;
}
export const UBIGEO_VACIO: ValorUbigeo = { departamento: '', provincia: '', ubigeo: '' };

interface Props {
  value: ValorUbigeo;
  onChange: (v: ValorUbigeo) => void;
  disabled?: boolean;
  errores?: Partial<Record<keyof ValorUbigeo, string>>;
  compact?: boolean;
}

/** Departamento → provincia → distrito (arquitectura §6.9). El valor que se envía es el `ubigeo` de 6 dígitos. */
export function SelectorUbigeoCascada({ value, onChange, disabled, errores, compact }: Props) {
  const departamentos = useDepartamentos();
  const provincias = useProvincias(value.departamento || null);
  const distritos = useDistritos(value.departamento || null, value.provincia || null);

  return (
    <>
      <Field label="Departamento" required error={errores?.departamento ?? (departamentos.isError ? 'No pudimos cargar los departamentos.' : undefined)}>
        {(p) => (
          <Select
            {...p}
            compact={compact}
            value={value.departamento}
            disabled={disabled || departamentos.isLoading}
            onChange={(e) => onChange({ departamento: e.target.value, provincia: '', ubigeo: '' })}
          >
            <option value="">{departamentos.isLoading ? 'Cargando…' : 'Selecciona el departamento'}</option>
            {departamentos.data?.map((d) => (
              <option key={d.departamento} value={d.departamento}>
                {d.departamento}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Provincia" required error={errores?.provincia ?? (provincias.isError ? 'No pudimos cargar las provincias.' : undefined)}>
        {(p) => (
          <Select
            {...p}
            compact={compact}
            value={value.provincia}
            disabled={disabled || !value.departamento || provincias.isLoading}
            onChange={(e) => onChange({ ...value, provincia: e.target.value, ubigeo: '' })}
          >
            <option value="">
              {provincias.isLoading ? 'Cargando…' : value.departamento ? 'Selecciona la provincia' : 'Primero elige el departamento'}
            </option>
            {provincias.data?.map((p2) => (
              <option key={p2.provincia} value={p2.provincia}>
                {p2.provincia}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Distrito"
        required
        error={errores?.ubigeo ?? (distritos.isError ? 'No pudimos cargar los distritos.' : undefined)}
        help="La zona influye en el precio."
      >
        {(p) => (
          <Select
            {...p}
            compact={compact}
            value={value.ubigeo}
            disabled={disabled || !value.provincia || distritos.isLoading}
            onChange={(e) => onChange({ ...value, ubigeo: e.target.value })}
          >
            <option value="">{distritos.isLoading ? 'Cargando…' : value.provincia ? 'Selecciona el distrito' : 'Primero elige la provincia'}</option>
            {distritos.data?.map((d) => (
              <option key={d.ubigeo} value={d.ubigeo}>
                {d.distrito}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
}

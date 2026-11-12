import { Controller, useFormContext } from 'react-hook-form';
import type { CatalogoCampos } from '../../../shared/types/api';
import { TEXTO_USO, USOS_VEHICULO } from '../../../shared/types/enums';
import { Field } from '../../../shared/ui/field';
import { Select } from '../../../shared/ui/select';
import { Switch } from '../../../shared/ui/switch';
import { camposDinamicos } from '../schema/buildZodSchema';
import type { BorradorCotizar } from '../store/useCotizarWizardStore';
import { DynamicField } from './DynamicField';
import { SelectorVehiculoCascada } from './SelectorVehiculoCascada';

/** Paso 1 · Vehículo: marca → modelo → año en cascada, uso y los campos dinámicos del catálogo (placa, clase). */
export function PasoVehiculo({ catalogo }: { catalogo: CatalogoCampos }) {
  const { control, watch, setValue, clearErrors, formState } = useFormContext<BorradorCotizar>();
  const { errors } = formState;
  const vehiculo = watch('vehiculo');
  const sinPlaca = watch('sinPlaca');

  // Placa antes que clase, como en el diseño (§9.2); el resto, en el orden del catálogo.
  const dinamicos = [...camposDinamicos(catalogo)].sort((a, b) => (a.nombre === 'placa' ? -1 : b.nombre === 'placa' ? 1 : 0));

  return (
    <>
      <SelectorVehiculoCascada
        value={vehiculo}
        onChange={(v) => {
          setValue('vehiculo', v, { shouldDirty: true });
          clearErrors('vehiculo');
        }}
        errores={{
          marcaId: errors.vehiculo?.marcaId?.message,
          modeloId: errors.vehiculo?.modeloId?.message,
          anio: errors.vehiculo?.anio?.message,
        }}
      />

      <Controller
        control={control}
        name="uso"
        render={({ field }) => (
          <Field label="Uso del vehículo" required error={errors.uso?.message}>
            {(p) => (
              <Select {...p} value={field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur}>
                {USOS_VEHICULO.map((u) => (
                  <option key={u} value={u}>
                    {TEXTO_USO[u]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      />

      {dinamicos.map((campo) => {
        const nombre = campo.nombre as 'placa' | 'clase';
        return (
          <div key={campo.nombre}>
            <Controller
              control={control}
              name={nombre}
              render={({ field }) => (
                <DynamicField
                  campo={campo}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors[nombre]?.message}
                  disabled={nombre === 'placa' && sinPlaca}
                />
              )}
            />
            {/* "No tengo placa" solo si la placa no es obligatoria: vacía y deshabilita el campo (diseño §7.2). */}
            {nombre === 'placa' && !campo.obligatorio ? (
              <label className="-mt-2 mb-4 flex min-h-11 cursor-pointer items-center gap-2 text-small text-ink">
                <Switch
                  checked={sinPlaca}
                  aria-label="No tengo placa"
                  onCheckedChange={(v) => {
                    setValue('sinPlaca', v, { shouldDirty: true });
                    if (v) {
                      setValue('placa', '', { shouldDirty: true });
                      clearErrors('placa');
                    }
                  }}
                />
                No tengo placa
              </label>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

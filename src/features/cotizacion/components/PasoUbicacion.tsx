import { useFormContext } from 'react-hook-form';
import type { BorradorCotizar } from '../store/useCotizarWizardStore';
import { SelectorUbigeoCascada } from './SelectorUbigeoCascada';

/** Paso 2 · Ubicación: departamento → provincia → distrito. Lo que se envía es el ubigeo de 6 dígitos. */
export function PasoUbicacion() {
  const { watch, setValue, clearErrors, formState } = useFormContext<BorradorCotizar>();
  const { errors } = formState;
  const ubicacion = watch('ubicacion');

  return (
    <SelectorUbigeoCascada
      value={ubicacion}
      onChange={(u) => {
        setValue('ubicacion', u, { shouldDirty: true });
        clearErrors('ubicacion');
      }}
      errores={{ ubigeo: errors.ubicacion?.ubigeo?.message }}
    />
  );
}

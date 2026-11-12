import type { CampoCatalogo } from '../../../shared/types/api';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';

const ETIQUETA_UI: Record<string, { label: string; help?: string; placeholder?: string }> = {
  placa: { label: 'Placa', help: '6 caracteres, con o sin guion (ABC-123).', placeholder: 'ABC-123' },
  clase: { label: 'Clase de vehículo' },
};

/**
 * Un campo del catálogo (`TEXTO`, `NUMERO` o `LISTA`) dibujado según su definición (RF-02, arquitectura §4.2).
 * El catálogo decide el tipo, si es obligatorio y las opciones de una lista; esta pieza solo lo pinta.
 */
export function DynamicField({
  campo,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  help,
}: {
  campo: CampoCatalogo;
  value: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  error?: string | undefined;
  disabled?: boolean;
  help?: string | undefined;
}) {
  const ui = ETIQUETA_UI[campo.nombre] ?? { label: campo.nombre };
  const label = campo.obligatorio ? ui.label : `${ui.label} (opcional)`;
  const ayuda = help ?? ui.help;

  return (
    <Field label={label} required={campo.obligatorio} error={error} help={ayuda}>
      {(p) =>
        campo.tipo === 'LISTA' && campo.valoresPermitidos.length > 0 ? (
          <Select {...p} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
            <option value="">Selecciona</option>
            {campo.valoresPermitidos.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            {...p}
            value={value}
            disabled={disabled}
            inputMode={campo.tipo === 'NUMERO' ? 'numeric' : 'text'}
            autoComplete="off"
            {...(campo.nombre === 'placa' ? { maxLength: 7, autoCapitalize: 'characters', spellCheck: false } : {})}
            {...(ui.placeholder ? { placeholder: ui.placeholder } : {})}
            onChange={(e) => onChange(campo.nombre === 'placa' ? e.target.value.toUpperCase() : e.target.value)}
            onBlur={onBlur}
          />
        )
      }
    </Field>
  );
}

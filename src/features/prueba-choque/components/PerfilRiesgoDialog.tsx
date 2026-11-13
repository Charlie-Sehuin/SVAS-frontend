import { useState, type FormEvent } from 'react';
import { ShieldAlert } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { cn } from '../../../shared/lib/utils';
import type { EscenarioCatalogo, PerfilRiesgo } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Switch } from '../../../shared/ui/switch';
import { ErrorToast } from '../../../shared/ui/domain/toasts';

const FORMATO_INGRESO = /^\d{1,6}(\.\d{1,2})?$/;

const PREGUNTAS = [
  { campo: 'estacionaCochera', texto: '¿Guardas tu auto en una cochera?' },
  { campo: 'kmMesAlto', texto: '¿Recorres muchos kilómetros al mes?' },
  { campo: 'usoNocturno', texto: '¿Usas tu auto de noche?' },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El ingreso diario solo se pregunta en uso comercial (RN-33). */
  esComercial: boolean;
  escenarios: EscenarioCatalogo[];
  enviando: boolean;
  /** Debe lanzar si el backend rechaza; el diálogo se queda abierto y muestra el mensaje. */
  onEnviar: (perfil: PerfilRiesgo) => Promise<void>;
}

/**
 * Perfil de riesgo (diseño §9.5): 3 interruptores grandes, el ingreso diario si el uso es comercial y las preocupaciones
 * como botones. Hoja inferior en móvil. Cada interruptor lleva su "Sí / No" en texto: el estado no depende del color.
 */
export function PerfilRiesgoDialog({ open, onOpenChange, esComercial, escenarios, enviando, onEnviar }: Props) {
  const [respuestas, setRespuestas] = useState({ estacionaCochera: false, kmMesAlto: false, usoNocturno: false });
  const [ingreso, setIngreso] = useState('');
  const [preocupaciones, setPreocupaciones] = useState<string[]>([]);
  const [errorIngreso, setErrorIngreso] = useState<string | undefined>();

  const alternar = (codigo: string) =>
    setPreocupaciones((actuales) => (actuales.includes(codigo) ? actuales.filter((c) => c !== codigo) : [...actuales, codigo]));

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const limpio = ingreso.trim();
    if (esComercial && limpio && !FORMATO_INGRESO.test(limpio)) {
      setErrorIngreso('Ingresa tu ingreso diario en soles, p. ej. 150.00');
      return;
    }
    setErrorIngreso(undefined);
    try {
      await onEnviar({
        ...respuestas,
        ...(esComercial ? { ingresoDiarioSoles: limpio || null } : {}),
        preocupaciones,
      });
    } catch (err) {
      // Errores por campo del backend se muestran bajo el campo; el resto, como toast con el mensaje tal cual.
      const campo = isApiError(err) ? err.errors.find((x) => x.campo.includes('ingresoDiarioSoles')) : undefined;
      if (campo) setErrorIngreso(campo.mensaje);
      else ErrorToast(err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-navy-700">
              <ShieldAlert className="size-6 text-accent-600" aria-hidden /> Cuéntanos cómo usas tu auto
            </DialogTitle>
            <DialogDescription>Son 3 preguntas. Con tus respuestas ajustamos qué tan probable es cada situación.</DialogDescription>
          </DialogHeader>

          <DialogBody>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {PREGUNTAS.map((p) => (
                <li key={p.campo} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span id={`pregunta-${p.campo}`} className="font-bold text-navy-700">
                    {p.texto}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="w-6 text-right text-small text-ink-soft" aria-hidden>
                      {respuestas[p.campo] ? 'Sí' : 'No'}
                    </span>
                    <Switch
                      aria-labelledby={`pregunta-${p.campo}`}
                      checked={respuestas[p.campo]}
                      onCheckedChange={(v) => setRespuestas((r) => ({ ...r, [p.campo]: v }))}
                    />
                  </span>
                </li>
              ))}
            </ul>

            {esComercial ? (
              <Field className="mt-4" label="¿Cuánto ganas al día? (S/)" help="Es opcional. Lo usamos para estimar lo que pierdes si tu auto está en el taller." error={errorIngreso}>
                {(p) => (
                  <Input {...p} value={ingreso} onChange={(e) => setIngreso(e.target.value)} inputMode="decimal" placeholder="150.00" invalid={!!errorIngreso} />
                )}
              </Field>
            ) : null}

            {escenarios.length > 0 ? (
              <fieldset className="mt-5">
                <legend className="mb-2 font-bold text-navy-700">¿Qué te preocupa más? (opcional)</legend>
                <div className="flex flex-wrap gap-2">
                  {escenarios.map((s) => {
                    const activo = preocupaciones.includes(s.codigo);
                    return (
                      <button
                        key={s.codigo}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => alternar(s.codigo)}
                        className={cn(
                          'min-h-11 rounded-full border-2 px-4 text-small font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300',
                          activo ? 'border-accent-600 bg-accent-50 text-accent-700' : 'border-line bg-surface text-navy-700 hover:border-navy-300',
                        )}
                      >
                        {activo ? '✓ ' : ''}
                        {s.nombre}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={enviando}>
              Ahora no
            </Button>
            <Button type="submit" variant="accent" size="lg" loading={enviando} loadingText="Simulando…">
              Ver mi Prueba de Choque
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

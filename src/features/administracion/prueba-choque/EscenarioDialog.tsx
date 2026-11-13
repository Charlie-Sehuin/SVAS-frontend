import { useEffect, useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/lib/api-client';
import { parseDecimal } from '../../../shared/lib/forms';
import type { EscenarioAdmin } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useGuardarEscenario } from '../hooks/usePruebaChoqueAdmin';
import { FORMATO_CODIGO } from './textos';

type Campo = 'codigo' | 'nombre' | 'descripcion' | 'montoDanoReferencial' | 'diasTaller' | 'orden';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El escenario que se edita, o `null` para crear uno nuevo. */
  escenario: EscenarioAdmin | null;
  /** Siguiente número de orden sugerido al crear. */
  ordenSugerido: number;
}

const entero = (t: string) => (/^\d+$/.test(t.trim()) ? Number(t.trim()) : null);
const dosDecimales = (t: string) => /^\d+([.,]\d{1,2})?$/.test(t.trim());

/**
 * Crear o editar un escenario (RF-36, RN-31). El código no cambia una vez creado (las coberturas, frecuencias y factores
 * cuelgan de él). "El daño es la suma asegurada" deja el monto en `null`: así funcionan el robo total y la pérdida total.
 * El backend vuelve a validar todo y sus mensajes se muestran junto al campo.
 */
export function EscenarioDialog({ open, onOpenChange, escenario, ordenSugerido }: Props) {
  const guardar = useGuardarEscenario();
  const [valores, setValores] = useState({ codigo: '', nombre: '', descripcion: '', monto: '', usaSuma: false, dias: '0', orden: '0', activo: true });
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrores({});
    setValores(
      escenario
        ? {
            codigo: escenario.codigo,
            nombre: escenario.nombre,
            descripcion: escenario.descripcion,
            monto: escenario.montoDanoReferencial ?? '',
            usaSuma: escenario.montoDanoReferencial === null,
            dias: String(escenario.diasTaller),
            orden: String(escenario.orden),
            activo: escenario.activo,
          }
        : { codigo: '', nombre: '', descripcion: '', monto: '', usaSuma: false, dias: '0', orden: String(ordenSugerido), activo: true },
    );
  }, [open, escenario, ordenSugerido]);

  const poner = <K extends keyof typeof valores>(k: K, v: (typeof valores)[K]) => setValores((p) => ({ ...p, [k]: v }));

  function validar(): Partial<Record<Campo, string>> {
    const e: Partial<Record<Campo, string>> = {};
    if (!escenario && !FORMATO_CODIGO.test(valores.codigo.trim()))
      e.codigo = 'El código va en mayúsculas y guiones bajos, p. ej. CHOQUE_LEVE';
    if (!valores.nombre.trim()) e.nombre = 'El nombre del escenario es obligatorio';
    else if (valores.nombre.trim().length > 80) e.nombre = 'El nombre admite hasta 80 caracteres';
    if (!valores.descripcion.trim()) e.descripcion = 'La descripción del escenario es obligatoria';
    else if (valores.descripcion.trim().length > 500) e.descripcion = 'La descripción admite hasta 500 caracteres';
    if (!valores.usaSuma) {
      const n = parseDecimal(valores.monto);
      if (n === null || !dosDecimales(valores.monto)) e.montoDanoReferencial = 'El monto de daño debe ser un número con hasta 2 decimales';
      else if (n <= 0) e.montoDanoReferencial = 'El monto de daño debe ser mayor que 0';
    }
    const dias = entero(valores.dias);
    if (dias === null || dias > 365) e.diasTaller = 'Los días de taller deben estar entre 0 y 365';
    const orden = entero(valores.orden);
    if (orden === null || orden > 1000) e.orden = 'El orden debe estar entre 0 y 1000';
    return e;
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    const problemas = validar();
    setErrores(problemas);
    if (Object.keys(problemas).length > 0) return;
    const codigo = escenario?.codigo ?? valores.codigo.trim();
    guardar.mutate(
      {
        codigo,
        body: {
          nombre: valores.nombre.trim(),
          descripcion: valores.descripcion.trim(),
          montoDanoReferencial: valores.usaSuma ? null : parseDecimal(valores.monto),
          diasTaller: entero(valores.dias)!,
          orden: entero(valores.orden)!,
          activo: valores.activo,
        },
      },
      {
        onSuccess: () => {
          SuccessToast(escenario ? 'Escenario guardado' : 'Escenario creado', 'Vale desde la siguiente simulación.');
          onOpenChange(false);
        },
        onError: (err) => {
          // Errores por campo del backend junto al campo; el resto, como toast con el mensaje tal cual.
          if (isApiError(err) && err.esValidacion) {
            const porCampo: Partial<Record<Campo, string>> = {};
            for (const x of err.errors) porCampo[x.campo as Campo] = x.mensaje;
            setErrores(porCampo);
          } else ErrorToast(err);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{escenario ? `Editar ${escenario.nombre}` : 'Nuevo escenario'}</DialogTitle>
            <DialogDescription>Una situación que se prueba en cada plan: cuánto daño causa y cuántos días deja el auto en taller.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Código" help={escenario ? 'El código no se puede cambiar.' : 'Mayúsculas y guiones bajos. No se puede cambiar después.'} error={errores.codigo} required>
              {(p) => (
                <Input
                  {...p}
                  value={valores.codigo}
                  onChange={(e) => poner('codigo', e.target.value.toUpperCase())}
                  disabled={!!escenario}
                  maxLength={30}
                  className="font-mono"
                  invalid={!!errores.codigo}
                />
              )}
            </Field>
            <Field label="Nombre" error={errores.nombre} required>
              {(p) => <Input {...p} value={valores.nombre} onChange={(e) => poner('nombre', e.target.value)} maxLength={80} invalid={!!errores.nombre} />}
            </Field>
            <Field label="Descripción para el cliente" help="Se muestra en lenguaje llano en la Prueba de Choque." error={errores.descripcion} required>
              {(p) => <Input {...p} value={valores.descripcion} onChange={(e) => poner('descripcion', e.target.value)} maxLength={500} invalid={!!errores.descripcion} />}
            </Field>

            <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={valores.usaSuma} onChange={(e) => poner('usaSuma', e.target.checked)} className="size-5 accent-brand-500" />
              <span>El daño es la suma asegurada de cada plan (robo total, pérdida total)</span>
            </label>
            {!valores.usaSuma ? (
              <Field label="Daño de referencia (USD)" error={errores.montoDanoReferencial} required>
                {(p) => (
                  <Input {...p} inputMode="decimal" value={valores.monto} onChange={(e) => poner('monto', e.target.value)} className="font-mono" invalid={!!errores.montoDanoReferencial} />
                )}
              </Field>
            ) : null}

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Días en taller" help="De 0 a 365" error={errores.diasTaller} required>
                {(p) => <Input {...p} inputMode="numeric" value={valores.dias} onChange={(e) => poner('dias', e.target.value)} invalid={!!errores.diasTaller} />}
              </Field>
              <Field label="Orden" help="Posición en la pantalla" error={errores.orden} required>
                {(p) => <Input {...p} inputMode="numeric" value={valores.orden} onChange={(e) => poner('orden', e.target.value)} invalid={!!errores.orden} />}
              </Field>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={valores.activo} onChange={(e) => poner('activo', e.target.checked)} className="size-5 accent-brand-500" />
              <span>Activo (se usa en las simulaciones)</span>
            </label>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={guardar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={guardar.isPending} loadingText="Guardando…">
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { isApiError } from '../../../shared/lib/api-client';
import { cn } from '../../../shared/lib/utils';
import { CATEGORIAS_COBERTURA, type CategoriaCobertura, type CoberturaCatalogoAdmin, type EscenarioAdmin } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useGuardarCoberturaCatalogo } from '../hooks/useContenidoAdmin';
import { FORMATO_CODIGO_COBERTURA, TEXTO_CATEGORIA } from './textos';

type Campo = 'codigo' | 'nombre' | 'descripcion' | 'orden' | 'escenarios';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La cobertura que se edita, o `null` para crear una nueva. */
  cobertura: CoberturaCatalogoAdmin | null;
  ordenSugerido: number;
  /** Escenarios de la Prueba de Choque a los que se puede ligar (RN-43). */
  escenarios: EscenarioAdmin[];
}

/**
 * Crear o editar una cobertura del catálogo (RF-36, RN-42, RN-43). El código no cambia una vez creado. Los escenarios ligados
 * son los de la Prueba de Choque que esa cobertura representa: si un plan dice que la incluye, la Prueba de Choque debe cubrirlos.
 * Cambiar el catálogo cambia lo que exige cada plan para estar completo.
 */
export function CoberturaDialog({ open, onOpenChange, cobertura, ordenSugerido, escenarios }: Props) {
  const guardar = useGuardarCoberturaCatalogo();
  const [v, setV] = useState({
    codigo: '',
    nombre: '',
    categoria: 'ADICIONAL' as CategoriaCobertura,
    descripcion: '',
    orden: '0',
    activa: true,
    ligados: [] as string[],
  });
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrores({});
    setV(
      cobertura
        ? { codigo: cobertura.codigo, nombre: cobertura.nombre, categoria: cobertura.categoria, descripcion: cobertura.descripcion, orden: String(cobertura.orden), activa: cobertura.activa, ligados: cobertura.escenarios }
        : { codigo: '', nombre: '', categoria: 'ADICIONAL', descripcion: '', orden: String(ordenSugerido), activa: true, ligados: [] },
    );
  }, [open, cobertura, ordenSugerido]);

  const poner = <K extends keyof typeof v>(k: K, valor: (typeof v)[K]) => setV((p) => ({ ...p, [k]: valor }));
  const alternarEscenario = (codigo: string) => poner('ligados', v.ligados.includes(codigo) ? v.ligados.filter((c) => c !== codigo) : [...v.ligados, codigo]);

  function validar(): Partial<Record<Campo, string>> {
    const e: Partial<Record<Campo, string>> = {};
    if (!cobertura && !FORMATO_CODIGO_COBERTURA.test(v.codigo.trim())) e.codigo = 'El código va en mayúsculas y guiones bajos, p. ej. ROBO_TOTAL';
    if (!v.nombre.trim()) e.nombre = 'El nombre de la cobertura es obligatorio';
    else if (v.nombre.trim().length > 80) e.nombre = 'El nombre admite hasta 80 caracteres';
    if (!v.descripcion.trim()) e.descripcion = 'La descripción de la cobertura es obligatoria';
    else if (v.descripcion.trim().length > 300) e.descripcion = 'La descripción admite hasta 300 caracteres';
    if (!/^\d+$/.test(v.orden.trim()) || Number(v.orden) > 1000) e.orden = 'El orden debe estar entre 0 y 1000';
    return e;
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault();
    const problemas = validar();
    setErrores(problemas);
    if (Object.keys(problemas).length > 0) return;
    guardar.mutate(
      {
        codigo: cobertura?.codigo ?? v.codigo.trim(),
        body: {
          nombre: v.nombre.trim(),
          categoria: v.categoria,
          descripcion: v.descripcion.trim(),
          orden: Number(v.orden),
          activa: v.activa,
          escenarios: v.ligados,
        },
      },
      {
        onSuccess: () => {
          SuccessToast(cobertura ? 'Cobertura guardada' : 'Cobertura creada', 'Los planes ya la ven en su contenido.');
          onOpenChange(false);
        },
        onError: (err) => {
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
            <DialogTitle>{cobertura ? `Editar ${cobertura.nombre}` : 'Nueva cobertura'}</DialogTitle>
            <DialogDescription>Una protección del catálogo común: cada plan dice si la incluye o no.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Código" help={cobertura ? 'El código no se puede cambiar.' : 'Mayúsculas y guiones bajos. No se puede cambiar después.'} error={errores.codigo} required>
              {(p) => (
                <Input {...p} value={v.codigo} onChange={(e) => poner('codigo', e.target.value.toUpperCase())} disabled={!!cobertura} maxLength={30} className="font-mono" invalid={!!errores.codigo} />
              )}
            </Field>
            <Field label="Nombre" error={errores.nombre} required>
              {(p) => <Input {...p} value={v.nombre} onChange={(e) => poner('nombre', e.target.value)} maxLength={80} invalid={!!errores.nombre} />}
            </Field>
            <Field label="Categoría" required>
              {(p) => (
                <Select {...p} value={v.categoria} onChange={(e) => poner('categoria', e.target.value as CategoriaCobertura)}>
                  {CATEGORIAS_COBERTURA.map((c) => (
                    <option key={c} value={c}>
                      {TEXTO_CATEGORIA[c]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Descripción" help="Qué protege, en lenguaje llano." error={errores.descripcion} required>
              {(p) => <Input {...p} value={v.descripcion} onChange={(e) => poner('descripcion', e.target.value)} maxLength={300} invalid={!!errores.descripcion} />}
            </Field>
            <Field label="Orden" help="Posición en la lista (0 a 1000). Es el mismo para todos los planes." error={errores.orden} required>
              {(p) => <Input {...p} inputMode="numeric" value={v.orden} onChange={(e) => poner('orden', e.target.value)} invalid={!!errores.orden} />}
            </Field>

            <fieldset className="mb-4">
              <legend className="mb-1 text-small font-bold text-navy-700">Escenarios de la Prueba de Choque que representa (opcional)</legend>
              <p className="mb-2 text-small text-ink-soft">Si un plan incluye esta cobertura, la Prueba de Choque debe cubrir estos escenarios (RN-43).</p>
              {escenarios.length === 0 ? (
                <p className="text-small text-ink-soft">No hay escenarios cargados.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {escenarios.map((s) => {
                    const activo = v.ligados.includes(s.codigo);
                    return (
                      <button
                        key={s.codigo}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => alternarEscenario(s.codigo)}
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
              )}
              {errores.escenarios ? (
                <p role="alert" className="mt-1.5 text-small text-status-danger">
                  {errores.escenarios}
                </p>
              ) : null}
            </fieldset>

            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={v.activa} onChange={(e) => poner('activa', e.target.checked)} className="size-5 accent-brand-500" />
              <span>Activa (los planes deben definirla para estar completos)</span>
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

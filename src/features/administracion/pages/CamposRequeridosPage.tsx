import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeOff, Pencil, Plus } from 'lucide-react';
import { aplicarErroresBackend } from '../../../shared/lib/forms';
import type { AseguradoraAdmin, CampoAdmin, GuardarCampoRequest } from '../../../shared/types/api';
import { TEXTO_TIPO_CAMPO, TIPOS_CAMPO, type OrigenValores, type TipoCampo } from '../../../shared/types/enums';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Switch } from '../../../shared/ui/switch';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { ConfirmDialog } from '../../../shared/ui/domain/ConfirmDialog';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useAseguradoras, useCamposAdmin, useCrearCampo, useDesactivarCampo, useEditarCampo } from '../hooks/useAdmin';

/** Campos cuyas opciones salen de las tablas de vehículos/ubigeos (backend `CAMPOS_DE_CATALOGO`). */
const CAMPOS_DE_CATALOGO = ['marca', 'modelo', 'anio', 'ubigeo', 'tipo'] as const;

/** Campos requeridos por aseguradora (RF-27, RN-16, RN-17). Desactivar no borra: el campo deja de pedirse. */
export function CamposRequeridosPage() {
  const aseguradoras = useAseguradoras();
  const [aseguradoraId, setAseguradoraId] = useState('');
  const campos = useCamposAdmin(aseguradoraId || undefined);
  const [dialogo, setDialogo] = useState<{ campo?: CampoAdmin } | null>(null);
  const [aDesactivar, setADesactivar] = useState<CampoAdmin | null>(null);
  const desactivar = useDesactivarCampo();

  const nombreAseguradora = useMemo(
    () => new Map(aseguradoras.data?.map((a) => [a.id, a.nombre]) ?? []),
    [aseguradoras.data],
  );
  const seleccionada = aseguradoras.data?.find((a) => a.id === aseguradoraId);

  return (
    <>
      <PageHeader
        titulo="Campos requeridos"
        descripcion="El formulario de cotización es la unión de los campos activos de las aseguradoras activas. Agregar un campo aquí no requiere desplegar el frontend."
        accion={
          <Button disabled={!seleccionada} onClick={() => setDialogo({})} title={seleccionada ? undefined : 'Elige una aseguradora primero'}>
            <Plus aria-hidden /> Nuevo campo
          </Button>
        }
      />

      <FiltrosBar>
        <Filtro label="Aseguradora" className="min-w-64">
          <Select compact value={aseguradoraId} onChange={(e) => setAseguradoraId(e.target.value)}>
            <option value="">Todas</option>
            {aseguradoras.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
                {a.activa ? '' : ' (inactiva)'}
              </option>
            ))}
          </Select>
        </Filtro>
      </FiltrosBar>

      {campos.isError ? (
        <EstadoError error={campos.error} onRetry={() => void campos.refetch()} />
      ) : campos.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando campos">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : campos.data && campos.data.length === 0 ? (
        <EstadoVacio titulo="Esta aseguradora aún no tiene campos." />
      ) : (
        <Table caption="Campos requeridos">
          <THead>
            <TR>
              <TH>Campo</TH>
              {!aseguradoraId ? <TH>Aseguradora</TH> : null}
              <TH>Tipo</TH>
              <TH>Obligatorio</TH>
              <TH>Opciones</TH>
              <TH>Estado</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {campos.data?.map((c) => (
              <TR key={c.id} className={c.activo ? undefined : 'text-ink-soft'}>
                <TD className="font-mono font-bold text-ink">{c.nombre}</TD>
                {!aseguradoraId ? <TD>{nombreAseguradora.get(c.aseguradoraId) ?? '—'}</TD> : null}
                <TD>{TEXTO_TIPO_CAMPO[c.tipo]}</TD>
                <TD>{c.obligatorio ? 'Sí' : 'No'}</TD>
                <TD className="max-w-72">
                  {c.origenValores === 'CATALOGO' ? (
                    <Badge tone="info" dot={false}>
                      Sale del catálogo
                    </Badge>
                  ) : c.valores.length > 0 ? (
                    <span className="line-clamp-2">{c.valores.join(', ')}</span>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  )}
                </TD>
                <TD>
                  <Badge tone={c.activo ? 'success' : 'neutral'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
                </TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDialogo({ campo: c })} aria-label={`Editar campo ${c.nombre}`}>
                      <Pencil aria-hidden /> Editar
                    </Button>
                    {c.activo ? (
                      <Button variant="ghost" size="sm" onClick={() => setADesactivar(c)} aria-label={`Desactivar campo ${c.nombre}`}>
                        <EyeOff aria-hidden /> Desactivar
                      </Button>
                    ) : null}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {dialogo ? (
        <CampoDialog
          aseguradora={dialogo.campo ? aseguradoras.data?.find((a) => a.id === dialogo.campo?.aseguradoraId) : seleccionada}
          campo={dialogo.campo}
          onClose={() => setDialogo(null)}
        />
      ) : null}

      <ConfirmDialog
        open={!!aDesactivar}
        onOpenChange={(o) => !o && setADesactivar(null)}
        titulo="Desactivar campo"
        descripcion={
          aDesactivar ? (
            <>
              El campo <strong className="font-mono">{aDesactivar.nombre}</strong> dejará de pedirse en el formulario de cotización. No se
              borra: puedes volver a activarlo editándolo.
            </>
          ) : null
        }
        confirmarTexto="Desactivar"
        loading={desactivar.isPending}
        onConfirm={() => {
          if (!aDesactivar) return;
          desactivar.mutate(aDesactivar.id, {
            onSuccess: () => {
              SuccessToast('Campo desactivado');
              setADesactivar(null);
            },
            onError: (e) => {
              ErrorToast(e);
              setADesactivar(null);
            },
          });
        }}
      />
    </>
  );
}

/* ───────────── Formulario de campo ───────────── */

/** Mismas reglas que `validarCampo` del backend (RN-17), para avisar antes de enviar. */
const esquema = z
  .object({
    nombre: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Escribe el nombre del campo')
      .max(40, 'El nombre no puede pasar de 40 caracteres')
      .regex(/^[a-z][a-z0-9_]*$/, 'Va en minúsculas, sin espacios ni tildes (p. ej. numero_motor)'),
    tipo: z.enum(['TEXTO', 'NUMERO', 'LISTA']),
    obligatorio: z.boolean(),
    origenValores: z.enum(['ESTATICO', 'CATALOGO']),
    valoresTexto: z.string(),
    activo: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const valores = parsearValores(v.valoresTexto);
    if (v.origenValores === 'CATALOGO') {
      if (v.tipo !== 'LISTA' || !(CAMPOS_DE_CATALOGO as readonly string[]).includes(v.nombre)) {
        ctx.addIssue({
          code: 'custom',
          path: ['origenValores'],
          message: 'Solo marca, modelo, anio, ubigeo y tipo pueden tomar sus opciones del catálogo (tipo lista).',
        });
      }
      if (valores.length > 0) {
        ctx.addIssue({ code: 'custom', path: ['valoresTexto'], message: 'Un campo que sale del catálogo no lleva opciones propias.' });
      }
    } else if (v.tipo === 'LISTA' && valores.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['valoresTexto'], message: 'Una lista necesita al menos una opción.' });
    } else if (v.tipo !== 'LISTA' && valores.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['valoresTexto'], message: 'Solo las listas llevan opciones. Cambia el tipo o borra las opciones.' });
    }
    if (valores.length > 100) {
      ctx.addIssue({ code: 'custom', path: ['valoresTexto'], message: 'Máximo 100 opciones.' });
    }
    if (valores.some((x) => x.length > 60)) {
      ctx.addIssue({ code: 'custom', path: ['valoresTexto'], message: 'Cada opción puede tener hasta 60 caracteres.' });
    }
  });
type Valores = z.infer<typeof esquema>;

/** Una opción por línea; sin vacíos ni repetidos, en el orden en que se escribieron. */
function parsearValores(texto: string): string[] {
  return [...new Set(texto.split('\n').map((l) => l.trim()).filter(Boolean))];
}

function CampoDialog({ aseguradora, campo, onClose }: { aseguradora: AseguradoraAdmin | undefined; campo?: CampoAdmin; onClose: () => void }) {
  const crear = useCrearCampo();
  const editar = useEditarCampo();
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: campo?.nombre ?? '',
      tipo: campo?.tipo ?? 'TEXTO',
      obligatorio: campo?.obligatorio ?? true,
      origenValores: campo?.origenValores ?? 'ESTATICO',
      valoresTexto: campo?.valores.join('\n') ?? '',
      activo: campo?.activo ?? true,
    },
  });
  const tipo = form.watch('tipo');
  const origen = form.watch('origenValores');
  const guardando = crear.isPending || editar.isPending;
  const muestraValores = tipo === 'LISTA' && origen === 'ESTATICO';

  const onSubmit = form.handleSubmit((v) => {
    const body: GuardarCampoRequest = {
      nombre: v.nombre,
      tipo: v.tipo,
      obligatorio: v.obligatorio,
      origenValores: v.origenValores,
      valores: v.origenValores === 'CATALOGO' || v.tipo !== 'LISTA' ? [] : parsearValores(v.valoresTexto),
      activo: v.activo,
    };
    const opciones = {
      onSuccess: () => {
        SuccessToast(campo ? 'Campo actualizado' : 'Campo creado');
        onClose();
      },
      onError: (e: unknown) => {
        if (!aplicarErroresBackend(e, form.setError, ['nombre', 'tipo', 'obligatorio', 'origenValores', 'valoresTexto'], { valores: 'valoresTexto' })) {
          ErrorToast(e);
        }
      },
    };
    if (campo) editar.mutate({ id: campo.id, body }, opciones);
    else if (aseguradora) crear.mutate({ ...body, aseguradoraId: aseguradora.id }, opciones);
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{campo ? 'Editar campo' : 'Nuevo campo'}</DialogTitle>
            <DialogDescription>{aseguradora?.nombre}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Nombre del campo" error={form.formState.errors.nombre?.message} help="Minúsculas y guion bajo, p. ej. numero_motor." required>
              {(p) => <Input {...p} autoComplete="off" spellCheck={false} className="font-mono" {...form.register('nombre')} />}
            </Field>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Tipo" error={form.formState.errors.tipo?.message} required>
                {(p) => (
                  <Select {...p} {...form.register('tipo')}>
                    {TIPOS_CAMPO.map((t: TipoCampo) => (
                      <option key={t} value={t}>
                        {TEXTO_TIPO_CAMPO[t]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Origen de las opciones" error={form.formState.errors.origenValores?.message}>
                {(p) => (
                  <Select {...p} {...form.register('origenValores')}>
                    {(['ESTATICO', 'CATALOGO'] as OrigenValores[]).map((o) => (
                      <option key={o} value={o}>
                        {o === 'ESTATICO' ? 'Las escribo aquí' : 'Salen del catálogo'}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>

            {muestraValores ? (
              <Field label="Opciones permitidas" error={form.formState.errors.valoresTexto?.message} help="Una opción por línea." required>
                {(p) => (
                  <textarea
                    {...p}
                    rows={5}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base focus:border-brand-500 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-brand-300"
                    {...form.register('valoresTexto')}
                  />
                )}
              </Field>
            ) : form.formState.errors.valoresTexto?.message ? (
              <p role="alert" className="mb-4 text-small text-status-danger">
                {form.formState.errors.valoresTexto.message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
              <Controller
                control={form.control}
                name="obligatorio"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-base">
                    <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Obligatorio" />
                    {field.value ? 'Obligatorio' : 'Opcional'}
                  </label>
                )}
              />
              {campo ? (
                <Controller
                  control={form.control}
                  name="activo"
                  render={({ field }) => (
                    <label className="flex items-center gap-2 text-base">
                      <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Activo" />
                      {field.value ? 'Activo' : 'Inactivo'}
                    </label>
                  )}
                />
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outlineNavy" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={guardando} disabled={!campo && !aseguradora}>
              {campo ? 'Guardar cambios' : 'Crear campo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

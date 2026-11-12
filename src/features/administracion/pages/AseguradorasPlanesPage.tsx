import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ExternalLink, Pencil, Plus } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { aplicarErroresBackend } from '../../../shared/lib/forms';
import type { AseguradoraAdmin, PlanAdmin } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Switch } from '../../../shared/ui/switch';
import { ConfirmDialog } from '../../../shared/ui/domain/ConfirmDialog';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { cn } from '../../../shared/lib/utils';
import {
  useAseguradoras,
  useCambiarEstadoAseguradora,
  useCrearPlan,
  useEditarPlan,
  usePlanes,
} from '../hooks/useAdmin';

const NOMBRE_ESTRATEGIA: Record<AseguradoraAdmin['codigoEstrategia'], string> = {
  RIMAC: 'Fórmula Rímac',
  PACIFICO: 'Fórmula Pacífico',
  LA_POSITIVA: 'Fórmula La Positiva',
  MAPFRE: 'Fórmula Mapfre',
  QUALITAS: 'Fórmula Qualitas',
};

/** Aseguradoras y planes (RF-26, RF-27). Activar o desactivar saca o mete a una aseguradora o plan de las cotizaciones. */
export function AseguradorasPlanesPage() {
  const aseguradoras = useAseguradoras();
  const planes = usePlanes();
  const [aApagar, setAApagar] = useState<AseguradoraAdmin | null>(null);
  const estadoAseg = useCambiarEstadoAseguradora();
  const [dialogoPlan, setDialogoPlan] = useState<{ aseguradora: AseguradoraAdmin; plan?: PlanAdmin } | null>(null);

  const cambiarAseguradora = (a: AseguradoraAdmin, activa: boolean) =>
    estadoAseg.mutate(
      { id: a.id, activa },
      {
        onSuccess: () => {
          SuccessToast(activa ? `${a.nombre} vuelve a cotizar` : `${a.nombre} dejó de cotizar`);
          setAApagar(null);
        },
        onError: (e) => {
          ErrorToast(e);
          setAApagar(null);
        },
      },
    );

  return (
    <>
      <PageHeader
        titulo="Aseguradoras y planes"
        descripcion="Una aseguradora o un plan inactivo no aparece en las cotizaciones nuevas. Un plan solo se puede activar si su contenido está completo."
      />

      {aseguradoras.isError ? (
        <EstadoError error={aseguradoras.error} onRetry={() => void aseguradoras.refetch()} />
      ) : aseguradoras.isLoading ? (
        <div className="space-y-4" aria-busy aria-label="Cargando aseguradoras">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : aseguradoras.data && aseguradoras.data.length === 0 ? (
        <EstadoVacio titulo="Aún no hay aseguradoras cargadas." />
      ) : (
        <div className="space-y-4">
          {aseguradoras.data?.map((a) => {
            const susPlanes = planes.data?.filter((p) => p.aseguradoraId === a.id) ?? [];
            return (
              <Card key={a.id}>
                <CardHeader className="flex-row flex-wrap items-center gap-3">
                  <CardTitle className="text-navy-700">{a.nombre}</CardTitle>
                  <Badge tone="navy" dot={false}>
                    {NOMBRE_ESTRATEGIA[a.codigoEstrategia] ?? a.codigoEstrategia}
                  </Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <span className={cn('text-small font-bold', a.activa ? 'text-status-success' : 'text-status-neutral')}>
                      {a.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <Switch
                      checked={a.activa}
                      aria-label={`${a.activa ? 'Desactivar' : 'Activar'} ${a.nombre}`}
                      disabled={estadoAseg.isPending}
                      onCheckedChange={(activa) => (activa ? cambiarAseguradora(a, true) : setAApagar(a))}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {planes.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : (
                    <ul className="divide-y divide-line rounded-lg border border-line">
                      {susPlanes.length === 0 ? (
                        <li className="p-4 text-small text-ink-soft">Esta aseguradora aún no tiene planes.</li>
                      ) : (
                        susPlanes.map((p) => <FilaPlan key={p.id} plan={p} onEditar={() => setDialogoPlan({ aseguradora: a, plan: p })} />)
                      )}
                    </ul>
                  )}
                  <div className="mt-3">
                    <Button variant="outlineNavy" size="sm" onClick={() => setDialogoPlan({ aseguradora: a })}>
                      <Plus aria-hidden /> Nuevo plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!aApagar}
        onOpenChange={(o) => !o && setAApagar(null)}
        titulo="Desactivar aseguradora"
        descripcion={
          aApagar ? (
            <>
              <strong>{aApagar.nombre}</strong> dejará de aparecer en las cotizaciones nuevas. Las cotizaciones y pólizas que ya existen
              no cambian.
            </>
          ) : null
        }
        confirmarTexto="Desactivar"
        loading={estadoAseg.isPending}
        onConfirm={() => aApagar && cambiarAseguradora(aApagar, false)}
      />

      {dialogoPlan ? (
        <PlanDialog
          aseguradora={dialogoPlan.aseguradora}
          plan={dialogoPlan.plan}
          onClose={() => setDialogoPlan(null)}
        />
      ) : null}
    </>
  );
}

/* ───────────── Fila de plan (activar con aviso de contenido incompleto) ───────────── */

function FilaPlan({ plan, onEditar }: { plan: PlanAdmin; onEditar: () => void }) {
  const editar = useEditarPlan();
  const [errorActivar, setErrorActivar] = useState<string | null>(null);

  const alternar = (activo: boolean) => {
    setErrorActivar(null);
    editar.mutate(
      { id: plan.id, body: { activo } },
      {
        onSuccess: () => SuccessToast(activo ? `Plan ${plan.nombre} activado` : `Plan ${plan.nombre} desactivado`),
        onError: (e) => {
          // RN-42: activar un plan con contenido incompleto responde 400 con "faltan n coberturas".
          if (activo && isApiError(e) && e.statusCode === 400) setErrorActivar(e.message);
          else ErrorToast(e);
        },
      },
    );
  };

  return (
    <li className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{plan.nombre}</p>
          {plan.descripcion ? <p className="truncate text-small text-ink-soft">{plan.descripcion}</p> : null}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/app/admin/planes/${plan.id}/contenido`}>
            Contenido <ExternalLink aria-hidden />
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onEditar} aria-label={`Editar plan ${plan.nombre}`}>
          <Pencil aria-hidden /> Editar
        </Button>
        <div className="flex items-center gap-2">
          <span className={cn('text-small font-bold', plan.activo ? 'text-status-success' : 'text-status-neutral')}>
            {plan.activo ? 'Activo' : 'Inactivo'}
          </span>
          <Switch
            checked={plan.activo}
            aria-label={`${plan.activo ? 'Desactivar' : 'Activar'} plan ${plan.nombre}`}
            disabled={editar.isPending}
            onCheckedChange={alternar}
          />
        </div>
      </div>
      {errorActivar ? (
        <p role="alert" className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-status-warning/15 p-3 text-small text-ink">
          <AlertTriangle className="size-4 shrink-0 text-status-warning" aria-hidden />
          <span>{errorActivar}</span>
          <Link
            to={`/app/admin/planes/${plan.id}/contenido`}
            className="font-bold text-brand-600 underline-offset-4 hover:underline"
          >
            Completar el contenido del plan
          </Link>
        </p>
      ) : null}
    </li>
  );
}

/* ───────────── Crear / editar plan ───────────── */

const esquemaPlan = z.object({
  nombre: z.string().trim().min(2, 'Escribe el nombre del plan').max(80, 'El nombre no puede pasar de 80 caracteres'),
  descripcion: z.string().trim().max(2000, 'La descripción no puede pasar de 2000 caracteres'),
});
type ValoresPlan = z.infer<typeof esquemaPlan>;

function PlanDialog({ aseguradora, plan, onClose }: { aseguradora: AseguradoraAdmin; plan?: PlanAdmin; onClose: () => void }) {
  const crear = useCrearPlan();
  const editar = useEditarPlan();
  const form = useForm<ValoresPlan>({
    resolver: zodResolver(esquemaPlan),
    defaultValues: { nombre: plan?.nombre ?? '', descripcion: plan?.descripcion ?? '' },
  });
  const guardando = crear.isPending || editar.isPending;

  const onSubmit = form.handleSubmit((v) => {
    const descripcion = v.descripcion === '' ? null : v.descripcion;
    const opciones = {
      onSuccess: () => {
        SuccessToast(plan ? 'Plan actualizado' : 'Plan creado. Queda inactivo hasta completar su contenido.');
        onClose();
      },
      onError: (e: unknown) => {
        if (!aplicarErroresBackend(e, form.setError, ['nombre', 'descripcion'])) ErrorToast(e);
      },
    };
    if (plan) editar.mutate({ id: plan.id, body: { nombre: v.nombre, descripcion } }, opciones);
    else crear.mutate({ aseguradoraId: aseguradora.id, nombre: v.nombre, descripcion }, opciones);
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{plan ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
            <DialogDescription>{aseguradora.nombre}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Nombre" error={form.formState.errors.nombre?.message} required>
              {(p) => <Input {...p} autoComplete="off" {...form.register('nombre')} />}
            </Field>
            <Field label="Descripción interna" error={form.formState.errors.descripcion?.message} help="Opcional. No la ve el cliente.">
              {(p) => (
                <textarea
                  {...p}
                  rows={3}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-base focus:border-brand-500 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-brand-300"
                  {...form.register('descripcion')}
                />
              )}
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outlineNavy" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={guardando}>
              {plan ? 'Guardar cambios' : 'Crear plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus } from 'lucide-react';
import { TEXTO_USO } from '../../../shared/types/enums';
import type { EscenarioAdmin } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Switch } from '../../../shared/ui/switch';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useEscenariosAdmin, useGuardarEscenario } from '../hooks/usePruebaChoqueAdmin';
import { EscenarioDialog } from '../prueba-choque/EscenarioDialog';
import { AvisoReferencial, PruebaChoqueTabs } from '../prueba-choque/PruebaChoqueTabs';
import { TEXTO_ZONA } from '../prueba-choque/textos';

/**
 * `/app/admin/prueba-choque/escenarios` (RF-36, RN-31): las situaciones que se prueban en cada plan. Los activos muestran lo
 * que les falta para que la simulación no salga coja: probabilidades sin cargar (el motor las toma como 0) y planes sin
 * cobertura (salen "Sin información", RN-30).
 */
export function PruebaChoqueEscenariosPage() {
  const { data, isLoading, isError, error, refetch } = useEscenariosAdmin();
  const guardar = useGuardarEscenario();
  const [editando, setEditando] = useState<EscenarioAdmin | null>(null);
  const [abierto, setAbierto] = useState(false);

  const escenarios = data ?? [];
  const ordenSugerido = escenarios.reduce((m, e) => Math.max(m, e.orden), 0) + 1;

  function abrir(e: EscenarioAdmin | null) {
    setEditando(e);
    setAbierto(true);
  }

  function alternarActivo(e: EscenarioAdmin, activo: boolean) {
    guardar.mutate(
      {
        codigo: e.codigo,
        body: {
          nombre: e.nombre,
          descripcion: e.descripcion,
          montoDanoReferencial: e.montoDanoReferencial === null ? null : Number(e.montoDanoReferencial),
          diasTaller: e.diasTaller,
          orden: e.orden,
          activo,
        },
      },
      {
        onSuccess: () => SuccessToast(activo ? 'Escenario activado' : 'Escenario desactivado', 'Vale desde la siguiente simulación.'),
        onError: (err) => ErrorToast(err),
      },
    );
  }

  return (
    <>
      <PageHeader
        titulo="Prueba de Choque · Escenarios"
        descripcion="Las situaciones que se prueban en cada plan: qué tan graves son y cuántos días deja el auto en taller."
        accion={
          <Button onClick={() => abrir(null)}>
            <Plus aria-hidden /> Nuevo escenario
          </Button>
        }
      />
      <PruebaChoqueTabs />
      <AvisoReferencial />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando los escenarios">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : escenarios.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay escenarios. Crea el primero." />
      ) : (
        <Table caption="Escenarios de la Prueba de Choque">
          <THead>
            <tr>
              <TH>Orden</TH>
              <TH>Escenario</TH>
              <TH>Daño de referencia</TH>
              <TH>Días en taller</TH>
              <TH>Activo</TH>
              <TH>Estado</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {escenarios.map((e) => {
              const p = e.pendientes;
              const hayPendientes = !!p && (p.frecuenciasFaltantes.length > 0 || p.planesSinCobertura.length > 0);
              return (
                <TR key={e.id} className="align-top">
                  <TD>{e.orden}</TD>
                  <TD>
                    <span className="block font-bold text-navy-700">{e.nombre}</span>
                    <span className="block font-mono text-caption text-ink-soft">{e.codigo}</span>
                    <span className="block text-small text-ink-soft">{e.descripcion}</span>
                    {hayPendientes ? (
                      <details className="mt-1 text-small">
                        <summary className="cursor-pointer font-bold text-status-pending">Ver qué falta</summary>
                        {p!.frecuenciasFaltantes.length > 0 ? (
                          <div className="mt-1">
                            <p className="text-ink">Sin probabilidad (el motor usa 0):</p>
                            <ul className="list-disc pl-5 text-ink-soft">
                              {p!.frecuenciasFaltantes.map((f) => (
                                <li key={`${f.uso}-${f.zona}`}>
                                  {TEXTO_USO[f.uso]} · zona {TEXTO_ZONA[f.zona].toLowerCase()}
                                </li>
                              ))}
                            </ul>
                            <Link to="/app/admin/prueba-choque/frecuencias" className="font-bold text-brand-600 underline-offset-4 hover:underline">
                              Cargar frecuencias
                            </Link>
                          </div>
                        ) : null}
                        {p!.planesSinCobertura.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-ink">Planes sin cobertura (salen &quot;Sin información&quot;):</p>
                            <ul className="list-disc pl-5 text-ink-soft">
                              {p!.planesSinCobertura.map((pl) => (
                                <li key={pl.planId}>
                                  {pl.aseguradora} · Plan {pl.plan}
                                </li>
                              ))}
                            </ul>
                            <Link to="/app/admin/prueba-choque/coberturas" className="font-bold text-brand-600 underline-offset-4 hover:underline">
                              Cargar deducibles y topes
                            </Link>
                          </div>
                        ) : null}
                      </details>
                    ) : null}
                  </TD>
                  <TD>
                    {e.montoDanoReferencial === null ? (
                      <span className="text-ink-soft">Suma asegurada del plan</span>
                    ) : (
                      <MoneyValue value={e.montoDanoReferencial} />
                    )}
                  </TD>
                  <TD>{e.diasTaller}</TD>
                  <TD>
                    <Switch
                      checked={e.activo}
                      disabled={guardar.isPending}
                      aria-label={`${e.activo ? 'Desactivar' : 'Activar'} ${e.nombre}`}
                      onCheckedChange={(v) => alternarActivo(e, v)}
                    />
                  </TD>
                  <TD>
                    {!e.activo ? <Badge tone="neutral">Inactivo</Badge> : hayPendientes ? <Badge tone="warning">Falta información</Badge> : <Badge tone="success">Completo</Badge>}
                  </TD>
                  <TD>
                    <Button size="sm" variant="outlineNavy" onClick={() => abrir(e)} aria-label={`Editar ${e.nombre}`}>
                      <Pencil aria-hidden /> Editar
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <EscenarioDialog open={abierto} onOpenChange={setAbierto} escenario={editando} ordenSugerido={ordenSugerido} />
    </>
  );
}

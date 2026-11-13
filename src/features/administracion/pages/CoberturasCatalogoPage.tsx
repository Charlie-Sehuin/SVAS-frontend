import { useState } from 'react';
import { Pencil, Plus, TriangleAlert } from 'lucide-react';
import type { CoberturaCatalogoAdmin } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { useCoberturasCatalogo } from '../hooks/useContenidoAdmin';
import { useEscenariosAdmin } from '../hooks/usePruebaChoqueAdmin';
import { CoberturaDialog } from '../contenido/CoberturaDialog';
import { TEXTO_CATEGORIA } from '../contenido/textos';

/**
 * `/app/admin/coberturas` (dominio §18, RN-42, RN-43): el catálogo común de coberturas. Cada plan debe decir sí o no a TODAS las
 * coberturas activas; agregar o activar una pide a los planes que la definan. Cada cobertura puede ligarse a los escenarios de la
 * Prueba de Choque que representa, para detectar contradicciones.
 */
export function CoberturasCatalogoPage() {
  const { data, isLoading, isError, error, refetch } = useCoberturasCatalogo();
  const escenarios = useEscenariosAdmin();
  const [editando, setEditando] = useState<CoberturaCatalogoAdmin | null>(null);
  const [abierto, setAbierto] = useState(false);

  const coberturas = data ?? [];
  const ordenSugerido = coberturas.reduce((m, c) => Math.max(m, c.orden), 0) + 1;
  const nombreEscenario = (codigo: string) => escenarios.data?.find((e) => e.codigo === codigo)?.nombre ?? codigo;

  function abrir(c: CoberturaCatalogoAdmin | null) {
    setEditando(c);
    setAbierto(true);
  }

  return (
    <>
      <PageHeader
        titulo="Catálogo de coberturas"
        descripcion="Las protecciones que cada plan dice si incluye o no. Los planes deben definir todas las coberturas activas para estar completos."
        accion={
          <Button onClick={() => abrir(null)}>
            <Plus aria-hidden /> Nueva cobertura
          </Button>
        }
      />

      <p role="note" className="mb-4 flex items-start gap-2 rounded-lg bg-status-warning/15 p-3 text-small text-ink">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-pending" aria-hidden />
        <span>Agregar o activar una cobertura deja incompletos a los planes que aún no la definan; revisa la completitud después de cambiar el catálogo.</span>
      </p>

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando el catálogo">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : coberturas.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay coberturas. Crea la primera." />
      ) : (
        <Table caption="Catálogo de coberturas">
          <THead>
            <tr>
              <TH>Orden</TH>
              <TH>Cobertura</TH>
              <TH>Categoría</TH>
              <TH>Escenarios de la Prueba de Choque</TH>
              <TH>Estado</TH>
              <TH>
                <span className="sr-only">Acciones</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {coberturas.map((c) => (
              <TR key={c.id} className="align-top">
                <TD>{c.orden}</TD>
                <TD>
                  <span className="block font-bold text-navy-700">{c.nombre}</span>
                  <span className="block font-mono text-caption text-ink-soft">{c.codigo}</span>
                  <span className="block text-small text-ink-soft">{c.descripcion}</span>
                </TD>
                <TD>{TEXTO_CATEGORIA[c.categoria]}</TD>
                <TD>
                  {c.escenarios.length === 0 ? (
                    <span className="text-ink-soft">Ninguno</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {c.escenarios.map((e) => (
                        <Badge key={e} tone="accent" dot={false}>
                          {nombreEscenario(e)}
                        </Badge>
                      ))}
                    </span>
                  )}
                </TD>
                <TD>{c.activa ? <Badge tone="success">Activa</Badge> : <Badge tone="neutral">Inactiva</Badge>}</TD>
                <TD>
                  <Button size="sm" variant="outlineNavy" onClick={() => abrir(c)} aria-label={`Editar ${c.nombre}`}>
                    <Pencil aria-hidden /> Editar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <CoberturaDialog open={abierto} onOpenChange={setAbierto} cobertura={editando} ordenSugerido={ordenSugerido} escenarios={escenarios.data ?? []} />
    </>
  );
}

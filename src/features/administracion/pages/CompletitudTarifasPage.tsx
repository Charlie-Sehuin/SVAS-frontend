import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { NOMBRE_PESO } from '../../../shared/lib/tarifas.constants';
import type { FaltanteTarifa } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Card, CardContent } from '../../../shared/ui/card';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { Paginacion } from '../../../shared/ui/domain/Paginacion';
import { TarifasTabs } from '../tarifas/TarifasTabs';
import { useAseguradoras, useCompletitudTarifas } from '../hooks/useAdmin';

const TAMANO = 50;

/** Qué modelo-año no cotiza y por qué (doc de dominio §17.9): sin rango de suma o sin algún peso que exige la fórmula. */
export function CompletitudTarifasPage() {
  const aseguradoras = useAseguradoras();
  const [aseguradoraId, setAseguradoraId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const completitud = useCompletitudTarifas(aseguradoraId || undefined);

  const nombre = useMemo(() => new Map(aseguradoras.data?.map((a) => [a.id, a.nombre]) ?? []), [aseguradoras.data]);

  const filtrados = useMemo<FaltanteTarifa[]>(() => {
    const q = busqueda.trim().toLowerCase();
    const items = completitud.data?.items ?? [];
    return q ? items.filter((i) => `${i.marca} ${i.modelo} ${i.anio}`.toLowerCase().includes(q)) : items;
  }, [completitud.data, busqueda]);

  const ultimaPagina = Math.max(1, Math.ceil(filtrados.length / TAMANO));
  const paginaActual = Math.min(pagina, ultimaPagina);
  const visibles = filtrados.slice((paginaActual - 1) * TAMANO, paginaActual * TAMANO);

  return (
    <>
      <PageHeader
        titulo="Tarifas · Completitud"
        descripcion="Modelos y años que una aseguradora activa no puede cotizar. Corrige cada caso cargando su rango de suma o el peso que falta."
      />
      <TarifasTabs />

      <FiltrosBar>
        <Filtro label="Aseguradora" className="min-w-56">
          <Select
            compact
            value={aseguradoraId}
            onChange={(e) => {
              setAseguradoraId(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todas las activas</option>
            {aseguradoras.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </Filtro>
        <Filtro label="Buscar modelo" className="min-w-48 flex-1">
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Marca, modelo o año"
            className="h-10"
          />
        </Filtro>
      </FiltrosBar>

      {completitud.isError ? (
        <EstadoError error={completitud.error} onRetry={() => void completitud.refetch()} />
      ) : completitud.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando completitud">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : completitud.data ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
            <Resumen
              etiqueta="Estado general"
              valor={completitud.data.completa ? 'Completo' : 'Incompleto'}
              tono={completitud.data.completa ? 'success' : 'warning'}
            />
            <Resumen etiqueta="Modelo-año sin rango" valor={String(completitud.data.sinRango)} tono={completitud.data.sinRango === 0 ? 'success' : 'warning'} />
            <Resumen
              etiqueta="Con pesos faltantes"
              valor={String(completitud.data.conPesosFaltantes)}
              tono={completitud.data.conPesosFaltantes === 0 ? 'success' : 'warning'}
            />
          </div>

          {completitud.data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-status-success/30 bg-status-success/5 py-10 text-center">
              <CheckCircle2 className="size-8 text-status-success" aria-hidden />
              <p className="font-bold text-status-success">Todo cotiza.</p>
              <p className="text-small text-ink-soft">Ninguna aseguradora activa tiene modelos sin rango ni pesos faltantes.</p>
            </div>
          ) : filtrados.length === 0 ? (
            <EstadoVacio titulo="Ningún resultado con esa búsqueda." />
          ) : (
            <>
              <Table caption="Modelos y años que no cotizan">
                <THead>
                  <TR>
                    <TH>Aseguradora</TH>
                    <TH>Vehículo</TH>
                    <TH>Año</TH>
                    <TH>Por qué no cotiza</TH>
                  </TR>
                </THead>
                <TBody>
                  {visibles.map((i) => (
                    <TR key={`${i.aseguradoraId}|${i.modeloId}|${i.anio}`}>
                      <TD>{nombre.get(i.aseguradoraId) ?? i.codigoEstrategia}</TD>
                      <TD className="font-bold text-ink">
                        {i.marca} {i.modelo}
                      </TD>
                      <TD className="tabular">{i.anio}</TD>
                      <TD>
                        <div className="flex flex-wrap gap-1.5">
                          {i.sinRango ? <Badge tone="warning">Sin rango de suma</Badge> : null}
                          {i.pesosFaltantes.map((p) => (
                            <Badge key={p} tone="danger">
                              Falta peso de {NOMBRE_PESO[p].toLowerCase()}
                            </Badge>
                          ))}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Paginacion pagina={paginaActual} tamano={TAMANO} total={filtrados.length} onChange={setPagina} />
            </>
          )}
        </>
      ) : null}
    </>
  );
}

function Resumen({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono: 'success' | 'warning' }) {
  return (
    <Card>
      <CardContent className="p-4 pt-4 lg:p-4 lg:pt-4">
        <p className="text-small text-ink-soft">{etiqueta}</p>
        <p className="mt-1 flex items-center gap-2 text-h2 text-navy-700">
          {valor}
          <Badge tone={tono}>{tono === 'success' ? 'Sin pendientes' : 'Requiere atención'}</Badge>
        </p>
      </CardContent>
    </Card>
  );
}

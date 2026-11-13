import { Link } from 'react-router-dom';
import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import type { CompletitudPlan } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';
import { useCompletitudContenido } from '../hooks/useContenidoAdmin';

/** Qué le falta a un plan, en frases (RN-42): cada cosa que impide activarlo. */
export function pendientesDe(p: CompletitudPlan): string[] {
  const faltas: string[] = [];
  if (p.coberturasFaltantes > 0) faltas.push(`Faltan ${p.coberturasFaltantes} ${p.coberturasFaltantes === 1 ? 'cobertura' : 'coberturas'} por definir`);
  if (!p.tieneResumen) faltas.push('Sin resumen');
  if (!p.tieneDescripcion) faltas.push('Sin descripción');
  if (!p.tieneIdealPara) faltas.push('Sin "ideal para"');
  if (p.nExclusiones === 0) faltas.push('Sin exclusiones');
  if (p.nRequisitos === 0) faltas.push('Sin requisitos');
  return faltas;
}

/** Un plan completo con contradicciones con la Prueba de Choque (RN-43) se marca "Incoherente": se guarda, pero hay que revisarlo. */
function estadoDe(p: CompletitudPlan): 'COMPLETO' | 'INCOMPLETO' | 'INCOHERENTE' {
  if (!p.completo) return 'INCOMPLETO';
  return p.incoherenciasPruebaChoque > 0 ? 'INCOHERENTE' : 'COMPLETO';
}

/**
 * `/app/admin/contenido/completitud` (dominio §18.10, RN-42, RN-43): qué planes tienen su contenido completo para poder
 * activarse y mostrarse al cliente, y cuáles contradicen a la Prueba de Choque. Un plan inactivo puede estar incompleto sin problema.
 */
export function CompletitudContenidoPage() {
  const { data, isLoading, isError, error, refetch } = useCompletitudContenido();
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        titulo="Contenido de planes · Completitud"
        descripcion="Un plan solo puede activarse si su contenido está completo. Aquí ves qué le falta a cada uno y cuáles contradicen a la Prueba de Choque."
      />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando la completitud">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay planes." />
      ) : (
        <>
          {data!.completo ? (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-status-success/10 p-3 text-ink">
              <CheckCircle2 className="size-5 shrink-0 text-status-success" aria-hidden /> Todos los planes activos tienen su contenido completo.
            </p>
          ) : (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-status-warning/15 p-3 text-ink">
              <TriangleAlert className="size-5 shrink-0 text-status-pending" aria-hidden />
              {data!.planesActivosIncompletos === 1
                ? '1 plan activo tiene el contenido incompleto.'
                : `${data!.planesActivosIncompletos} planes activos tienen el contenido incompleto.`}
            </p>
          )}

          <Table caption="Completitud del contenido de cada plan">
            <THead>
              <tr>
                <TH>Plan</TH>
                <TH>Plan activo</TH>
                <TH>Estado</TH>
                <TH>Qué falta</TH>
                <TH>Contradicciones</TH>
                <TH>Actualizado</TH>
                <TH>
                  <span className="sr-only">Acción</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {items.map((p) => {
                const faltas = pendientesDe(p);
                return (
                  <TR key={p.planId} className="align-top">
                    <TD>
                      <span className="block text-caption text-ink-soft">{p.aseguradora}</span>
                      <span className="font-bold text-navy-700">Plan {p.plan}</span>
                    </TD>
                    <TD>{p.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</TD>
                    <TD>
                      <StatusBadge entity="completitud" value={estadoDe(p)} />
                    </TD>
                    <TD>
                      {faltas.length === 0 ? (
                        <span className="text-ink-soft">Nada</span>
                      ) : (
                        <ul className="list-disc pl-4 text-small">
                          {faltas.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </TD>
                    <TD>
                      {p.incoherenciasPruebaChoque > 0
                        ? `${p.incoherenciasPruebaChoque} ${p.incoherenciasPruebaChoque === 1 ? 'cobertura' : 'coberturas'}`
                        : <span className="text-ink-soft">Ninguna</span>}
                    </TD>
                    <TD>{p.contenidoActualizadoEn ? formatearFecha(p.contenidoActualizadoEn) : <span className="text-ink-soft">Nunca</span>}</TD>
                    <TD>
                      <Button size="sm" variant={p.completo ? 'outlineNavy' : 'primary'} asChild>
                        <Link to={`/app/admin/planes/${p.planId}/contenido`}>{p.completo ? 'Editar contenido' : 'Completar contenido'}</Link>
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </>
      )}
    </>
  );
}

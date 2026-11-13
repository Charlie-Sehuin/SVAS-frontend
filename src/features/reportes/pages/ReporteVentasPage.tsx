import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import type { AgruparVentas, GrupoVentas } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { ErrorToast } from '../../../shared/ui/domain/toasts';
import { BarrasHorizontales } from '../components/BarrasHorizontales';
import { KpiCard } from '../components/KpiCard';
import { ReporteShell } from '../components/ReporteShell';
import { useDescargarVentasPdf, useVentas } from '../hooks/useReportes';
import { cantidad, TEXTO_CANAL_VENTA, textoPorcentaje } from '../lib/formato';
import { usePeriodoEnLaUrl } from '../lib/periodo';

const AGRUPACIONES: { valor: AgruparVentas; texto: string }[] = [
  { valor: 'canal', texto: 'Por canal' },
  { valor: 'aseguradora', texto: 'Por aseguradora' },
  { valor: 'plan', texto: 'Por plan' },
];

const etiquetaDe = (g: GrupoVentas, agrupar: AgruparVentas) => (agrupar === 'canal' ? (TEXTO_CANAL_VENTA[g.etiqueta] ?? g.etiqueta) : g.etiqueta);

/**
 * `/app/reportes/ventas` (RF-30, OE3): pólizas emitidas en el periodo, por canal, aseguradora o plan, con lo cobrado hasta
 * hoy (en cuotas solo cuenta lo ya pagado) y el PDF del mismo reporte. Todo monto y porcentaje lo calcula el backend.
 */
export function ReporteVentasPage() {
  const periodo = usePeriodoEnLaUrl();
  const [params, setParams] = useSearchParams();
  const crudo = params.get('agrupar');
  const agrupar: AgruparVentas = crudo === 'aseguradora' || crudo === 'plan' ? crudo : 'canal';
  const consulta = useVentas(periodo.periodo, agrupar, periodo.habilitado);
  const pdf = useDescargarVentasPdf();

  const cambiarAgrupacion = (valor: AgruparVentas) =>
    setParams(
      (previo) => {
        const s = new URLSearchParams(previo);
        if (valor === 'canal') s.delete('agrupar');
        else s.set('agrupar', valor);
        return s;
      },
      { replace: true },
    );

  return (
    <ReporteShell
      titulo="Reporte de ventas"
      descripcion="Pólizas emitidas en el periodo. En compras en cuotas, «cobrado» cuenta solo lo ya pagado."
      periodo={periodo}
      consulta={consulta}
      accion={
        <Button variant="outlineNavy" disabled={!periodo.habilitado} loading={pdf.isPending} loadingText="Preparando el PDF…" onClick={() => pdf.mutate({ periodo: periodo.periodo, agrupar }, { onError: (e) => ErrorToast(e) })}>
          <Download aria-hidden /> Descargar PDF
        </Button>
      }
    >
      {(r) => {
        const t = r.totales;
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard etiqueta="Pólizas emitidas" valor={t.polizas} ayuda={`${cantidad(t.enCuotas, 'compra', 'compras')} en cuotas`} />
              <KpiCard etiqueta="Prima final vendida" valor={<MoneyValue value={t.primaFinal} size="inline" className="text-money-xl text-navy-700" />} ayuda="Ya con descuentos" />
              <KpiCard etiqueta="Cobrado hasta hoy" valor={<MoneyValue value={t.cobrado} size="inline" className="text-money-xl text-navy-700" />} />
              <KpiCard
                etiqueta="Ticket promedio"
                valor={t.ticketPromedio === null ? 'Sin datos' : <MoneyValue value={t.ticketPromedio} size="inline" className="text-money-xl text-navy-700" />}
              />
            </div>
            <p className="text-small text-ink-soft">
              Prima anual sin descuentos: <MoneyValue value={t.primaAnual} /> · Descontado: <MoneyValue value={t.descuentos} />
            </p>

            {t.polizas === 0 ? (
              <EstadoVacio titulo="No hubo ventas en este periodo." />
            ) : (
              <>
                <div role="group" aria-label="Agrupar ventas" className="flex flex-wrap gap-2">
                  {AGRUPACIONES.map((a) => (
                    <button
                      key={a.valor}
                      type="button"
                      aria-pressed={agrupar === a.valor}
                      onClick={() => cambiarAgrupacion(a.valor)}
                      className={cn(
                        'min-h-11 rounded-lg border-2 px-4 text-small font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300',
                        agrupar === a.valor ? 'border-navy-700 bg-navy-50 text-navy-700' : 'border-line bg-surface text-ink-soft hover:border-navy-300',
                      )}
                    >
                      {a.texto}
                    </button>
                  ))}
                </div>

                <Card className="p-4 lg:p-5">
                  <h2 className="mb-3 text-h3 text-navy-700">Prima final por {agrupar === 'canal' ? 'canal' : agrupar === 'aseguradora' ? 'aseguradora' : 'plan'}</h2>
                  <BarrasHorizontales
                    etiqueta="Prima final por grupo"
                    items={r.grupos.map((g) => ({
                      id: g.clave,
                      etiqueta: etiquetaDe(g, agrupar),
                      valor: g.primaFinal,
                      texto: (
                        <>
                          <MoneyValue value={g.primaFinal} /> · {textoPorcentaje(g.participacion)}
                        </>
                      ),
                      detalle: cantidad(g.polizas, 'póliza', 'pólizas'),
                    }))}
                  />
                </Card>

                <Table caption="Ventas por grupo">
                  <THead>
                    <tr>
                      <TH>{agrupar === 'canal' ? 'Canal' : agrupar === 'aseguradora' ? 'Aseguradora' : 'Plan'}</TH>
                      <TH>Pólizas</TH>
                      <TH>En cuotas</TH>
                      <TH>Prima anual</TH>
                      <TH>Prima final</TH>
                      <TH>Cobrado</TH>
                      <TH>Ticket promedio</TH>
                      <TH>Participación</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {r.grupos.map((g) => (
                      <TR key={g.clave}>
                        <TD className="font-bold text-navy-700">{etiquetaDe(g, agrupar)}</TD>
                        <TD>{g.polizas}</TD>
                        <TD>{g.enCuotas}</TD>
                        <TD>
                          <MoneyValue value={g.primaAnual} />
                        </TD>
                        <TD>
                          <MoneyValue value={g.primaFinal} />
                        </TD>
                        <TD>
                          <MoneyValue value={g.cobrado} />
                        </TD>
                        <TD>
                          <MoneyValue value={g.ticketPromedio} />
                        </TD>
                        <TD>{textoPorcentaje(g.participacion)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </>
            )}
          </div>
        );
      }}
    </ReporteShell>
  );
}

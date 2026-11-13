import { Card } from '../../../shared/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { formatearPorcentaje } from '../../../shared/lib/format';
import { KpiCard } from '../components/KpiCard';
import { ReporteShell } from '../components/ReporteShell';
import { useDescuentos } from '../hooks/useReportes';
import { textoPorcentaje } from '../lib/formato';
import { usePeriodoEnLaUrl } from '../lib/periodo';

const porcentajeOGuion = (p: string | null) => (p === null ? 'Sin datos' : formatearPorcentaje(p));

/**
 * `/app/reportes/descuentos` (RN-07, RN-08, RN-09): los descuentos negociados por los asesores (cuántos se otorgaron, cuántos
 * se aceptaron y cuántos terminaron en compra) y los de primera compra. «Convertidos» = el cliente compró con ese descuento.
 */
export function ReporteDescuentosPage() {
  const periodo = usePeriodoEnLaUrl();
  const consulta = useDescuentos(periodo.periodo, periodo.habilitado);
  return (
    <ReporteShell
      titulo="Reporte de descuentos"
      descripcion="Descuentos negociados por los asesores y de primera compra. «Convertidos» son los que terminaron en una compra."
      periodo={periodo}
      consulta={consulta}
    >
      {(r) => {
        const n = r.negociados;
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard etiqueta="Descuentos negociados" valor={n.otorgados} ayuda={`Aceptados: ${n.aceptados}`} />
              <KpiCard etiqueta="Terminaron en compra" valor={n.convertidos} ayuda={`Conversión: ${textoPorcentaje(n.tasaConversion)}`} />
              <KpiCard
                etiqueta="Descuento promedio"
                valor={porcentajeOGuion(n.porcentajePromedio)}
                ayuda={n.porcentajeMaximo === null ? undefined : `Máximo otorgado: ${formatearPorcentaje(n.porcentajeMaximo)}`}
              />
              <KpiCard etiqueta="Monto descontado" valor={<MoneyValue value={n.montoDescontado} size="inline" className="text-money-xl text-navy-700" />} ayuda="En las compras que convirtieron" />
            </div>

            <Card className="p-4 lg:p-5">
              <h2 className="text-h3 text-navy-700">Descuento de primera compra</h2>
              <p className="mt-1 text-ink">
                Se aplicó en <strong>{r.primeraCompra.aplicados}</strong> {r.primeraCompra.aplicados === 1 ? 'compra' : 'compras'}, por un total de{' '}
                <MoneyValue value={r.primeraCompra.montoDescontado} />.
              </p>
            </Card>

            <section aria-labelledby="titulo-por-asesor">
              <h2 id="titulo-por-asesor" className="mb-2 text-h3 text-navy-700">
                Negociados por asesor
              </h2>
              {r.porAsesor.length === 0 ? (
                <EstadoVacio titulo="Ningún asesor negoció descuentos en este periodo." />
              ) : (
                <Table caption="Descuentos negociados por asesor">
                  <THead>
                    <tr>
                      <TH>Asesor</TH>
                      <TH>Otorgados</TH>
                      <TH>Aceptados</TH>
                      <TH>Convertidos</TH>
                      <TH>Conversión</TH>
                      <TH>% promedio</TH>
                      <TH>% máximo</TH>
                      <TH>Monto descontado</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {r.porAsesor.map((a) => (
                      <TR key={a.asesorId}>
                        <TD className="font-bold text-navy-700">{a.asesor}</TD>
                        <TD>{a.otorgados}</TD>
                        <TD>{a.aceptados}</TD>
                        <TD>{a.convertidos}</TD>
                        <TD>{textoPorcentaje(a.tasaConversion)}</TD>
                        <TD>{porcentajeOGuion(a.porcentajePromedio)}</TD>
                        <TD>{porcentajeOGuion(a.porcentajeMaximo)}</TD>
                        <TD>
                          <MoneyValue value={a.montoDescontado} />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </section>
          </div>
        );
      }}
    </ReporteShell>
  );
}

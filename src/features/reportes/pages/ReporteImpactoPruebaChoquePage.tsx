import { ShieldAlert } from 'lucide-react';
import { TEXTO_USO } from '../../../shared/types/enums';
import type { ConversionGrupo } from '../../../shared/types/api';
import { Card } from '../../../shared/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { TEXTO_ZONA } from '../../administracion/prueba-choque/textos';
import { BarrasHorizontales } from '../components/BarrasHorizontales';
import { KpiCard } from '../components/KpiCard';
import { ReporteShell } from '../components/ReporteShell';
import { useImpactoPruebaChoque } from '../hooks/useReportes';
import { cantidad, textoPorcentaje } from '../lib/formato';
import { usePeriodoEnLaUrl } from '../lib/periodo';

const detalleConversion = (g: ConversionGrupo) => `${cantidad(g.compras, 'compra', 'compras')} de ${cantidad(g.cotizaciones, 'cotización', 'cotizaciones')}`;

/**
 * ★ `/app/reportes/prueba-choque` (dominio §16.7): ¿la Prueba de Choque ayuda a vender? Mide cuántas cotizaciones la usan, si
 * convierten más que las que no, si quienes la usan eligen un plan distinto al más barato y qué les preocupa, por tipo de uso
 * y zona. Todo viene calculado del backend: aquí solo se muestra, con «Sin datos» cuando no hay base.
 */
export function ReporteImpactoPruebaChoquePage() {
  const periodo = usePeriodoEnLaUrl();
  const consulta = useImpactoPruebaChoque(periodo.periodo, periodo.habilitado);
  return (
    <ReporteShell
      titulo="Impacto de la Prueba de Choque"
      descripcion="Cuántos clientes la usan, si compran más que quienes no la usan y qué plan eligen después de probarla."
      periodo={periodo}
      consulta={consulta}
    >
      {(r) => {
        const c = r.conversion;
        const t = r.comprasTrasSimular;
        const m = r.conversionMensajeRn35;
        return (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard etiqueta="Cotizaciones del periodo" valor={r.cotizaciones} />
              <KpiCard etiqueta="Usaron la Prueba de Choque" valor={r.conSimulacion} ayuda={`${textoPorcentaje(r.porcentajeConSimulacion)} de las cotizaciones`} />
              <KpiCard
                etiqueta="Conversión con la prueba"
                valor={textoPorcentaje(c.conSimulacion.tasa)}
                ayuda={`Sin la prueba: ${textoPorcentaje(c.sinSimulacion.tasa)}`}
              />
            </div>

            <Card className="p-4 lg:p-5">
              <h2 className="flex items-center gap-2 text-h3 text-navy-700">
                <ShieldAlert className="size-5 text-accent-600" aria-hidden /> ¿Compran más quienes la usan?
              </h2>
              <p className="mb-3 text-small text-ink-soft">Cotizaciones que terminaron en compra, con y sin Prueba de Choque.</p>
              <BarrasHorizontales
                etiqueta="Conversión con y sin Prueba de Choque"
                tono="accent"
                items={[
                  {
                    id: 'con',
                    etiqueta: 'Con Prueba de Choque',
                    valor: c.conSimulacion.tasa ?? 0,
                    texto: textoPorcentaje(c.conSimulacion.tasa),
                    detalle: detalleConversion(c.conSimulacion),
                  },
                  {
                    id: 'sin',
                    etiqueta: 'Sin Prueba de Choque',
                    valor: c.sinSimulacion.tasa ?? 0,
                    texto: textoPorcentaje(c.sinSimulacion.tasa),
                    detalle: detalleConversion(c.sinSimulacion),
                  },
                ]}
              />
              <p className="mt-3 text-caption text-ink-soft">
                Es una comparación, no una prueba de causa: quien usa la Prueba de Choque puede ser también quien ya venía más decidido a comprar.
              </p>
            </Card>

            <Card className="p-4 lg:p-5">
              <h2 className="text-h3 text-navy-700">¿Qué plan eligen después de probarla?</h2>
              {t.compras === 0 ? (
                <p className="mt-2 text-ink-soft">Nadie compró después de simular en este periodo.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-ink">
                  <li>
                    {cantidad(t.compras, 'compra', 'compras')} después de simular.
                  </li>
                  <li>
                    <strong>{t.planDistintoAlMasBarato}</strong> eligieron un plan distinto al más barato ({textoPorcentaje(t.porcentajeDistinto)}).
                  </li>
                  <li>
                    <strong>{t.eligieronElPrimero}</strong> eligieron el primero del ranking por costo real ({textoPorcentaje(t.porcentajePrimero)}).
                  </li>
                </ul>
              )}
            </Card>

            <section aria-labelledby="titulo-preocupaciones">
              <h2 id="titulo-preocupaciones" className="mb-2 text-h3 text-navy-700">
                Qué les preocupa, por uso y zona
              </h2>
              {r.preocupaciones.length === 0 ? (
                <EstadoVacio titulo="Todavía no hay simulaciones con preocupaciones en este periodo." />
              ) : (
                <Table caption="Preocupaciones elegidas por tipo de uso y zona de riesgo">
                  <THead>
                    <tr>
                      <TH>Uso del vehículo</TH>
                      <TH>Zona</TH>
                      <TH>Simulaciones</TH>
                      <TH>Más elegido</TH>
                      <TH>Todas las preocupaciones</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {r.preocupaciones.map((p) => (
                      <TR key={`${p.segmento}-${p.zona}`} className="align-top">
                        <TD className="font-bold text-navy-700">{TEXTO_USO[p.segmento] ?? p.segmento}</TD>
                        <TD>{TEXTO_ZONA[p.zona] ?? p.zona}</TD>
                        <TD>{p.simulaciones}</TD>
                        <TD>{p.masElegido ? `${p.masElegido.nombre} (${p.masElegido.veces})` : <span className="text-ink-soft">Ninguno</span>}</TD>
                        <TD>
                          {p.escenarios.length === 0 ? (
                            <span className="text-ink-soft">Ninguna</span>
                          ) : (
                            <ul className="list-disc pl-4 text-small">
                              {p.escenarios.map((e) => (
                                <li key={e.codigo}>
                                  {e.nombre}: {e.veces}
                                </li>
                              ))}
                            </ul>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </section>

            <Card className="p-4 lg:p-5">
              <h2 className="text-h3 text-navy-700">Mensaje final con la frase de contraste (RN-35)</h2>
              {m === null || m.conRn35.mensajes + m.sinRn35.mensajes === 0 ? (
                <p className="mt-2 text-ink-soft">Todavía no hay mensajes finales enviados en este periodo.</p>
              ) : (
                <>
                  <p className="mb-3 text-small text-ink-soft">De los seguimientos cuyo mensaje final salió, cuántos terminaron en compra según si el mensaje llevó la frase de contraste.</p>
                  <BarrasHorizontales
                    etiqueta="Conversión del mensaje final"
                    tono="accent"
                    items={[
                      {
                        id: 'con',
                        etiqueta: 'Con la frase de contraste',
                        valor: m.conRn35.tasa ?? 0,
                        texto: textoPorcentaje(m.conRn35.tasa),
                        detalle: `${cantidad(m.conRn35.compras, 'compra', 'compras')} de ${cantidad(m.conRn35.mensajes, 'mensaje', 'mensajes')}`,
                      },
                      {
                        id: 'sin',
                        etiqueta: 'Sin la frase de contraste',
                        valor: m.sinRn35.tasa ?? 0,
                        texto: textoPorcentaje(m.sinRn35.tasa),
                        detalle: `${cantidad(m.sinRn35.compras, 'compra', 'compras')} de ${cantidad(m.sinRn35.mensajes, 'mensaje', 'mensajes')}`,
                      },
                    ]}
                  />
                </>
              )}
            </Card>
          </div>
        );
      }}
    </ReporteShell>
  );
}

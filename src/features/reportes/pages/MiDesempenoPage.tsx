import { useAuth } from '../../../auth/useAuth';
import { UnauthorizedPage } from '../../../auth/UnauthorizedPage';
import { Card } from '../../../shared/ui/card';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { formatearPorcentaje } from '../../../shared/lib/format';
import type { MotivoAsesoria } from '../../../shared/types/enums';
import { TEXTO_MOTIVO } from '../../asesoria-retencion/asesor/textos';
import { EmbudoRetencionVista } from '../components/EmbudoRetencionVista';
import { KpiCard } from '../components/KpiCard';
import { ReporteShell } from '../components/ReporteShell';
import { useMiDesempeno } from '../hooks/useReportes';
import { textoPorcentaje } from '../lib/formato';
import { usePeriodoEnLaUrl } from '../lib/periodo';

/**
 * `/app/reportes/mi-desempeno` (RF-38): el desempeño del propio asesor y de nadie más. Sus asesorías, su embudo de retención
 * (solo los seguimientos donde él intentó contactar), sus descuentos y las ventas que se le atribuyen (asesoría y telemarketing).
 */
export function MiDesempenoPage() {
  const { roles } = useAuth();
  const esAsesor = roles.includes('ASESOR');
  const periodo = usePeriodoEnLaUrl();
  const consulta = useMiDesempeno(periodo.periodo, periodo.habilitado && esAsesor);

  // Solo el ASESOR tiene este reporte (el backend responde 403 al resto): se explica sin pedirlo.
  if (!esAsesor) return <UnauthorizedPage />;

  return (
    <ReporteShell titulo="Mi desempeño" descripcion="Tus asesorías, tus seguimientos, tus descuentos y las ventas que se te atribuyen." periodo={periodo} consulta={consulta}>
      {(r) => {
        const a = r.asesorias;
        const d = r.descuentos;
        const v = r.ventasAtribuidas;
        return (
          <div className="space-y-6">
            <section aria-labelledby="titulo-asesorias" className="space-y-4">
              <h2 id="titulo-asesorias" className="text-h3 text-navy-700">
                Asesorías
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard etiqueta="Atendidas" valor={a.atendidas} />
                <KpiCard etiqueta="Cerradas" valor={a.cerradas} />
                <KpiCard etiqueta="En atención ahora" valor={a.enAtencion} />
              </div>
              <Card className="p-4">
                <h3 className="mb-1 font-bold text-navy-700">Por motivo</h3>
                <ul className="divide-y divide-line rounded-lg border border-line text-small">
                  {(Object.keys(TEXTO_MOTIVO) as MotivoAsesoria[]).map((m) => (
                    <li key={m} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span>{TEXTO_MOTIVO[m]}</span>
                      <span className="font-bold tabular text-ink">{a.porMotivo[m] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>

            <section aria-labelledby="titulo-ventas" className="space-y-4">
              <h2 id="titulo-ventas" className="text-h3 text-navy-700">
                Ventas que se te atribuyen
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard etiqueta="Pólizas" valor={v.polizas} ayuda={`${v.porAsesoria} por asesoría · ${v.porTelemarketing} por telemarketing`} />
                <KpiCard etiqueta="Prima final" valor={<MoneyValue value={v.primaFinal} size="inline" className="text-money-xl text-navy-700" />} />
              </div>
            </section>

            <section aria-labelledby="titulo-descuentos" className="space-y-4">
              <h2 id="titulo-descuentos" className="text-h3 text-navy-700">
                Tus descuentos
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard etiqueta="Otorgados" valor={d.otorgados} ayuda={`Aceptados: ${d.aceptados}`} />
                <KpiCard etiqueta="Terminaron en compra" valor={d.convertidos} ayuda={`Conversión: ${textoPorcentaje(d.tasaConversion)}`} />
                <KpiCard etiqueta="Descuento promedio" valor={d.porcentajePromedio === null ? 'Sin datos' : formatearPorcentaje(d.porcentajePromedio)} />
              </div>
            </section>

            <section aria-labelledby="titulo-retencion" className="space-y-4">
              <h2 id="titulo-retencion" className="text-h3 text-navy-700">
                Tus seguimientos
              </h2>
              <EmbudoRetencionVista embudo={r.retencion} />
            </section>
          </div>
        );
      }}
    </ReporteShell>
  );
}

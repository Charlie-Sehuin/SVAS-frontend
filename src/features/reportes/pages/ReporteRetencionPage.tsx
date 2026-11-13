import { EmbudoRetencionVista } from '../components/EmbudoRetencionVista';
import { ReporteShell } from '../components/ReporteShell';
import { useRetencion } from '../hooks/useReportes';
import { usePeriodoEnLaUrl } from '../lib/periodo';

/**
 * `/app/reportes/retencion` (OE3, RF-16..21): qué tan bien recupera ventas el seguimiento de las cotizaciones abandonadas.
 * Cohorte = seguimientos abiertos en el periodo.
 */
export function ReporteRetencionPage() {
  const periodo = usePeriodoEnLaUrl();
  const consulta = useRetencion(periodo.periodo, periodo.habilitado);
  return (
    <ReporteShell
      titulo="Reporte de retención"
      descripcion="De las cotizaciones que quedaron sin comprar, cuántas se recuperaron con el seguimiento."
      periodo={periodo}
      consulta={consulta}
    >
      {(r) => <EmbudoRetencionVista embudo={r} />}
    </ReporteShell>
  );
}

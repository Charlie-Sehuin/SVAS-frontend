import type { EmbudoRetencion } from '../../../shared/types/api';
import type { CanalContacto, MotivoCierre, ResultadoIntento } from '../../../shared/types/enums';
import { Card } from '../../../shared/ui/card';
import { TEXTO_CANAL, TEXTO_RESULTADO_INTENTO, TEXTO_MOTIVO_CIERRE } from '../../asesoria-retencion/asesor/textos';
import { cantidad, textoPorcentaje } from '../lib/formato';
import { BarrasHorizontales } from './BarrasHorizontales';
import { KpiCard } from './KpiCard';

/** Una lista corta "etiqueta · cantidad" para los desgloses (motivos, resultados, canales). */
function Desglose<K extends string>({ titulo, datos, textos }: { titulo: string; datos: Record<K, number>; textos: Record<K, string> }) {
  const claves = Object.keys(textos) as K[];
  return (
    <div>
      <h3 className="mb-1 font-bold text-navy-700">{titulo}</h3>
      <ul className="divide-y divide-line rounded-lg border border-line text-small">
        {claves.map((k) => (
          <li key={k} className="flex items-center justify-between gap-3 px-3 py-2">
            <span>{textos[k]}</span>
            <span className="font-bold tabular text-ink">{datos[k] ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Embudo de retención (RF-16..21, OE3): de los seguimientos abiertos en el periodo, cuántos tuvieron un intento, lograron
 * contactar, aceptaron, usaron el enlace y compraron. Lo usan el reporte de retención (todos los seguimientos) y "Mi
 * desempeño" (solo aquellos donde el asesor intentó). La tasa de conversión la calcula el backend; `null` = no hay base.
 */
export function EmbudoRetencionVista({ embudo: e }: { embudo: EmbudoRetencion }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard etiqueta="Seguimientos abiertos" valor={e.abiertos} />
        <KpiCard etiqueta="Compraron" valor={e.convertidos} ayuda={`Siguen en seguimiento: ${e.enSeguimiento}`} />
        <KpiCard etiqueta="Tasa de conversión" valor={textoPorcentaje(e.tasaConversion)} ayuda={e.abiertos === 0 ? 'No hubo seguimientos en este periodo.' : undefined} />
        <KpiCard
          etiqueta="Días hasta comprar"
          valor={e.diasPromedioConversion === null ? 'Sin datos' : `${e.diasPromedioConversion.replace('.', ',')} días`}
          ayuda="Promedio de quienes compraron"
        />
      </div>

      <Card className="p-4 lg:p-5">
        <h2 className="mb-3 text-h3 text-navy-700">Del seguimiento a la compra</h2>
        <BarrasHorizontales
          etiqueta="Embudo de retención"
          items={[
            { id: 'abiertos', etiqueta: 'Seguimientos abiertos', valor: e.abiertos, texto: cantidad(e.abiertos, 'seguimiento', 'seguimientos') },
            { id: 'intentos', etiqueta: 'Con al menos un intento de contacto', valor: e.conIntentos, texto: String(e.conIntentos) },
            { id: 'contactados', etiqueta: 'Se logró contactar', valor: e.contactados, texto: String(e.contactados) },
            { id: 'aceptaron', etiqueta: 'Aceptaron', valor: e.aceptaron, texto: String(e.aceptaron) },
            { id: 'enlace', etiqueta: 'Usaron el enlace de compra', valor: e.enlaceUsado, texto: String(e.enlaceUsado) },
            { id: 'compraron', etiqueta: 'Compraron', valor: e.convertidos, texto: String(e.convertidos) },
          ]}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <Desglose<MotivoCierre> titulo={`Descartados: ${e.descartados}`} datos={e.descartadosPorMotivo} textos={TEXTO_MOTIVO_CIERRE} />
        </Card>
        <Card className="p-4">
          <Desglose<ResultadoIntento> titulo={`Intentos por resultado (${e.intentos.total})`} datos={e.intentos.porResultado} textos={TEXTO_RESULTADO_INTENTO} />
        </Card>
        <Card className="p-4">
          <Desglose<CanalContacto> titulo="Intentos por canal" datos={e.intentos.porCanal} textos={TEXTO_CANAL} />
        </Card>
      </div>
    </div>
  );
}

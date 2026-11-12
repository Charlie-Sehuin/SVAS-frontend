import { etiquetaParametro, NOMBRE_PESO } from '../../lib/tarifas.constants';
import { formatearMonto } from '../../lib/format';
import type { DetalleCalculoTarifa, TablaPeso } from '../../types/api';

/** Claves que ya se muestran en secciones propias; el resto son los pasos de la fórmula de esa aseguradora. */
const CLAVES_FIJAS = new Set([
  'estrategia',
  'sumaAsegurada',
  'rango',
  'tasaBase',
  'parametros',
  'pesos',
  'ubigeoPorDefecto',
  'primaAnual',
  'totalEnCuotas',
]);

const esMonto = (clave: string) => /prima|cargo|suma|total|monto|descuento/i.test(clave) && !/tasa|peso/i.test(clave);

function mostrar(clave: string, valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'object') return JSON.stringify(valor);
  const texto = String(valor);
  return esMonto(clave) && /^\d+(\.\d+)?$/.test(texto) ? formatearMonto(texto) : texto;
}

/**
 * "Tasa base × pesos = tasa → prima" (RN-41). Solo para ASESOR/ADMINISTRADOR: el CLIENTE nunca
 * recibe `detalleCalculo`. Es una lectura de lo que calculó el backend; aquí no se calcula nada.
 */
export function DesgloseCalculo({ detalle }: { detalle: DetalleCalculoTarifa }) {
  const pesos = Object.entries(detalle.pesos ?? {});
  const parametros = Object.entries(detalle.parametros ?? {});
  const pasos = Object.entries(detalle).filter(([k]) => !CLAVES_FIJAS.has(k));

  return (
    <div className="rounded-lg border border-line bg-surface p-4 text-small">
      <p className="mb-3 font-bold text-navy-700">Cómo se calculó</p>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Fila etiqueta="Suma asegurada" valor={formatearMonto(detalle.sumaAsegurada)} />
        <Fila etiqueta="Rango permitido" valor={`${formatearMonto(detalle.rango.minima)} – ${formatearMonto(detalle.rango.maxima)}`} />
        <Fila etiqueta="Tasa base" valor={detalle.tasaBase} mono />
        {parametros.map(([k, v]) => (
          <Fila key={k} etiqueta={etiquetaParametro(k)} valor={mostrar(k, v)} mono />
        ))}
      </dl>

      {pesos.length > 0 ? (
        <>
          <p className="mb-1 mt-4 font-bold text-navy-700">Pesos aplicados</p>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {pesos.map(([k, v]) => (
              <Fila key={k} etiqueta={NOMBRE_PESO[k as TablaPeso] ?? etiquetaParametro(k)} valor={v} mono />
            ))}
          </dl>
          {detalle.ubigeoPorDefecto ? (
            <p className="mt-2 text-ink-soft">Este distrito no tiene peso cargado: se usó 1.000 (zona estándar).</p>
          ) : null}
        </>
      ) : null}

      {pasos.length > 0 ? (
        <>
          <p className="mb-1 mt-4 font-bold text-navy-700">Pasos de la fórmula</p>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {pasos.map(([k, v]) => (
              <Fila key={k} etiqueta={etiquetaParametro(k)} valor={mostrar(k, v)} mono />
            ))}
          </dl>
        </>
      ) : null}

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-3 sm:grid-cols-2">
        <Fila etiqueta="Prima anual al contado" valor={formatearMonto(detalle.primaAnual)} fuerte />
        <Fila etiqueta="Total en 12 cuotas" valor={formatearMonto(detalle.totalEnCuotas)} fuerte />
      </dl>
    </div>
  );
}

function Fila({ etiqueta, valor, mono, fuerte }: { etiqueta: string; valor: string; mono?: boolean; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{etiqueta}</dt>
      <dd className={`${mono ? 'font-mono' : 'font-money tabular'} ${fuerte ? 'font-bold text-navy-700' : 'text-ink'}`}>{valor}</dd>
    </div>
  );
}

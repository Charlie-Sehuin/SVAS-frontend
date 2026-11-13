import { useRef, useState } from 'react';
import { Ban, Car, KeyRound, ShieldAlert, Users, Wrench, type LucideIcon } from 'lucide-react';
import { useIsDesktop } from '../../../shared/hooks/useMediaQuery';
import { cn } from '../../../shared/lib/utils';
import type { EscenarioCatalogo, FilaMatriz, PosicionRanking, ResultadoEscenario } from '../../../shared/types/api';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { FONDO_NIVEL, nivelDesembolso, TEXTO_NIVEL } from '../lib/nivel';

const ICONO: Record<string, LucideIcon> = {
  CHOQUE_LEVE: Car,
  CHOQUE_FUERTE: Wrench,
  ROBO_AUTOPARTES: KeyRound,
  ROBO_TOTAL: KeyRound,
  DANO_TERCEROS: Users,
  PERDIDA_TOTAL: Ban,
};
const iconoDe = (codigo: string) => ICONO[codigo] ?? ShieldAlert;

interface Props {
  ranking: PosicionRanking[];
  matriz: FilaMatriz[];
  escenarios: EscenarioCatalogo[];
  /** Suma asegurada de cada prima: es el daño de robo total y pérdida total (doc dominio §16.2). */
  sumaPorPrima: ReadonlyMap<string, string>;
  esComercial: boolean;
}

/** Daño del escenario para clasificar el nivel: monto de referencia o, si no hay, la suma asegurada del plan. */
function referenciaDe(codigo: string, primaCotizadaId: string, props: Props): string | null {
  const ref = props.escenarios.find((e) => e.codigo === codigo)?.montoDanoReferencial;
  return ref ?? props.sumaPorPrima.get(primaCotizadaId) ?? null;
}

/**
 * Celda `<OutOfPocketCell>` (diseño §8.7): fondo de la escala `out-0…3`, "Pagas USD 150" y debajo el nivel en texto.
 * Sin información (RN-30) lleva el patrón rayado y la frase, nunca un supuesto favorable.
 */
function CeldaDesembolso({ r, referencia, comercial }: { r: ResultadoEscenario; referencia: string | null; comercial: boolean }) {
  const nivel = nivelDesembolso(r, referencia);
  const conIngreso = comercial && Number(r.ingresoPerdido) > 0;
  return (
    <div className={cn('h-full rounded-lg p-3', FONDO_NIVEL[nivel])}>
      {nivel === 'sin-dato' ? (
        <p className="text-small font-bold text-ink">Sin información de este plan</p>
      ) : (
        <>
          <p className="text-ink">
            <span className="text-small">Pagas </span>
            <MoneyValue value={r.desembolso} decimales={0} className="text-base" />
          </p>
          <p className="text-caption text-ink-soft">{TEXTO_NIVEL[nivel]}</p>
          {!r.cubre ? <p className="text-caption text-ink-soft">Este plan no lo cubre</p> : null}
          {conIngreso ? (
            <p className="text-caption text-ink-soft">
              Incluye <MoneyValue value={r.ingresoPerdido} decimales={0} /> de ingresos que dejas de ganar
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Escritorio: tabla escenario × plan. Móvil: un carrusel de tarjetas, un escenario por tarjeta (sin scroll horizontal de tabla). */
export function MatrizEscenarios(props: Props) {
  const escritorio = useIsDesktop();
  return escritorio ? <Tabla {...props} /> : <Carrusel {...props} />;
}

function nombreDe(props: Props, fila: FilaMatriz) {
  const e = props.escenarios.find((x) => x.codigo === fila.escenario.codigo);
  return { nombre: fila.escenario.nombre, descripcion: e?.descripcion ?? null, diasTaller: e?.diasTaller ?? 0 };
}

function Tabla(props: Props) {
  const { ranking, matriz, esComercial } = props;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Lo que pagarías tú en cada situación, por plan</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="p-3 text-small text-ink-soft">
              Situación
            </th>
            {ranking.map((p) => (
              <th key={p.primaCotizadaId} scope="col" className="p-3 align-bottom">
                <span className="block text-caption font-normal text-ink-soft">{p.aseguradora}</span>
                <span className="block font-bold text-navy-700">Plan {p.plan}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.map((fila) => {
            const Icono = iconoDe(fila.escenario.codigo);
            const info = nombreDe(props, fila);
            return (
              <tr key={fila.escenario.codigo} className="border-b border-line last:border-0">
                <th scope="row" className="w-56 p-3 align-top font-normal">
                  <span className="flex items-start gap-2">
                    <Icono className="mt-0.5 size-5 shrink-0 text-navy-700" aria-hidden />
                    <span>
                      <span className="block font-bold text-navy-700">{info.nombre}</span>
                      {info.descripcion ? <span className="block text-small text-ink-soft">{info.descripcion}</span> : null}
                      {esComercial && info.diasTaller > 0 ? (
                        <span className="block text-caption text-ink-soft">Tu auto estaría en taller unos {info.diasTaller} días</span>
                      ) : null}
                    </span>
                  </span>
                </th>
                {fila.resultados.map((r) => (
                  <td key={r.primaCotizadaId} className="p-2 align-top">
                    <CeldaDesembolso r={r} referencia={referenciaDe(fila.escenario.codigo, r.primaCotizadaId, props)} comercial={esComercial} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Carrusel(props: Props) {
  const { ranking, matriz, esComercial } = props;
  const [actual, setActual] = useState(0);
  const pista = useRef<HTMLUListElement>(null);

  return (
    <div>
      <ul
        ref={pista}
        aria-label="Situaciones posibles"
        onScroll={(e) => {
          const el = e.currentTarget;
          setActual(Math.round(el.scrollLeft / Math.max(1, el.clientWidth * 0.9)));
        }}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
      >
        {matriz.map((fila, i) => {
          const Icono = iconoDe(fila.escenario.codigo);
          const info = nombreDe(props, fila);
          return (
            <li key={fila.escenario.codigo} className="w-[90%] shrink-0 snap-center rounded-xl border border-line bg-surface p-4">
              <p className="text-caption text-ink-soft">
                Situación {i + 1} de {matriz.length}
              </p>
              <h3 className="mt-1 flex items-start gap-2 font-bold text-navy-700">
                <Icono className="mt-0.5 size-5 shrink-0" aria-hidden /> {info.nombre}
              </h3>
              {info.descripcion ? <p className="text-small text-ink-soft">{info.descripcion}</p> : null}
              {esComercial && info.diasTaller > 0 ? <p className="text-caption text-ink-soft">Tu auto estaría en taller unos {info.diasTaller} días</p> : null}
              <ul className="mt-3 space-y-2">
                {fila.resultados.map((r) => {
                  const plan = ranking.find((p) => p.primaCotizadaId === r.primaCotizadaId);
                  return (
                    <li key={r.primaCotizadaId}>
                      <p className="mb-1 text-small font-bold text-navy-700">
                        {plan?.aseguradora} · Plan {plan?.plan}
                      </p>
                      <CeldaDesembolso r={r} referencia={referenciaDe(fila.escenario.codigo, r.primaCotizadaId, props)} comercial={esComercial} />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {matriz.map((f, i) => (
          <span key={f.escenario.codigo} className={cn('size-2 rounded-full', i === actual ? 'bg-navy-700' : 'bg-navy-100')} />
        ))}
      </div>
    </div>
  );
}

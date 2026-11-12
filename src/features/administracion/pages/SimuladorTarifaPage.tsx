import { Fragment, useState } from 'react';
import { Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import { formatearMonto } from '../../../shared/lib/format';
import { aplicarErroresBackend, parseDecimal } from '../../../shared/lib/forms';
import type { SimularTarifaResponse, SimulacionAseguradora } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { DesgloseCalculo } from '../../../shared/ui/domain/DesgloseCalculo';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast } from '../../../shared/ui/domain/toasts';
import { isApiError } from '../../../shared/lib/api-client';
import { SelectorUbigeoCascada, UBIGEO_VACIO, type ValorUbigeo } from '../../cotizacion/components/SelectorUbigeoCascada';
import { SelectorVehiculoCascada, VEHICULO_VACIO, type ValorVehiculo } from '../../cotizacion/components/SelectorVehiculoCascada';
import { TarifasTabs } from '../tarifas/TarifasTabs';
import { useSimularTarifa } from '../hooks/useAdmin';

const MOTIVO: Record<string, string> = {
  SIN_RANGO: 'No cotiza este modelo y año (no tiene rango de suma).',
  PESO_FALTANTE: 'Falta un peso para este vehículo.',
  ERROR_ESTRATEGIA: 'La fórmula devolvió un error.',
};

/**
 * Simulador de tarifa (RN-41): elige vehículo, ubicación y suma, y muestra las primas de todas las
 * aseguradoras con su desglose. Usa las mismas fórmulas que el cotizador y no guarda nada. Sirve para
 * comprobar a mano que un peso o una fórmula quedó bien.
 */
export function SimuladorTarifaPage() {
  const [vehiculo, setVehiculo] = useState<ValorVehiculo>(VEHICULO_VACIO);
  const [ubicacion, setUbicacion] = useState<ValorUbigeo>(UBIGEO_VACIO);
  const [suma, setSuma] = useState('');
  const [errores, setErrores] = useState<Partial<Record<'modeloId' | 'anio' | 'ubigeo' | 'suma', string>>>({});
  const [resultado, setResultado] = useState<SimularTarifaResponse | null>(null);
  const simular = useSimularTarifa();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (!vehiculo.modeloId) nuevos.modeloId = 'Elige el modelo';
    if (!vehiculo.anio) nuevos.anio = 'Elige el año';
    if (!ubicacion.ubigeo) nuevos.ubigeo = 'Elige el distrito';
    const sumaN = suma.trim() === '' ? undefined : parseDecimal(suma);
    if (sumaN === null) nuevos.suma = 'Escribe un monto válido';
    else if (sumaN !== undefined && sumaN < 1) nuevos.suma = 'Debe ser mayor que 0';
    else if (sumaN !== undefined && (suma.trim().replace(',', '.').split('.')[1] ?? '').length > 2) nuevos.suma = 'Hasta 2 decimales';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    simular.mutate(
      {
        modeloId: vehiculo.modeloId,
        anio: Number(vehiculo.anio),
        ubigeo: ubicacion.ubigeo,
        ...(typeof sumaN === 'number' ? { sumaAsegurada: sumaN } : {}),
      },
      {
        onSuccess: setResultado,
        onError: (err) => {
          setResultado(null);
          // La suma fuera de rango de una aseguradora llega como 400 con su mensaje (RN-37).
          if (isApiError(err) && err.statusCode === 400 && !err.esValidacion) setErrores({ suma: err.message });
          else if (!aplicarErroresBackend(err, (campo, e2) => setErrores((p) => ({ ...p, [campo]: e2.message })), ['modeloId', 'anio', 'ubigeo'])) ErrorToast(err);
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        titulo="Simulador de tarifa"
        descripcion="Calcula las primas de todas las aseguradoras para un vehículo y una zona. Sin suma asegurada, cada una usa el punto medio de su rango."
      />
      <TarifasTabs />

      <Card className="mb-6">
        <CardContent className="pt-4 lg:pt-6">
          <form onSubmit={onSubmit} noValidate>
            <div className="grid gap-x-4 md:grid-cols-3">
              <SelectorVehiculoCascada
                compact
                value={vehiculo}
                onChange={(v) => {
                  setVehiculo(v);
                  setResultado(null);
                }}
                errores={{ modeloId: errores.modeloId, anio: errores.anio }}
              />
              <SelectorUbigeoCascada
                compact
                value={ubicacion}
                onChange={(u) => {
                  setUbicacion(u);
                  setResultado(null);
                }}
                errores={{ ubigeo: errores.ubigeo }}
              />
              <Field label="Suma asegurada (USD)" help="Opcional." error={errores.suma}>
                {(p) => <Input {...p} inputMode="decimal" value={suma} onChange={(e) => setSuma(e.target.value)} placeholder="Punto medio" className="h-10 font-mono" />}
              </Field>
            </div>
            <Button type="submit" loading={simular.isPending} loadingText="Calculando…">
              <Calculator aria-hidden /> Simular
            </Button>
          </form>
        </CardContent>
      </Card>

      {resultado ? (
        <section aria-live="polite" aria-label="Resultado de la simulación">
          <p className="mb-4 text-ink">
            <strong className="text-navy-700">
              {resultado.vehiculo.marca} {resultado.vehiculo.modelo} {resultado.vehiculo.anio}
            </strong>{' '}
            · {resultado.vehiculo.tipo} · ubigeo <span className="font-mono">{resultado.vehiculo.ubigeo}</span>
          </p>
          <div className="space-y-4">
            {resultado.aseguradoras.map((a) => (
              <BloqueAseguradora key={a.aseguradoraId} a={a} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function BloqueAseguradora({ a }: { a: SimulacionAseguradora }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-3">
        <CardTitle>{a.aseguradora}</CardTitle>
        {a.rangoSuma ? (
          <span className="text-small text-ink-soft">
            Rango permitido: {formatearMonto(a.rangoSuma.minima)} – {formatearMonto(a.rangoSuma.maxima)}
          </span>
        ) : (
          <Badge tone="warning">Sin rango para este modelo-año</Badge>
        )}
        {a.errorSuma ? <Badge tone="danger">{a.errorSuma}</Badge> : null}
      </CardHeader>
      <CardContent>
        <Table caption={`Primas de ${a.aseguradora}`}>
          <THead>
            <TR>
              <TH className="w-10">
                <span className="sr-only">Desglose</span>
              </TH>
              <TH>Plan</TH>
              <TH>Suma asegurada</TH>
              <TH>Prima anual</TH>
              <TH>Prima mensual</TH>
            </TR>
          </THead>
          <TBody>
            {a.planes.map((p) => {
              const expandido = abierto === p.planId;
              return (
                <Fragment key={p.planId}>
                  <TR>
                    <TD>
                      {p.disponible && p.detalleCalculo ? (
                        <button
                          type="button"
                          aria-expanded={expandido}
                          aria-label={`${expandido ? 'Ocultar' : 'Ver'} desglose del plan ${p.plan}`}
                          onClick={() => setAbierto(expandido ? null : p.planId)}
                          className="flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted"
                        >
                          {expandido ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                        </button>
                      ) : null}
                    </TD>
                    <TD className="font-bold text-ink">{p.plan}</TD>
                    {p.disponible && p.prima && p.primaMensual && p.sumaAsegurada ? (
                      <>
                        <TD>
                          <MoneyValue value={p.sumaAsegurada} />
                        </TD>
                        <TD>
                          <MoneyValue value={p.prima} />
                        </TD>
                        <TD>
                          <MoneyValue value={p.primaMensual} sufijo="/ mes" sufijoAria="al mes" />
                        </TD>
                      </>
                    ) : (
                      <TD colSpan={3} className="text-ink-soft">
                        {p.motivoNoDisponible ? (MOTIVO[p.motivoNoDisponible] ?? p.motivoNoDisponible) : 'No disponible.'}
                      </TD>
                    )}
                  </TR>
                  {expandido && p.detalleCalculo ? (
                    <tr>
                      <td colSpan={5} className="bg-surface-muted p-3">
                        <DesgloseCalculo detalle={p.detalleCalculo} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

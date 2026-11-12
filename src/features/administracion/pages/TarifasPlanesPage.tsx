import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save } from 'lucide-react';
import Decimal from 'decimal.js';
import { aplicarErroresBackend, parseDecimal } from '../../../shared/lib/forms';
import {
  parametrosDe,
  TASA_DECIMALES,
  TASA_MAX,
  TASA_MIN,
  type ParametroPlan,
} from '../../../shared/lib/tarifas.constants';
import type { AseguradoraAdmin, TarifaPlan } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { TarifasTabs } from '../tarifas/TarifasTabs';
import { useAseguradoras, useGuardarTarifaPlan, useTarifasPlanes } from '../hooks/useAdmin';

/**
 * Tasa base y parámetros propios de cada plan (doc de dominio §17, RN-40). Solo ADMINISTRADOR:
 * es secreto comercial. El formulario de parámetros se genera según la fórmula de la aseguradora.
 */
export function TarifasPlanesPage() {
  const aseguradoras = useAseguradoras();
  const [aseguradoraId, setAseguradoraId] = useState('');
  const tarifas = useTarifasPlanes(aseguradoraId || undefined);

  const porAseguradora = useMemo(() => {
    const m = new Map<string, TarifaPlan[]>();
    tarifas.data?.forEach((t) => m.set(t.aseguradoraId, [...(m.get(t.aseguradoraId) ?? []), t]));
    return m;
  }, [tarifas.data]);

  const visibles = aseguradoras.data?.filter((a) => !aseguradoraId || a.id === aseguradoraId) ?? [];

  return (
    <>
      <PageHeader
        titulo="Tarifas · Tasa base por plan"
        descripcion="La tasa base y los parámetros de cada plan alimentan la fórmula de su aseguradora. Un plan sin tarifa no cotiza."
      />
      <TarifasTabs />

      <FiltrosBar>
        <Filtro label="Aseguradora" className="min-w-64">
          <Select compact value={aseguradoraId} onChange={(e) => setAseguradoraId(e.target.value)}>
            <option value="">Todas</option>
            {aseguradoras.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </Filtro>
      </FiltrosBar>

      {aseguradoras.isError || tarifas.isError ? (
        <EstadoError
          error={aseguradoras.error ?? tarifas.error}
          onRetry={() => {
            void aseguradoras.refetch();
            void tarifas.refetch();
          }}
        />
      ) : aseguradoras.isLoading || tarifas.isLoading ? (
        <div className="space-y-4" aria-busy aria-label="Cargando tarifas">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : tarifas.data && tarifas.data.length === 0 ? (
        <EstadoVacio titulo="No hay planes para mostrar." />
      ) : (
        <div className="space-y-6">
          {visibles.map((a) => {
            const planes = porAseguradora.get(a.id) ?? [];
            if (planes.length === 0) return null;
            return (
              <section key={a.id} aria-labelledby={`aseg-${a.id}`}>
                <h2 id={`aseg-${a.id}`} className="mb-2 text-h3 text-navy-700">
                  {a.nombre}
                </h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {planes.map((t) => (
                    <TarifaPlanCard key={t.planId} tarifa={t} aseguradora={a} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ───────────── Un plan ───────────── */

type Valores = { tasaBase: string } & Record<string, string>;

const PREFIJO = 'p_';

function valorEnRango(texto: string, p: { min: number; max: number; minExclusivo?: boolean; maxExclusivo?: boolean }): string | null {
  const n = parseDecimal(texto);
  if (n === null) return 'Escribe un número';
  const bajo = p.minExclusivo ? n <= p.min : n < p.min;
  const alto = p.maxExclusivo ? n >= p.max : n > p.max;
  if (bajo || alto) {
    return `Debe ser ${p.minExclusivo ? 'mayor que' : 'desde'} ${p.min} y ${p.maxExclusivo ? 'menor que' : 'hasta'} ${p.max}`;
  }
  return null;
}

const decimalesDe = (texto: string) => (texto.trim().replace(',', '.').split('.')[1] ?? '').length;

function TarifaPlanCard({ tarifa, aseguradora }: { tarifa: TarifaPlan; aseguradora: AseguradoraAdmin }) {
  const parametros = parametrosDe(aseguradora.codigoEstrategia);
  const guardar = useGuardarTarifaPlan();

  const inicial = useMemo<Valores>(() => {
    const v: Valores = { tasaBase: tarifa.tasaBase ?? '' };
    for (const p of parametros) {
      const actual = tarifa.parametros?.[p.clave];
      v[PREFIJO + p.clave] = actual === undefined || actual === null ? '' : String(actual);
    }
    return v;
  }, [tarifa, parametros]);

  const form = useForm<Valores>({ defaultValues: inicial });
  const { errors, isDirty } = form.formState;
  useEffect(() => form.reset(inicial), [inicial, form]);

  const tasa = form.watch('tasaBase');
  const tasaComoPorcentaje = (() => {
    const n = parseDecimal(tasa ?? '');
    return n === null ? null : `${new Decimal(n).times(100).toDecimalPlaces(4).toString().replace('.', ',')} %`;
  })();

  const onSubmit = form.handleSubmit((v) => {
    form.clearErrors();
    let hayError = false;
    const marcar = (campo: string, mensaje: string) => {
      form.setError(campo, { type: 'validate', message: mensaje });
      hayError = true;
    };

    const tasaN = parseDecimal(v.tasaBase);
    if (tasaN === null) marcar('tasaBase', 'Escribe la tasa base');
    else if (tasaN < TASA_MIN || tasaN > TASA_MAX) marcar('tasaBase', `Debe estar entre ${TASA_MIN} y ${TASA_MAX} (0.0420 = 4,2 %)`);
    else if (decimalesDe(v.tasaBase) > TASA_DECIMALES) marcar('tasaBase', `Hasta ${TASA_DECIMALES} decimales`);

    const params: Record<string, number> = {};
    for (const p of parametros) {
      const campo = PREFIJO + p.clave;
      const texto = v[campo] ?? '';
      const error = valorEnRango(texto, p);
      if (error) marcar(campo, error);
      else params[p.clave] = parseDecimal(texto)!;
    }
    if (hayError || tasaN === null) return;

    guardar.mutate(
      { planId: tarifa.planId, body: { tasaBase: tasaN, parametros: params } },
      {
        onSuccess: () => SuccessToast(`Tarifa de ${aseguradora.nombre} · ${tarifa.plan} guardada`),
        onError: (e) => {
          const mapa: Record<string, string> = { tasaBase: 'tasaBase' };
          for (const p of parametros) mapa[`parametros.${p.clave}`] = PREFIJO + p.clave;
          if (!aplicarErroresBackend(e, form.setError, ['tasaBase', ...parametros.map((p) => PREFIJO + p.clave)], mapa)) ErrorToast(e);
        },
      },
    );
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-2">
        <CardTitle>Plan {tarifa.plan}</CardTitle>
        {tarifa.tasaBase === null ? (
          <Badge tone="warning">Sin tarifa: no cotiza</Badge>
        ) : (
          <Badge tone="success">Con tarifa</Badge>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <Field
            label="Tasa base"
            error={errors.tasaBase?.message}
            help={tasaComoPorcentaje ? `Fracción de la suma asegurada: ${tasaComoPorcentaje}.` : 'Fracción: 0.0420 = 4,2 %.'}
            required
          >
            {(p) => <Input {...p} inputMode="decimal" className="font-mono" {...form.register('tasaBase')} />}
          </Field>

          {parametros.map((p: ParametroPlan) => (
            <Field key={p.clave} label={p.etiqueta} help={p.ayuda} error={errors[PREFIJO + p.clave]?.message} required>
              {(f) => <Input {...f} inputMode="decimal" className="font-mono" {...form.register(PREFIJO + p.clave)} />}
            </Field>
          ))}

          {tarifa.actualizadoEn ? (
            <p className="mb-3 text-small text-ink-soft">
              Última actualización: {new Date(tarifa.actualizadoEn).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}
            </p>
          ) : null}

          <Button type="submit" size="sm" disabled={!isDirty} loading={guardar.isPending}>
            <Save aria-hidden /> Guardar tarifa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

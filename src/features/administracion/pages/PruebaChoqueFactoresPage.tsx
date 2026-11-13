import { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { parseDecimal } from '../../../shared/lib/forms';
import { cn } from '../../../shared/lib/utils';
import type { VariablePerfil } from '../../../shared/types/enums';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useEscenariosAdmin, useFactoresAdmin, useGuardarFactores } from '../hooks/usePruebaChoqueAdmin';
import { AvisoReferencial, PruebaChoqueTabs } from '../prueba-choque/PruebaChoqueTabs';
import { TEXTO_VARIABLE, VARIABLES } from '../prueba-choque/textos';

const MIN = 0.1;
const MAX = 3;

/** Multiplicador de 0,10 a 3,00 con hasta 2 decimales (el backend vuelve a validar). */
function errorDe(texto: string): string | null {
  const n = parseDecimal(texto);
  if (n === null) return 'Escribe un número';
  if (n < MIN || n > MAX) return 'Entre 0,10 y 3,00';
  if ((texto.trim().replace(',', '.').split('.')[1] ?? '').length > 2) return 'Hasta 2 decimales';
  return null;
}

const clave = (escenario: string, variable: VariablePerfil) => `${escenario}|${variable}`;

/**
 * `/app/admin/prueba-choque/factores` (RF-36, RN-31): cuánto cambia la probabilidad de un escenario según el perfil de la persona
 * (cochera, muchos kilómetros, uso nocturno). Por encima de 1 sube; por debajo de 1 baja; 1,00 no cambia nada.
 */
export function PruebaChoqueFactoresPage() {
  const escenariosQ = useEscenariosAdmin();
  const factoresQ = useFactoresAdmin();
  const guardar = useGuardarFactores();
  const [borrador, setBorrador] = useState<Map<string, string>>(new Map());

  const escenarios = escenariosQ.data ?? [];
  const valorGuardado = (escenario: string, variable: VariablePerfil) => factoresQ.data?.find((f) => f.escenario === escenario && f.variable === variable)?.multiplicador ?? '';
  const valorDe = (escenario: string, variable: VariablePerfil) => borrador.get(clave(escenario, variable)) ?? valorGuardado(escenario, variable);

  const cambiada = (escenario: string, variable: VariablePerfil) => {
    const b = borrador.get(clave(escenario, variable));
    if (b === undefined) return false;
    const original = valorGuardado(escenario, variable);
    const n = parseDecimal(b);
    // Una celda vacía y sin factor guardado no es un cambio; una vacía con factor guardado no se puede borrar desde aquí.
    if (b.trim() === '') return false;
    return original === '' || n === null || n !== Number(original);
  };

  const cambios = escenarios.flatMap((e) => VARIABLES.filter((v) => cambiada(e.codigo, v)).map((v) => ({ escenario: e.codigo, variable: v })));
  const conError = cambios.filter((c) => errorDe(valorDe(c.escenario, c.variable)) !== null).length;

  function onGuardar() {
    if (conError > 0 || cambios.length === 0) return;
    guardar.mutate(
      cambios.map((c) => ({ escenario: c.escenario, variable: c.variable, multiplicador: parseDecimal(valorDe(c.escenario, c.variable))! })),
      {
        onSuccess: (r) => {
          SuccessToast('Factores guardados', `${r.cambiadas} cambiados de ${r.recibidas} recibidos.`);
          setBorrador(new Map());
        },
        onError: (e) => ErrorToast(e),
      },
    );
  }

  return (
    <>
      <PageHeader
        titulo="Prueba de Choque · Factores de perfil"
        descripcion="Cuánto cambia la probabilidad de cada escenario según cómo usa su auto la persona. 1,00 no cambia nada; más de 1 la sube y menos de 1 la baja."
        accion={
          <>
            <Button variant="ghost" disabled={cambios.length === 0 || guardar.isPending} onClick={() => setBorrador(new Map())}>
              <RotateCcw aria-hidden /> Descartar
            </Button>
            <Button disabled={cambios.length === 0 || conError > 0} loading={guardar.isPending} onClick={onGuardar}>
              <Save aria-hidden /> Guardar{cambios.length > 0 ? ` (${cambios.length})` : ''}
            </Button>
          </>
        }
      />
      <PruebaChoqueTabs />
      <AvisoReferencial />

      {escenariosQ.isError || factoresQ.isError ? (
        <EstadoError error={escenariosQ.error ?? factoresQ.error} onRetry={() => void (escenariosQ.isError ? escenariosQ.refetch() : factoresQ.refetch())} />
      ) : escenariosQ.isLoading || factoresQ.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando los factores">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : escenarios.length === 0 ? (
        <EstadoVacio titulo="Primero crea los escenarios." />
      ) : (
        <Table caption="Factores de perfil por escenario">
          <THead>
            <tr>
              <TH>Escenario</TH>
              {VARIABLES.map((v) => (
                <TH key={v} className="w-44">
                  {TEXTO_VARIABLE[v]}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {escenarios.map((e) => (
              <TR key={e.codigo} className="h-16 align-top">
                <TD>
                  <span className="block font-bold text-navy-700">{e.nombre}</span>
                  {!e.activo ? <span className="text-caption text-ink-soft">(inactivo)</span> : null}
                </TD>
                {VARIABLES.map((v) => {
                  const texto = valorDe(e.codigo, v);
                  const mod = cambiada(e.codigo, v);
                  const error = mod ? errorDe(texto) : null;
                  const sinFactor = texto === '' && valorGuardado(e.codigo, v) === '';
                  return (
                    <TD key={v} className={cn(mod && 'bg-brand-50/40')}>
                      <Input
                        inputMode="decimal"
                        value={texto}
                        placeholder="—"
                        aria-label={`${TEXTO_VARIABLE[v]} en ${e.nombre}`}
                        invalid={!!error}
                        className="h-10 font-mono"
                        onChange={(ev) => setBorrador((prev) => new Map(prev).set(clave(e.codigo, v), ev.target.value))}
                      />
                      {error ? (
                        <p role="alert" className="mt-1 text-caption text-status-danger">
                          {error}
                        </p>
                      ) : sinFactor && !mod ? (
                        <Badge tone="neutral" className="mt-1">
                          Sin factor
                        </Badge>
                      ) : null}
                    </TD>
                  );
                })}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}

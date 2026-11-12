import { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import type { ReglaInspeccion } from '../../../shared/types/api';
import { TEXTO_USO, USOS_VEHICULO, type UsoVehiculo } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Switch } from '../../../shared/ui/switch';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { cn } from '../../../shared/lib/utils';
import { useAseguradoras, useGuardarReglasInspeccion, useReglasInspeccion } from '../hooks/useAdmin';

const clave = (aseguradoraId: string, uso: UsoVehiculo) => `${aseguradoraId}|${uso}`;

/**
 * Reglas de inspección (RN-03): qué usos exigen inspección en cada aseguradora.
 * Si una aseguradora la exige, el cliente ve la derivación a un asesor y se oculta "Comprar".
 */
export function ReglasInspeccionPage() {
  const aseguradoras = useAseguradoras();
  const reglas = useReglasInspeccion();
  const guardar = useGuardarReglasInspeccion();
  /** Cambios sin guardar: clave → nuevo valor. Solo se envía lo que cambió. */
  const [borrador, setBorrador] = useState<Map<string, boolean>>(new Map());

  const vigente = useMemo(() => {
    const m = new Map<string, boolean>();
    reglas.data?.forEach((r) => m.set(clave(r.aseguradoraId, r.uso), r.requiereInspeccion));
    return m;
  }, [reglas.data]);

  const valor = (aseguradoraId: string, uso: UsoVehiculo) => {
    const k = clave(aseguradoraId, uso);
    return borrador.get(k) ?? vigente.get(k) ?? false;
  };

  const cambiar = (aseguradoraId: string, uso: UsoVehiculo, nuevo: boolean) => {
    const k = clave(aseguradoraId, uso);
    setBorrador((prev) => {
      const sig = new Map(prev);
      if ((vigente.get(k) ?? false) === nuevo) sig.delete(k);
      else sig.set(k, nuevo);
      return sig;
    });
  };

  const onGuardar = () => {
    const lote: ReglaInspeccion[] = [...borrador.entries()].map(([k, requiereInspeccion]) => {
      const [aseguradoraId, uso] = k.split('|') as [string, UsoVehiculo];
      return { aseguradoraId, uso, requiereInspeccion };
    });
    guardar.mutate(lote, {
      onSuccess: () => {
        SuccessToast('Reglas de inspección guardadas');
        setBorrador(new Map());
      },
      onError: (e) => ErrorToast(e),
    });
  };

  const error = aseguradoras.error ?? reglas.error;
  const cargando = aseguradoras.isLoading || reglas.isLoading;

  return (
    <>
      <PageHeader
        titulo="Reglas de inspección"
        descripcion="Marca los usos que cada aseguradora obliga a inspeccionar. Esos casos pasan a un asesor y el cliente no puede comprar en línea."
        accion={
          <>
            <Button variant="ghost" disabled={borrador.size === 0 || guardar.isPending} onClick={() => setBorrador(new Map())}>
              <RotateCcw aria-hidden /> Descartar
            </Button>
            <Button disabled={borrador.size === 0} loading={guardar.isPending} onClick={onGuardar}>
              <Save aria-hidden /> Guardar{borrador.size > 0 ? ` (${borrador.size})` : ''}
            </Button>
          </>
        }
      />

      {error ? (
        <EstadoError
          error={error}
          onRetry={() => {
            void aseguradoras.refetch();
            void reglas.refetch();
          }}
        />
      ) : cargando ? (
        <div className="space-y-2" aria-busy aria-label="Cargando reglas">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <Table caption="Reglas de inspección por aseguradora y uso del vehículo">
          <THead>
            <TR>
              <TH>Aseguradora</TH>
              {USOS_VEHICULO.map((u) => (
                <TH key={u}>{TEXTO_USO[u]}</TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {aseguradoras.data?.map((a) => (
              <TR key={a.id} className="h-14">
                <TD className="font-bold text-ink">
                  {a.nombre}
                  {a.activa ? null : <span className="ml-2 font-normal text-ink-soft">(inactiva)</span>}
                </TD>
                {USOS_VEHICULO.map((u) => {
                  const v = valor(a.id, u);
                  const cambiado = borrador.has(clave(a.id, u));
                  return (
                    <TD key={u}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={v}
                          aria-label={`${a.nombre}: ${TEXTO_USO[u]} ${v ? 'pide inspección' : 'no pide inspección'}`}
                          onCheckedChange={(n) => cambiar(a.id, u, n)}
                        />
                        <span className={cn('text-small', v ? 'font-bold text-status-info' : 'text-ink-soft')}>
                          {v ? 'Pide inspección' : 'No pide'}
                        </span>
                        {cambiado ? <span className="text-caption text-brand-600">Sin guardar</span> : null}
                      </div>
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import type { UsoVehiculo, ZonaRiesgo } from '../../../shared/types/enums';
import * as admin from '../api/pruebaChoque.admin.api';

/** Todo lo del catálogo cuelga de `['admin', 'prueba-choque', …]`: un guardado refresca lo que lo muestra. */
const RAIZ = ['admin', 'prueba-choque'] as const;

function useInvalidar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: RAIZ });
}

export const useEscenariosAdmin = () =>
  useQuery({ queryKey: qk.admin.pruebaChoque('escenarios'), queryFn: admin.listarEscenariosAdmin });

export function useGuardarEscenario() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (v: { codigo: string; body: Parameters<typeof admin.guardarEscenario>[1] }) => admin.guardarEscenario(v.codigo, v.body),
    onSuccess: invalidar,
  });
}

export const useCoberturasAdmin = (planId: string | null) =>
  useQuery({
    queryKey: qk.admin.pruebaChoque('coberturas', planId ?? ''),
    queryFn: () => admin.listarCoberturasAdmin({ planId: planId! }),
    enabled: !!planId,
  });

export function useGuardarCoberturas() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: admin.guardarCoberturas, onSuccess: invalidar });
}

export const useFrecuenciasAdmin = (escenario: string | null, uso?: UsoVehiculo) =>
  useQuery({
    queryKey: [...qk.admin.pruebaChoque('frecuencias', escenario ?? ''), uso ?? ''] as const,
    queryFn: () => admin.listarFrecuenciasAdmin({ escenario: escenario!, uso }),
    enabled: !!escenario,
  });

export function useGuardarFrecuencias() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: admin.guardarFrecuencias, onSuccess: invalidar });
}

export const useZonasAdmin = (zona?: ZonaRiesgo) =>
  useQuery({ queryKey: qk.admin.pruebaChoque('zonas', zona ?? ''), queryFn: () => admin.listarZonasAdmin(zona) });

export function useGuardarZonas() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: admin.guardarZonas, onSuccess: invalidar });
}

export const useFactoresAdmin = () =>
  useQuery({ queryKey: qk.admin.pruebaChoque('factores'), queryFn: () => admin.listarFactoresAdmin() });

export function useGuardarFactores() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: admin.guardarFactores, onSuccess: invalidar });
}

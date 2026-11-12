import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import { STALE } from '../../../shared/lib/query-client';
import type {
  ActualizarParametrosRequest,
  FiltroBitacora,
  FiltroUsuarios,
  ReglaInspeccion,
  TablaPeso,
} from '../../../shared/types/api';
import * as admin from '../api/admin.api';

/* ───────── Usuarios ───────── */
export const useUsuarios = (f: FiltroUsuarios) =>
  useQuery({
    queryKey: [...qk.admin.usuarios, f] as const,
    queryFn: () => admin.listarUsuarios(f),
    placeholderData: keepPreviousData,
  });

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: admin.crearUsuario,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.usuarios }),
  });
}
export function useCambiarRolUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; rol: Parameters<typeof admin.cambiarRolUsuario>[1] }) => admin.cambiarRolUsuario(v.id, v.rol),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.usuarios }),
  });
}
export function useCambiarEstadoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; activo: boolean }) => admin.cambiarEstadoUsuario(v.id, v.activo),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.usuarios }),
  });
}

/* ───────── Aseguradoras y planes ───────── */
export const useAseguradoras = () =>
  useQuery({ queryKey: qk.admin.aseguradoras, queryFn: admin.listarAseguradoras, staleTime: STALE.colas });

export function useCambiarEstadoAseguradora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; activa: boolean }) => admin.cambiarEstadoAseguradora(v.id, v.activa),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.aseguradoras });
      void qc.invalidateQueries({ queryKey: qk.admin.panel });
    },
  });
}

export const usePlanes = (aseguradoraId?: string) =>
  useQuery({ queryKey: [...qk.admin.planes, aseguradoraId ?? 'todas'] as const, queryFn: () => admin.listarPlanes(aseguradoraId) });

export function useCrearPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: admin.crearPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.planes }),
  });
}
export function useEditarPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; body: Parameters<typeof admin.editarPlan>[1] }) => admin.editarPlan(v.id, v.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.planes });
      void qc.invalidateQueries({ queryKey: qk.admin.panel });
    },
  });
}

/* ───────── Campos requeridos ───────── */
export const useCamposAdmin = (aseguradoraId?: string) =>
  useQuery({ queryKey: [...qk.admin.campos, aseguradoraId ?? 'todas'] as const, queryFn: () => admin.listarCampos(aseguradoraId) });

/** El catálogo público de campos se guarda 10 min: tras editar un campo hay que refrescarlo. */
function useInvalidarCampos() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.admin.campos });
    void qc.invalidateQueries({ queryKey: qk.catalogo.campos });
  };
}
export function useCrearCampo() {
  const invalidar = useInvalidarCampos();
  return useMutation({ mutationFn: admin.crearCampo, onSuccess: invalidar });
}
export function useEditarCampo() {
  const invalidar = useInvalidarCampos();
  return useMutation({
    mutationFn: (v: { id: string; body: Parameters<typeof admin.editarCampo>[1] }) => admin.editarCampo(v.id, v.body),
    onSuccess: invalidar,
  });
}
export function useDesactivarCampo() {
  const invalidar = useInvalidarCampos();
  return useMutation({ mutationFn: admin.desactivarCampo, onSuccess: invalidar });
}

/* ───────── Reglas de inspección y parámetros ───────── */
export const useReglasInspeccion = () =>
  useQuery({ queryKey: qk.admin.reglasInspeccion, queryFn: admin.listarReglasInspeccion });

export function useGuardarReglasInspeccion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reglas: ReglaInspeccion[]) => admin.guardarReglasInspeccion(reglas),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.admin.reglasInspeccion }),
  });
}

export const useParametros = () => useQuery({ queryKey: qk.admin.parametros, queryFn: admin.obtenerParametros });

export function useActualizarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ActualizarParametrosRequest) => admin.actualizarParametros(b),
    onSuccess: (data) => qc.setQueryData(qk.admin.parametros, data),
  });
}

/* ───────── Bitácora ───────── */
export const useBitacora = (f: FiltroBitacora) =>
  useQuery({
    queryKey: qk.admin.bitacora({ ...f, pagina: String(f.pagina), tamano: String(f.tamano) }),
    queryFn: () => admin.listarBitacora(f),
    placeholderData: keepPreviousData,
  });

/* ───────── Tarifas ───────── */
export const useTarifasPlanes = (aseguradoraId?: string) =>
  useQuery({ queryKey: qk.admin.tarifas.planes(aseguradoraId), queryFn: () => admin.listarTarifasPlanes(aseguradoraId) });

export function useGuardarTarifaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { planId: string; body: Parameters<typeof admin.guardarTarifaPlan>[1] }) => admin.guardarTarifaPlan(v.planId, v.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'tarifas'] });
    },
  });
}

export const usePesos = (tabla: TablaPeso, aseguradoraId: string | null) =>
  useQuery({
    queryKey: qk.admin.tarifas.pesos(tabla, aseguradoraId ?? ''),
    queryFn: () => admin.listarPesos(tabla, aseguradoraId!),
    enabled: !!aseguradoraId,
  });

export function useGuardarPesos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { tabla: TablaPeso; aseguradoraId: string; filas: Parameters<typeof admin.guardarPesos>[2] }) =>
      admin.guardarPesos(v.tabla, v.aseguradoraId, v.filas),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.admin.tarifas.pesos(v.tabla, v.aseguradoraId) });
      void qc.invalidateQueries({ queryKey: ['admin', 'tarifas', 'completitud'] });
    },
  });
}

export const useRangos = (f: { aseguradoraId: string | null; marcaId: string | null; modeloId: string | null }) =>
  useQuery({
    queryKey: qk.admin.tarifas.rangos({ a: f.aseguradoraId ?? '', m: f.marcaId ?? '', mo: f.modeloId ?? '' }),
    queryFn: () =>
      admin.listarRangos({
        aseguradoraId: f.aseguradoraId!,
        ...(f.marcaId ? { marcaId: f.marcaId } : {}),
        ...(f.modeloId ? { modeloId: f.modeloId } : {}),
      }),
    enabled: !!f.aseguradoraId && !!f.marcaId,
  });

export function useGuardarRangos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { aseguradoraId: string; filas: Parameters<typeof admin.guardarRangos>[1] }) =>
      admin.guardarRangos(v.aseguradoraId, v.filas),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'tarifas'] });
    },
  });
}

export const useCompletitudTarifas = (aseguradoraId?: string) =>
  useQuery({ queryKey: qk.admin.tarifas.completitud(aseguradoraId), queryFn: () => admin.obtenerCompletitud(aseguradoraId) });

export const useSimularTarifa = () => useMutation({ mutationFn: admin.simularTarifa });

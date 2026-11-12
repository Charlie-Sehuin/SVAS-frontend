import { api } from '../../../shared/lib/api-client';
import { qs } from '../../../shared/lib/forms';
import type {
  ActualizarParametrosRequest,
  AseguradoraAdmin,
  CampoAdmin,
  CompletitudTarifas,
  CrearCampoRequest,
  CrearPlanRequest,
  CrearUsuarioResponse,
  EditarPlanRequest,
  FilaPeso,
  FilaRango,
  FiltroBitacora,
  FiltroUsuarios,
  GuardarCampoRequest,
  GuardarTarifaPlanRequest,
  PaginaBitacora,
  PaginaUsuarios,
  PanelAdmin,
  ParametrosComerciales,
  PesoVista,
  PlanAdmin,
  RangoVista,
  ReglaInspeccion,
  ResumenCarga,
  SimularTarifaRequest,
  SimularTarifaResponse,
  TablaPeso,
  TarifaPlan,
} from '../../../shared/types/api';
import type { RolInterno } from '../../../shared/types/enums';
import type { Usuario } from '../../../shared/types/api/seguridad.types';

/** Funciones puras sobre `api-client` (arquitectura §6.7). Ningún componente llama fetch directo. */

/* ───────── Usuarios ───────── */
export const listarUsuarios = (f: FiltroUsuarios) =>
  api.get('admin/usuarios', { searchParams: qs({ ...f }) }).json<PaginaUsuarios>();

export const crearUsuario = (body: { email: string; nombreCompleto: string; rol: RolInterno }) =>
  api.post('admin/usuarios', { json: body }).json<CrearUsuarioResponse>();

export const cambiarRolUsuario = (id: string, rol: RolInterno) =>
  api.patch(`admin/usuarios/${id}/rol`, { json: { rol } }).json<Usuario>();

export const cambiarEstadoUsuario = (id: string, activo: boolean) =>
  api.patch(`admin/usuarios/${id}/estado`, { json: { activo } }).json<Usuario>();

/* ───────── Catálogo ───────── */
export const obtenerPanel = () => api.get('admin/panel').json<PanelAdmin>();

export const listarAseguradoras = () => api.get('admin/aseguradoras').json<AseguradoraAdmin[]>();
export const cambiarEstadoAseguradora = (id: string, activa: boolean) =>
  api.patch(`admin/aseguradoras/${id}`, { json: { activa } }).json<AseguradoraAdmin>();

export const listarPlanes = (aseguradoraId?: string) =>
  api.get('admin/planes', { searchParams: qs({ aseguradoraId }) }).json<PlanAdmin[]>();
export const crearPlan = (body: CrearPlanRequest) => api.post('admin/planes', { json: body }).json<PlanAdmin>();
export const editarPlan = (id: string, body: EditarPlanRequest) =>
  api.patch(`admin/planes/${id}`, { json: body }).json<PlanAdmin>();

export const listarCampos = (aseguradoraId?: string) =>
  api.get('admin/campos', { searchParams: qs({ aseguradoraId }) }).json<CampoAdmin[]>();
export const crearCampo = (body: CrearCampoRequest) => api.post('admin/campos', { json: body }).json<CampoAdmin>();
export const editarCampo = (id: string, body: GuardarCampoRequest) =>
  api.put(`admin/campos/${id}`, { json: body }).json<CampoAdmin>();
export const desactivarCampo = (id: string) => api.delete(`admin/campos/${id}`).json<CampoAdmin>();

export const listarReglasInspeccion = () => api.get('admin/reglas-inspeccion').json<ReglaInspeccion[]>();
export const guardarReglasInspeccion = (reglas: ReglaInspeccion[]) =>
  api.put('admin/reglas-inspeccion', { json: { reglas } }).json<unknown>();

export const obtenerParametros = () => api.get('admin/parametros').json<ParametrosComerciales>();
export const actualizarParametros = (body: ActualizarParametrosRequest) =>
  api.put('admin/parametros', { json: body }).json<ParametrosComerciales>();

export const listarBitacora = (f: FiltroBitacora) =>
  api.get('admin/bitacora', { searchParams: qs({ ...f }) }).json<PaginaBitacora>();

/* ───────── Tarifas ───────── */
export const listarTarifasPlanes = (aseguradoraId?: string) =>
  api.get('admin/tarifas/planes', { searchParams: qs({ aseguradoraId }) }).json<TarifaPlan[]>();
export const guardarTarifaPlan = (planId: string, body: GuardarTarifaPlanRequest) =>
  api.put(`admin/tarifas/planes/${planId}`, { json: body }).json<unknown>();

export const listarPesos = (tabla: TablaPeso, aseguradoraId: string) =>
  api.get(`admin/tarifas/pesos/${tabla}`, { searchParams: qs({ aseguradoraId }) }).json<PesoVista[]>();
export const guardarPesos = (tabla: TablaPeso, aseguradoraId: string, filas: FilaPeso[]) =>
  api.put(`admin/tarifas/pesos/${tabla}`, { json: { aseguradoraId, filas } }).json<ResumenCarga>();

export const listarRangos = (f: { aseguradoraId: string; marcaId?: string; modeloId?: string }) =>
  api.get('admin/tarifas/rangos-suma', { searchParams: qs(f) }).json<RangoVista[]>();
export const guardarRangos = (aseguradoraId: string, filas: FilaRango[]) =>
  api.put('admin/tarifas/rangos-suma', { json: { aseguradoraId, filas } }).json<ResumenCarga>();

export const obtenerCompletitud = (aseguradoraId?: string) =>
  api.get('admin/tarifas/completitud', { searchParams: qs({ aseguradoraId }) }).json<CompletitudTarifas>();

export const simularTarifa = (body: SimularTarifaRequest) =>
  api.post('admin/tarifas/simular', { json: body }).json<SimularTarifaResponse>();

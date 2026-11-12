import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpenText,
  Calculator,
  ClipboardList,
  FileSearch,
  Gauge,
  Headset,
  LayoutDashboard,
  ListChecks,
  Map,
  PhoneForwarded,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sliders,
  Tags,
  Users,
} from 'lucide-react';
import type { Rol } from '../shared/types/enums';

/**
 * Menú del backoffice por rol (arquitectura §7.1). Un grupo sin ítems
 * visibles para el rol no se renderiza (oculto, no deshabilitado).
 */
export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: readonly Rol[];
  /** Texto corto cuando el ítem es de solo lectura para el rol (ADMIN en Atención). */
  readOnlyFor?: readonly Rol[];
  /** Ola del instructivo en que se construye (para la pantalla "pendiente"). */
  ola: 0 | 1 | 2 | 3 | 4;
}

export interface NavGroup {
  id: string;
  label: string | null;
  icon?: LucideIcon;
  items: NavItem[];
}

export const NAVEGACION: NavGroup[] = [
  {
    id: 'inicio',
    label: null,
    items: [{ label: 'Dashboard', to: '/app', icon: LayoutDashboard, roles: ['ASESOR', 'ADMINISTRADOR'], ola: 4 }],
  },
  {
    id: 'atencion',
    label: 'Atención',
    icon: Headset,
    items: [
      { label: 'Cola de asesoría', to: '/app/asesorias', icon: Headset, roles: ['ASESOR', 'ADMINISTRADOR'], readOnlyFor: ['ADMINISTRADOR'], ola: 2 },
      { label: 'Seguimiento / retención', to: '/app/seguimientos', icon: PhoneForwarded, roles: ['ASESOR', 'ADMINISTRADOR'], readOnlyFor: ['ADMINISTRADOR'], ola: 2 },
    ],
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    icon: ClipboardList,
    items: [
      { label: 'Aseguradoras y planes', to: '/app/admin/aseguradoras', icon: Tags, roles: ['ADMINISTRADOR'], ola: 0 },
      { label: 'Campos requeridos', to: '/app/admin/campos', icon: ListChecks, roles: ['ADMINISTRADOR'], ola: 0 },
      { label: 'Reglas de inspección', to: '/app/admin/reglas-inspeccion', icon: FileSearch, roles: ['ADMINISTRADOR'], ola: 0 },
      { label: 'Parámetros comerciales', to: '/app/admin/parametros', icon: Settings2, roles: ['ADMINISTRADOR'], ola: 0 },
      { label: 'Contenido de planes', to: '/app/admin/contenido/completitud', icon: BookOpenText, roles: ['ADMINISTRADOR'], ola: 2 },
      { label: 'Coberturas (catálogo)', to: '/app/admin/coberturas', icon: ScrollText, roles: ['ADMINISTRADOR'], ola: 2 },
      { label: 'Tarifas por aseguradora', to: '/app/admin/tarifas/planes', icon: Sliders, roles: ['ADMINISTRADOR'], ola: 0 },
      { label: 'Simulador de tarifa', to: '/app/admin/tarifas/simulador', icon: Calculator, roles: ['ADMINISTRADOR'], ola: 0 },
    ],
  },
  {
    id: 'prueba-choque',
    label: 'Prueba de Choque',
    icon: ShieldAlert,
    items: [
      { label: 'Escenarios', to: '/app/admin/prueba-choque/escenarios', icon: ShieldAlert, roles: ['ADMINISTRADOR'], ola: 2 },
      { label: 'Deducibles y topes por plan', to: '/app/admin/prueba-choque/coberturas', icon: Gauge, roles: ['ADMINISTRADOR'], ola: 2 },
      { label: 'Frecuencias y zonas', to: '/app/admin/prueba-choque/frecuencias', icon: Map, roles: ['ADMINISTRADOR'], ola: 2 },
      { label: 'Factores de perfil', to: '/app/admin/prueba-choque/factores', icon: Sliders, roles: ['ADMINISTRADOR'], ola: 2 },
    ],
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: BarChart3,
    items: [
      { label: 'Ventas', to: '/app/reportes/ventas', icon: BarChart3, roles: ['ADMINISTRADOR'], ola: 4 },
      { label: 'Retención', to: '/app/reportes/retencion', icon: PhoneForwarded, roles: ['ADMINISTRADOR'], ola: 4 },
      { label: 'Descuentos', to: '/app/reportes/descuentos', icon: Tags, roles: ['ADMINISTRADOR'], ola: 4 },
      { label: 'Impacto de la Prueba de Choque', to: '/app/reportes/prueba-choque', icon: ShieldAlert, roles: ['ADMINISTRADOR'], ola: 4 },
      { label: 'Mi desempeño', to: '/app/reportes/mi-desempeno', icon: BarChart3, roles: ['ASESOR'], ola: 4 },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: Settings2,
    items: [
      { label: 'Usuarios y roles', to: '/app/admin/usuarios', icon: Users, roles: ['ADMINISTRADOR'], ola: 0 },
      { label: 'Bitácora', to: '/app/admin/bitacora', icon: ScrollText, roles: ['ADMINISTRADOR'], ola: 0 },
    ],
  },
];

/** Grupos e ítems visibles para los roles dados; los grupos vacíos desaparecen. */
export function navegacionPara(roles: readonly Rol[]): NavGroup[] {
  return NAVEGACION.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.some((r) => roles.includes(r))),
  })).filter((g) => g.items.length > 0);
}

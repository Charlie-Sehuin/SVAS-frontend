import type { Rol } from '../types/enums';

/**
 * RBAC de interfaz como reflejo, no como barrera (arquitectura §1): aquí solo
 * se decide qué se muestra. La seguridad real vive en el backend.
 * Matriz: doc de dominio §14 / doc conexión §4.
 */
export type Pantalla =
  | 'landing'
  | 'cotizar'
  | 'comparativo'
  | 'detallePlan'
  | 'compararPlanes'
  | 'pruebaChoque'
  | 'compra'
  | 'confirmacion'
  | 'miCuenta'
  | 'retoma'
  | 'dashboard'
  | 'colaAsesoria'
  | 'seguimientos'
  | 'catalogo'
  | 'tarifas'
  | 'simuladorTarifa'
  | 'contenidoPlanes'
  | 'reglasPruebaChoque'
  | 'reportes'
  | 'usuarios'
  | 'bitacora';

type Acceso = 'si' | 'lectura' | 'no';

const MATRIZ: Record<Pantalla, Record<Rol | 'ANONIMO', Acceso>> = {
  landing: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'si' },
  cotizar: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'si' },
  comparativo: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'si' },
  detallePlan: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'lectura', ADMINISTRADOR: 'si' },
  compararPlanes: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'si' },
  pruebaChoque: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'lectura', ADMINISTRADOR: 'si' },
  compra: { ANONIMO: 'no', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'no' },
  confirmacion: { ANONIMO: 'no', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'no' },
  miCuenta: { ANONIMO: 'no', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'no' },
  retoma: { ANONIMO: 'si', CLIENTE: 'si', ASESOR: 'no', ADMINISTRADOR: 'no' },
  dashboard: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'si', ADMINISTRADOR: 'si' },
  colaAsesoria: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'si', ADMINISTRADOR: 'lectura' },
  seguimientos: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'si', ADMINISTRADOR: 'lectura' },
  catalogo: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'si' },
  tarifas: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'si' },
  simuladorTarifa: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'si' },
  contenidoPlanes: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'si' },
  reglasPruebaChoque: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'si' },
  reportes: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'si', ADMINISTRADOR: 'si' },
  usuarios: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'si' },
  bitacora: { ANONIMO: 'no', CLIENTE: 'no', ASESOR: 'no', ADMINISTRADOR: 'lectura' },
};

export function hasRole(roles: readonly Rol[], ...permitidos: readonly Rol[]): boolean {
  return roles.some((r) => permitidos.includes(r));
}

export function accesoPantalla(pantalla: Pantalla, roles: readonly Rol[]): Acceso {
  if (roles.length === 0) return MATRIZ[pantalla].ANONIMO;
  const accesos = roles.map((r) => MATRIZ[pantalla][r]);
  if (accesos.includes('si')) return 'si';
  if (accesos.includes('lectura')) return 'lectura';
  return 'no';
}

export function canAccessScreen(pantalla: Pantalla, roles: readonly Rol[]): boolean {
  return accesoPantalla(pantalla, roles) !== 'no';
}

/** Solo lectura: el ADMINISTRADOR ve la cola y los seguimientos sin actuar. */
export function isReadOnly(pantalla: Pantalla, roles: readonly Rol[]): boolean {
  return accesoPantalla(pantalla, roles) === 'lectura';
}

/** A dónde va cada rol después de iniciar sesión. */
export function rutaInicial(roles: readonly Rol[]): string {
  if (hasRole(roles, 'ASESOR', 'ADMINISTRADOR')) return '/app';
  if (hasRole(roles, 'CLIENTE')) return '/mi-cuenta';
  return '/';
}

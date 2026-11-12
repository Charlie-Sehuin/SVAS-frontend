import type { Rol, RolInterno } from '../enums';
import type { FechaIso, Uuid } from './comunes.types';

/** `GET /usuarios/me`, `POST /auth/registro`, `/admin/usuarios` */
export interface Usuario {
  id: Uuid;
  email: string;
  rol: Rol;
  nombreCompleto: string;
  activo: boolean;
  creadoEn?: FechaIso;
}

export interface RegistroMinimoRequest {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  telefono: string;
  cotizacionId?: Uuid;
}

export interface CrearUsuarioInternoRequest {
  email: string;
  nombreCompleto: string;
  rol: RolInterno;
}

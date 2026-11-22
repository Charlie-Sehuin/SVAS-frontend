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

/** `GET /usuarios/me/contacto`: la ficha de contacto de la cuenta, o `contacto: null` si no tiene (asesor, admin, cliente nuevo). */
export interface MiContactoResponse {
  contacto: {
    nombres: string;
    apellidos: string;
    telefono: string;
    email: string | null;
    canal: 'LLAMADA' | 'WHATSAPP';
  } | null;
}

/** `PATCH /usuarios/me/contacto`: al menos uno de los dos. El correo, los nombres y el documento no se pueden cambiar por aquí. */
export interface ActualizarContactoRequest {
  telefono?: string;
  canal?: 'LLAMADA' | 'WHATSAPP';
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

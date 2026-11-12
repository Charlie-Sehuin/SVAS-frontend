import { z } from 'zod';
import type { CampoCatalogo, CatalogoCampos, CrearCotizacionRequest } from '../../../shared/types/api';
import { USOS_VEHICULO, type CanalContacto, type UsoVehiculo } from '../../../shared/types/enums';
import type { BorradorCotizar } from '../store/useCotizarWizardStore';

/**
 * Esquema del formulario de cotizar, armado en tiempo de ejecución desde `GET /catalogo/campos` (RF-02, RF-03,
 * arquitectura §9.4). El catálogo decide qué es obligatorio y qué opciones tiene cada lista; el backend vuelve a
 * validar y sus errores por campo se asignan con `setError`.
 *
 * LÍMITE REAL: el cuerpo de `POST /cotizaciones` es fijo y el backend rechaza propiedades que no declara. Por eso
 * solo los campos estáticos que el backend sabe ubicar (`RUTA_CAMPO` en `cotizacion.ts`) pueden dibujarse y enviarse:
 * hoy `placa` y `clase`. Un campo nuevo creado en el administrador no aparece aquí hasta que el backend lo admita.
 */
export const CAMPOS_DINAMICOS_SOPORTADOS = ['placa', 'clase'] as const;
export type CampoDinamico = (typeof CAMPOS_DINAMICOS_SOPORTADOS)[number];

export const esCampoSoportado = (nombre: string): nombre is CampoDinamico =>
  (CAMPOS_DINAMICOS_SOPORTADOS as readonly string[]).includes(nombre);

/** Campos estáticos del catálogo que el formulario dibuja (marca, modelo, año y ubigeo van con sus selectores). */
export function camposDinamicos(catalogo: CatalogoCampos | undefined): CampoCatalogo[] {
  return (catalogo?.campos ?? []).filter((c) => c.origenValores === 'ESTATICO' && esCampoSoportado(c.nombre));
}

const ETIQUETA: Record<string, string> = {
  marca: 'la marca',
  modelo: 'el modelo',
  anio: 'el año',
  ubigeo: 'el distrito',
  placa: 'la placa',
  clase: 'la clase',
};

/** Misma regla que el backend (`VehiculoCotizarDto.placa`). */
export const FORMATO_PLACA = /^[A-Z0-9]{3}-?[0-9]{3}$/;
const FORMATO_CELULAR = /^9\d{8}$/;

/**
 * "Pacífico necesita el distrito para cotizarte" cuando solo algunas aseguradoras piden el campo (RF-03);
 * si lo piden todas, un "Elige el distrito" simple.
 */
export function mensajeObligatorio(nombre: string, catalogo: CatalogoCampos | undefined): string {
  const etiqueta = ETIQUETA[nombre] ?? nombre;
  const campo = catalogo?.campos.find((c) => c.nombre === nombre);
  const total = catalogo?.aseguradoras.length ?? 0;
  if (campo && campo.aseguradoras.length > 0 && campo.aseguradoras.length < total) {
    const quienes = campo.aseguradoras.join(', ');
    return `${quienes} ${campo.aseguradoras.length === 1 ? 'necesita' : 'necesitan'} ${etiqueta} para cotizarte`;
  }
  return `Elige ${etiqueta}`;
}

/** Un campo dinámico del catálogo → su validación (arquitectura §9.4). */
export function campoToZod(c: CampoCatalogo): z.ZodType<string, string> {
  const etiqueta = ETIQUETA[c.nombre] ?? c.nombre;
  const vacio = `Completa ${etiqueta}`;
  let valido: z.ZodType<string, string>;
  if (c.tipo === 'LISTA' && c.valoresPermitidos.length > 0) {
    valido = z.string().refine((v) => c.valoresPermitidos.includes(v), `Elige ${etiqueta}`);
  } else if (c.nombre === 'placa') {
    valido = z
      .string()
      .trim()
      .toUpperCase()
      .regex(FORMATO_PLACA, 'Ingresa la placa con el formato ABC-123');
  } else {
    valido = z.string().trim().min(1, vacio);
  }
  return c.obligatorio ? z.string().trim().min(1, vacio).pipe(valido) : z.union([z.literal(''), valido]);
}

const esUso = (v: string): v is UsoVehiculo => (USOS_VEHICULO as readonly string[]).includes(v);
const esCanal = (v: string): v is CanalContacto => v === 'LLAMADA' || v === 'WHATSAPP';

/** Campos de cada paso: sirven para validar solo lo que se ve (`trigger`) y para saber a qué paso volver. */
export const CAMPOS_POR_PASO = {
  1: ['vehiculo.marcaId', 'vehiculo.modeloId', 'vehiculo.anio', 'uso', 'placa', 'clase'],
  2: ['ubicacion.departamento', 'ubicacion.provincia', 'ubicacion.ubigeo'],
  3: ['contacto.nombres', 'contacto.apellidos', 'contacto.telefono', 'contacto.email', 'contacto.canal', 'contacto.acepta'],
} as const;

export function buildCotizarSchema(catalogo: CatalogoCampos | undefined) {
  const dinamicos = camposDinamicos(catalogo);
  /**
   * Cada campo dinámico se valida como un campo normal (no con superRefine: en Zod un refinamiento del objeto no corre
   * si otro campo ya falló, y la placa solo se revisaría al final). "No tengo placa" vacía el campo y oculta el interruptor
   * cuando la placa es obligatoria, así que no hay validación cruzada.
   */
  const dinamico = (nombre: CampoDinamico) => {
    const c = dinamicos.find((x) => x.nombre === nombre);
    return c ? campoToZod(c) : z.string();
  };

  return z.object({
    vehiculo: z.object({
      marcaId: z.string().min(1, mensajeObligatorio('marca', catalogo)),
      modeloId: z.string().min(1, mensajeObligatorio('modelo', catalogo)),
      anio: z.string().min(1, mensajeObligatorio('anio', catalogo)),
    }),
    uso: z.string().refine(esUso, 'Elige el uso del vehículo'),
    placa: dinamico('placa'),
    sinPlaca: z.boolean(),
    clase: dinamico('clase'),
    ubicacion: z.object({
      departamento: z.string(),
      provincia: z.string(),
      ubigeo: z.string().regex(/^\d{6}$/, mensajeObligatorio('ubigeo', catalogo)),
    }),
    contacto: z.object({
      nombres: z.string().trim().min(2, 'Ingresa tus nombres').max(80, 'Los nombres no pueden pasar de 80 caracteres'),
      apellidos: z.string().trim().min(2, 'Ingresa tus apellidos').max(80, 'Los apellidos no pueden pasar de 80 caracteres'),
      telefono: z
        .string()
        .transform((v) => v.replace(/[\s-]/g, ''))
        .pipe(z.string().regex(FORMATO_CELULAR, 'Ingresa un celular de 9 dígitos que empiece con 9')),
      email: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido').max(254, 'El correo es demasiado largo'),
      canal: z.string().refine(esCanal, 'Elige cómo prefieres que te contactemos'),
      acepta: z.boolean().refine((v) => v, 'Acepta los términos y la política de privacidad para continuar'),
    }),
  });
}

export type CotizarFormValues = z.input<ReturnType<typeof buildCotizarSchema>>;

/** Del formulario validado al cuerpo exacto de `POST /cotizaciones`. Aquí se limpia; no se calcula nada. */
export function armarRequest(v: BorradorCotizar): CrearCotizacionRequest {
  if (!esUso(v.uso)) throw new Error('Falta el uso del vehículo');
  if (!esCanal(v.contacto.canal)) throw new Error('Falta el canal de contacto');
  const placa = v.sinPlaca ? '' : v.placa.trim().toUpperCase().replace(/\s+/g, '');
  const clase = v.clase.trim();
  return {
    vehiculo: {
      uso: v.uso,
      marcaId: v.vehiculo.marcaId,
      modeloId: v.vehiculo.modeloId,
      anio: Number(v.vehiculo.anio),
      ...(clase ? { clase } : {}),
      ...(placa ? { placa } : {}),
    },
    ubicacion: { ubigeo: v.ubicacion.ubigeo },
    contacto: {
      nombres: v.contacto.nombres.trim(),
      apellidos: v.contacto.apellidos.trim(),
      telefono: v.contacto.telefono.replace(/[\s-]/g, ''),
      email: v.contacto.email.trim().toLowerCase(),
      canalPreferido: v.contacto.canal,
    },
  };
}

/** Dónde vive cada campo del backend en el formulario (y a qué paso pertenece). */
export const RUTA_BACKEND_A_FORM: Record<string, string> = {
  'vehiculo.uso': 'uso',
  'vehiculo.marcaId': 'vehiculo.marcaId',
  'vehiculo.modeloId': 'vehiculo.modeloId',
  'vehiculo.anio': 'vehiculo.anio',
  'vehiculo.placa': 'placa',
  'vehiculo.clase': 'clase',
  'ubicacion.ubigeo': 'ubicacion.ubigeo',
  'contacto.nombres': 'contacto.nombres',
  'contacto.apellidos': 'contacto.apellidos',
  'contacto.telefono': 'contacto.telefono',
  'contacto.email': 'contacto.email',
  'contacto.canalPreferido': 'contacto.canal',
};

export function pasoDeCampo(campoForm: string): 1 | 2 | 3 {
  if ((CAMPOS_POR_PASO[2] as readonly string[]).includes(campoForm)) return 2;
  if ((CAMPOS_POR_PASO[3] as readonly string[]).includes(campoForm)) return 3;
  return 1;
}

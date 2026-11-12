/**
 * Claves de TanStack Query (arquitectura §6.6). Una sola fuente de verdad para
 * invalidar y actualizar la caché desde las mutaciones.
 */
export const qk = {
  salud: { ready: ['salud', 'ready'] as const },
  usuario: { me: ['usuario', 'me'] as const },

  catalogo: {
    campos: ['catalogo', 'campos'] as const,
    marcas: ['catalogo', 'vehiculos', 'marcas'] as const,
    modelos: (marcaId: string) => ['catalogo', 'vehiculos', 'modelos', marcaId] as const,
    anios: (modeloId: string) => ['catalogo', 'vehiculos', 'anios', modeloId] as const,
    departamentos: ['catalogo', 'ubigeos', 'departamentos'] as const,
    provincias: (departamento: string) => ['catalogo', 'ubigeos', 'provincias', departamento] as const,
    distritos: (departamento: string, provincia: string) =>
      ['catalogo', 'ubigeos', 'distritos', departamento, provincia] as const,
  },

  cotizacion: {
    resumen: (id: string) => ['cotizacion', id, 'resumen'] as const,
    mias: ['cotizacion', 'mias'] as const,
  },

  planes: {
    contenido: (planId: string) => ['planes', 'contenido', planId] as const,
    comparar: (ids: string[]) => ['planes', 'comparar', [...ids].sort().join(',')] as const,
  },

  pruebaChoque: {
    escenarios: (uso: string) => ['prueba-choque', 'escenarios', uso] as const,
    ultima: (cotizacionId: string) => ['prueba-choque', 'ultima', cotizacionId] as const,
  },

  compra: {
    resumen: (cotizacionId: string, primaCotizadaId: string) =>
      ['compra', 'resumen', cotizacionId, primaCotizadaId] as const,
    camposFaltantes: (cotizacionId: string) => ['compra', 'campos-faltantes', cotizacionId] as const,
    estado: (compraId: string) => ['compra', 'estado', compraId] as const,
  },

  polizas: { mias: ['polizas', 'mias'] as const },

  asesorias: {
    cola: (filtros: Record<string, string | undefined> = {}) => ['asesorias', 'cola', filtros] as const,
    detalle: (id: string) => ['asesorias', id] as const,
  },
  seguimientos: {
    lista: (filtros: Record<string, string | undefined> = {}) => ['seguimientos', 'lista', filtros] as const,
    detalle: (id: string) => ['seguimientos', id] as const,
  },
  retoma: (token: string) => ['retoma', token] as const,

  admin: {
    panel: ['admin', 'panel'] as const,
    usuarios: ['admin', 'usuarios'] as const,
    aseguradoras: ['admin', 'aseguradoras'] as const,
    planes: ['admin', 'planes'] as const,
    campos: ['admin', 'campos'] as const,
    reglasInspeccion: ['admin', 'reglas-inspeccion'] as const,
    parametros: ['admin', 'parametros'] as const,
    bitacora: (filtros: Record<string, string | undefined> = {}) => ['admin', 'bitacora', filtros] as const,
    tarifas: {
      planes: (aseguradoraId?: string) => ['admin', 'tarifas', 'planes', aseguradoraId ?? 'todas'] as const,
      pesos: (tabla: string, aseguradoraId: string) => ['admin', 'tarifas', 'pesos', tabla, aseguradoraId] as const,
      rangos: (filtros: Record<string, string | undefined>) => ['admin', 'tarifas', 'rangos-suma', filtros] as const,
      completitud: (aseguradoraId?: string) => ['admin', 'tarifas', 'completitud', aseguradoraId ?? 'todas'] as const,
    },
    contenido: {
      plan: (planId: string) => ['admin', 'contenido', 'plan', planId] as const,
      coberturas: ['admin', 'coberturas'] as const,
      completitud: ['admin', 'contenido', 'completitud'] as const,
    },
    pruebaChoque: (seccion: string, planId?: string) => ['admin', 'prueba-choque', seccion, planId ?? ''] as const,
  },

  reportes: (nombre: string, filtros: Record<string, string | undefined> = {}) => ['reportes', nombre, filtros] as const,
} as const;

/** Chatbot del sitio público (backend: `POST /asistente/mensajes` y `POST /cotizaciones/:id/asistente/mensajes`). */

export type RolMensajeChat = 'usuario' | 'asistente';

/** Botones que el backend puede sugerir debajo de una respuesta. */
export type AccionAsistente = 'COTIZAR' | 'ENVIAR_FOTO' | 'PRUEBA_CHOQUE' | 'HABLAR_ASESOR';

export interface MensajeAsistenteEnviado {
  rol: RolMensajeChat;
  texto: string;
}

/** Auto reconocido por foto; solo se manda cuando todavía no hay cotización. */
export interface VehiculoMencionado {
  marca: string;
  modelo: string;
}

export interface PlanRecomendado {
  planId: string;
  aseguradora: string;
  plan: string;
  resumen: string | null;
  motivo: string;
  /** Solo con cotización: los montos tal como los calculó el backend (strings decimales). */
  primaCotizadaId?: string;
  sumaAsegurada?: string | null;
  primaAnual?: string;
  primaMensual?: string | null;
}

export interface RespuestaAsistente {
  respuesta: string;
  planesRecomendados: PlanRecomendado[];
  acciones: AccionAsistente[];
  leyenda: string;
}

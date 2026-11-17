import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Camera, Headset, RotateCcw, Send, X } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { cn } from '../../../shared/lib/utils';
import { reducirImagen } from '../../../shared/lib/imagen';
import type { AccionAsistente } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { useReconocerVehiculo } from '../../cotizacion/hooks/useCatalogo';
import { useCotizarWizardStore } from '../../cotizacion/store/useCotizarWizardStore';
import { enviarMensajeAsistente } from '../api/asistente.api';
import { armarHistorial, MAX_TEXTO_USUARIO } from '../lib/historial';
import { useAsistenteStore, type MensajeChat } from '../store/useAsistenteStore';
import { PlanRecomendadoCard } from './PlanRecomendadoCard';

/** Mismo motivo que en PublicLayout: traen formularios (zod y react-hook-form); solo se descargan al pulsar. */
const SolicitarAsesoriaDialog = lazy(() =>
  import('../../asesoria-retencion/cliente/SolicitarAsesoriaDialog').then((m) => ({ default: m.SolicitarAsesoriaDialog })),
);
const LlamarAsesorDialog = lazy(() =>
  import('../../../app-shell/LlamarAsesorDialog').then((m) => ({ default: m.LlamarAsesorDialog })),
);

const TIPOS_FOTO = 'image/jpeg,image/png,image/webp';

/** Mismo texto que `LEYENDA_ASISTENTE` del backend. */
const LEYENDA = 'Asistente automático: sus respuestas son orientativas y no reemplazan el condicionado de la aseguradora.';

const SALUDO = '¡Hola! Soy el asistente de SeguroSimple. Cuéntame cómo usas tu auto y qué te preocupa, o mándame una foto de tu auto, y te ayudo a elegir un plan.';

const SUGERENCIAS = ['Recomiéndame un plan', '¿Qué cubre el robo de autopartes?', 'Quiero algo económico'];

const MENSAJE_FOTO = 'Te envié una foto de mi auto.';

function textoAnios(anios: number[]) {
  if (anios.length === 0) return 'El año lo eliges al cotizar.';
  return `El año lo eliges al cotizar; podría ser ${anios.slice(0, 3).join(', ')}.`;
}

/**
 * Ventana del chatbot. Recomienda planes, responde dudas y lleva al cotizador o a un asesor. No guarda nada
 * en el servidor: la conversación vive en esta pestaña y se reenvía completa en cada turno.
 */
export function AsistentePanel({ cotizacionId }: { cotizacionId: string | null }) {
  const navigate = useNavigate();
  const mensajes = useAsistenteStore((s) => s.mensajes);
  const vehiculo = useAsistenteStore((s) => s.vehiculo);
  const { agregar, fijarVehiculo, reiniciar, abrir } = useAsistenteStore.getState();

  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [asesorAbierto, setAsesorAbierto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  const conversar = useMutation({ mutationFn: enviarMensajeAsistente });
  const reconocer = useReconocerVehiculo();
  const ocupado = conversar.isPending || reconocer.isPending;

  useEffect(() => campo.current?.focus(), []);
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes.length, ocupado, error]);

  async function pedirRespuesta() {
    setError(null);
    const { mensajes: actuales, vehiculo: auto } = useAsistenteStore.getState();
    try {
      const r = await conversar.mutateAsync({
        mensajes: armarHistorial(actuales),
        cotizacionId,
        vehiculo: auto ? { marca: auto.marca, modelo: auto.modelo } : null,
      });
      agregar({ rol: 'asistente', texto: r.respuesta, planes: r.planesRecomendados, acciones: r.acciones });
    } catch (e) {
      setError(isApiError(e) ? e.message : 'No pudimos conectar con el asistente. Inténtalo de nuevo.');
    }
  }

  function enviar(contenido: string) {
    const limpio = contenido.trim();
    if (!limpio || ocupado) return;
    agregar({ rol: 'usuario', texto: limpio });
    setTexto('');
    void pedirRespuesta();
  }

  async function alElegirFoto(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir la misma foto
    if (!archivo || ocupado) return;
    setError(null);
    agregar({ rol: 'usuario', texto: MENSAJE_FOTO });
    try {
      const r = await reconocer.mutateAsync(await reducirImagen(archivo));
      if (r.reconocido && r.marca && r.modelo) {
        fijarVehiculo({ marcaId: r.marca.id, modeloId: r.modelo.id, marca: r.marca.nombre, modelo: r.modelo.nombre });
        agregar({
          rol: 'asistente',
          texto: `Parece un ${r.marca.nombre} ${r.modelo.nombre}. ${textoAnios(r.aniosProbables)} ¿Para qué lo usas y qué te preocupa? Así te recomiendo un plan.`,
          acciones: ['COTIZAR'],
        });
      } else {
        fijarVehiculo(null);
        agregar({
          rol: 'asistente',
          texto: 'No pude reconocer tu auto en la foto. Cuéntame qué auto tienes, o elígelo a mano al cotizar.',
          acciones: ['COTIZAR'],
        });
      }
    } catch (err) {
      agregar({
        rol: 'asistente',
        texto: isApiError(err) ? err.message : 'No pude revisar la foto. Cuéntame qué auto tienes, o elígelo a mano al cotizar.',
        acciones: ['COTIZAR'],
      });
    }
  }

  function alAccion(accion: AccionAsistente) {
    if (accion === 'ENVIAR_FOTO') return entradaFoto.current?.click();
    if (accion === 'HABLAR_ASESOR') return setAsesorAbierto(true);
    if (accion === 'PRUEBA_CHOQUE' && cotizacionId) {
      abrir(false);
      return navigate(`/cotizacion/${cotizacionId}/prueba`);
    }
    if (accion === 'COTIZAR') {
      // Si el formulario ya produjo una cotización se empieza de cero; luego se le pasa el auto de la foto.
      const wizard = useCotizarWizardStore.getState();
      wizard.reiniciarSiTerminado();
      if (vehiculo) wizard.guardarBorrador({ vehiculo: { marcaId: vehiculo.marcaId, modeloId: vehiculo.modeloId, anio: '' } });
      wizard.setPaso(1);
      abrir(false);
      return navigate('/cotizar');
    }
  }

  function alEnviar(e: FormEvent) {
    e.preventDefault();
    enviar(texto);
  }

  function alTeclear(e: KeyboardEvent) {
    if (e.key === 'Escape') abrir(false);
  }

  const hayError = error !== null && mensajes.at(-1)?.rol === 'usuario';

  return (
    <section
      role="dialog"
      aria-label="Asistente de SeguroSimple"
      onKeyDown={alTeclear}
      className="fixed inset-x-2 bottom-2 top-16 z-40 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[36rem] sm:max-h-[calc(100dvh-5rem)] sm:w-[24rem]"
    >
      <header className="flex items-center gap-2 bg-navy-800 px-4 py-3 text-white">
        <h2 className="flex-1 text-base font-bold">Asistente SeguroSimple</h2>
        <button
          type="button"
          aria-label="Nueva conversación"
          title="Nueva conversación"
          disabled={ocupado || mensajes.length === 0}
          onClick={() => {
            reiniciar();
            setError(null);
            setTexto('');
          }}
          className="flex size-9 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-white disabled:opacity-40"
        >
          <RotateCcw aria-hidden className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Cerrar el asistente"
          onClick={() => abrir(false)}
          className="flex size-9 items-center justify-center rounded-lg hover:bg-white/10 focus-visible:outline-white"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div ref={lista} role="log" aria-live="polite" aria-label="Conversación" className="flex-1 space-y-3 overflow-y-auto bg-canvas p-4">
        <Burbuja rol="asistente" texto={SALUDO} />
        {mensajes.length === 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={ocupado}
                onClick={() => enviar(s)}
                className="rounded-full border border-brand-500 bg-surface px-3 py-1.5 text-small font-bold text-brand-600 hover:bg-brand-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        {mensajes.map((m) => (
          <MensajeVista key={m.id} mensaje={m} cotizacionId={cotizacionId} vehiculo={vehiculo !== null} onAccion={alAccion} />
        ))}
        {ocupado ? (
          <p role="status" className="text-small text-ink-soft">
            {reconocer.isPending ? 'Revisando tu foto…' : 'Escribiendo…'}
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="rounded-lg border border-status-danger bg-surface p-3 text-small text-ink">
            <p>{error}</p>
            {hayError ? (
              <Button type="button" variant="outlineNavy" size="sm" className="mt-2" disabled={ocupado} onClick={() => void pedirRespuesta()}>
                Reintentar
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="border-t border-line bg-surface px-4 py-1.5 text-caption text-ink-soft">{LEYENDA}</p>

      <form onSubmit={alEnviar} className="flex items-center gap-2 border-t border-line bg-surface p-3">
        {!cotizacionId ? (
          <>
            <input
              ref={entradaFoto}
              type="file"
              accept={TIPOS_FOTO}
              className="sr-only"
              tabIndex={-1}
              aria-label="Foto de tu auto"
              onChange={(e) => void alElegirFoto(e)}
            />
            <button
              type="button"
              aria-label="Enviar una foto de mi auto"
              title="Enviar una foto de mi auto"
              disabled={ocupado}
              onClick={() => entradaFoto.current?.click()}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-navy-500 hover:bg-navy-50 hover:text-navy-700 focus-visible:outline-3 focus-visible:outline-brand-300 disabled:opacity-40"
            >
              <Camera aria-hidden className="size-6" />
            </button>
          </>
        ) : null}
        <input
          ref={campo}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={MAX_TEXTO_USUARIO}
          autoComplete="off"
          placeholder="Escribe tu mensaje"
          aria-label="Tu mensaje"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-soft focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-brand-300"
        />
        <Button type="submit" size="icon" aria-label="Enviar" disabled={ocupado || texto.trim() === ''}>
          <Send aria-hidden />
        </Button>
      </form>

      {asesorAbierto ? (
        <Suspense fallback={null}>
          {cotizacionId ? (
            <SolicitarAsesoriaDialog open onOpenChange={setAsesorAbierto} cotizacionId={cotizacionId} />
          ) : (
            <LlamarAsesorDialog open onOpenChange={setAsesorAbierto} />
          )}
        </Suspense>
      ) : null}
    </section>
  );
}

function Burbuja({ rol, texto }: { rol: MensajeChat['rol']; texto: string }) {
  const esPersona = rol === 'usuario';
  return (
    <div className={cn('flex', esPersona && 'justify-end')}>
      <p
        className={cn(
          'max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3 py-2 text-base',
          esPersona ? 'rounded-br-sm bg-navy-700 text-white' : 'rounded-bl-sm border border-line bg-surface text-ink',
        )}
      >
        <span className="sr-only">{esPersona ? 'Tú: ' : 'Asistente: '}</span>
        {texto}
      </p>
    </div>
  );
}

const ETIQUETA_ACCION: Record<AccionAsistente, string> = {
  COTIZAR: 'Cotizar ahora',
  ENVIAR_FOTO: 'Enviar foto de mi auto',
  PRUEBA_CHOQUE: 'Pon a prueba estos planes',
  HABLAR_ASESOR: 'Hablar con un asesor',
};

function MensajeVista({
  mensaje,
  cotizacionId,
  vehiculo,
  onAccion,
}: {
  mensaje: MensajeChat;
  cotizacionId: string | null;
  /** Hay un auto reconocido por foto: "Cotizar" lo lleva al formulario. */
  vehiculo: boolean;
  onAccion: (accion: AccionAsistente) => void;
}) {
  return (
    <div className="space-y-2">
      <Burbuja rol={mensaje.rol} texto={mensaje.texto} />
      {mensaje.planes?.map((p) => <PlanRecomendadoCard key={p.planId} plan={p} cotizacionId={cotizacionId} />)}
      {mensaje.acciones?.length ? (
        <div className="flex flex-wrap gap-2">
          {mensaje.acciones.map((a) => (
            <Button key={a} type="button" variant={a === 'HABLAR_ASESOR' ? 'outlineNavy' : 'secondary'} size="sm" onClick={() => onAccion(a)}>
              {a === 'HABLAR_ASESOR' ? <Headset aria-hidden /> : a === 'ENVIAR_FOTO' ? <Camera aria-hidden /> : null}
              {a === 'COTIZAR' && vehiculo ? 'Cotizar con estos datos' : ETIQUETA_ACCION[a]}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { FormProvider, useForm, type FieldErrors, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { TELEFONO_HREF } from '../../../shared/lib/contacto';
import { Button } from '../../../shared/ui/button';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast, WarningToast } from '../../../shared/ui/domain/toasts';
import { useCamposCatalogo } from '../hooks/useCatalogo';
import { useContactoPrevioStore } from '../../../shared/stores/useContactoPrevioStore';
import { useCotizar } from '../hooks/useCotizacion';
import {
  armarRequest,
  buildCotizarSchema,
  CAMPOS_POR_PASO,
  pasoDeCampo,
  RUTA_BACKEND_A_FORM,
} from '../schema/buildZodSchema';
import { useCotizarWizardStore, type BorradorCotizar, type PasoWizard } from '../store/useCotizarWizardStore';
import { PasoContacto } from './PasoContacto';
import { PasoUbicacion } from './PasoUbicacion';
import { PasoVehiculo } from './PasoVehiculo';
import { ResumenLateral } from './ResumenLateral';
import type { CatalogoCampos } from '../../../shared/types/api';

const PASOS: Record<PasoWizard, { nombre: string; titulo: string; ayuda?: string }> = {
  1: { nombre: 'Tu vehículo', titulo: '¿Qué auto quieres asegurar?' },
  2: { nombre: 'Tu ubicación', titulo: '¿Dónde usas tu auto?', ayuda: 'La zona influye en el precio y en la Prueba de Choque.' },
  3: { nombre: 'Tus datos', titulo: '¿Dónde te enviamos tus cotizaciones?', ayuda: 'Solo te pedimos lo necesario para cotizar. El resto lo completas al comprar.' },
};

/** Rutas (`vehiculo.marcaId`, `contacto.email`…) de todos los campos que tienen error. */
function rutasConError(errors: FieldErrors<BorradorCotizar>, prefijo = ''): string[] {
  return Object.entries(errors).flatMap(([clave, valor]) => {
    if (!valor || typeof valor !== 'object') return [];
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if ('message' in valor && typeof valor.message === 'string') return [ruta];
    return rutasConError(valor as FieldErrors<BorradorCotizar>, ruta);
  });
}

const primerPasoConError = (rutas: string[]): PasoWizard | null =>
  rutas.length === 0 ? null : (Math.min(...rutas.map(pasoDeCampo)) as PasoWizard);

/**
 * Wizard de 3 pasos (Vehículo · Ubicación · Contacto): una decisión por pantalla en móvil (RNF-07, diseño §9.2).
 * El formulario se arma desde el catálogo (RF-02); el borrador vive en sessionStorage.
 */
export function CotizarWizard() {
  const campos = useCamposCatalogo();
  if (campos.isError) return <EstadoError error={campos.error} onRetry={() => void campos.refetch()} />;
  if (campos.isLoading || !campos.data) {
    return (
      <div className="space-y-4" aria-busy aria-label="Cargando el formulario">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  return <WizardForm catalogo={campos.data} />;
}

function WizardForm({ catalogo }: { catalogo: CatalogoCampos }) {
  const navigate = useNavigate();
  const cotizar = useCotizar();
  const { paso, setPaso, borrador, guardarBorrador, reiniciar } = useCotizarWizardStore();
  const [bloqueo, setBloqueo] = useState<string | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primerRender = useRef(true);

  const schema = useMemo(() => buildCotizarSchema(catalogo), [catalogo]);
  const form = useForm<BorradorCotizar>({
    resolver: zodResolver(schema),
    defaultValues: borrador,
    mode: 'onTouched', // validación al salir del campo (diseño §9.2)
  });
  const values = form.watch();

  // El borrador sobrevive a un refresh (sessionStorage).
  useEffect(() => {
    const sub = form.watch((v) => guardarBorrador(v as BorradorCotizar));
    return () => sub.unsubscribe();
  }, [form, guardarBorrador]);

  // Al cambiar de paso, el foco pasa al título (accesibilidad, diseño §11.3).
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    tituloRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [paso]);

  const irAlPaso = (p: PasoWizard) => {
    setBloqueo(null);
    setPaso(p);
  };

  const continuar = async () => {
    const campos = [...CAMPOS_POR_PASO[paso]] as FieldPath<BorradorCotizar>[];
    if (await form.trigger(campos)) irAlPaso((paso + 1) as PasoWizard);
  };

  const enviar = form.handleSubmit(
    async (v) => {
      setBloqueo(null);
      try {
        const r = await cotizar.mutateAsync(armarRequest(v));
        // El asistente borra su borrador, pero el registro de la compra reutiliza estos datos (solo falta la contraseña).
        useContactoPrevioStore.getState().guardar({
          nombres: v.contacto.nombres.trim(),
          apellidos: v.contacto.apellidos.trim(),
          telefono: v.contacto.telefono.replace(/[\s-]/g, ''),
          email: v.contacto.email.trim().toLowerCase(),
        });
        reiniciar();
        // RF-05: si alguna aseguradora no cotizó, aviso ámbar (la operación SÍ se ejecutó).
        if (r.warning) WarningToast(r.warning, `warning-${r.cotizacion.id}-${r.warning.code}`);
        navigate(`/cotizacion/${r.cotizacion.id}`);
      } catch (e) {
        manejarErrorDelBackend(e);
      }
    },
    // Si algo de un paso anterior quedó inválido (p. ej. tras un refresh), se vuelve a ese paso.
    (errores) => {
      const p = primerPasoConError(rutasConError(errores));
      if (p) irAlPaso(p);
    },
  );

  /** RF-03: los errores por campo del backend se asignan al campo y se vuelve a su paso. 422 = fuera de nicho (RN-05). */
  const manejarErrorDelBackend = (e: unknown) => {
    if (isApiError(e)) {
      const mapeados = e.errors.filter((x) => RUTA_BACKEND_A_FORM[x.campo]);
      if (mapeados.length > 0) {
        const rutas: string[] = [];
        for (const x of mapeados) {
          const ruta = RUTA_BACKEND_A_FORM[x.campo]!;
          rutas.push(ruta);
          form.setError(ruta as FieldPath<BorradorCotizar>, { type: 'server', message: x.mensaje });
        }
        const p = primerPasoConError(rutas);
        if (p) irAlPaso(p);
        return;
      }
      if (e.statusCode === 422) {
        setBloqueo(e.message); // pantalla de contacto: la persona no puede cotizar en línea
        ErrorToast(e);
        return;
      }
    }
    ErrorToast(e);
  };

  const alEnviarFormulario = (ev: FormEvent) => {
    // Enter en un campo de los pasos 1 y 2 avanza; solo el paso 3 envía.
    if (paso < 3) {
      ev.preventDefault();
      void continuar();
      return;
    }
    void enviar(ev);
  };

  const info = PASOS[paso];
  return (
    <div className="mx-auto grid max-w-[1000px] gap-8 lg:grid-cols-[minmax(0,640px)_1fr]">
      <FormProvider {...form}>
        <form onSubmit={alEnviarFormulario} noValidate aria-label="Cotizar tu seguro vehicular" className="min-w-0">
          <p className="text-small text-ink-soft">
            Paso {paso} de 3 · <span className="font-bold text-navy-700">{info.nombre}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Avance del formulario"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={paso}
            className="mb-5 mt-2 h-1 w-full rounded-full bg-navy-100"
          >
            <div className="h-full rounded-full bg-brand-500 transition-[width] duration-200" style={{ width: `${(paso / 3) * 100}%` }} />
          </div>

          <h1 ref={tituloRef} tabIndex={-1} className="text-h1 text-navy-700 focus:outline-none">
            {info.titulo}
          </h1>
          {info.ayuda ? <p className="mb-5 mt-1 text-ink-soft">{info.ayuda}</p> : <div className="mb-5" />}

          {bloqueo ? (
            <div role="alert" className="mb-5 rounded-xl border border-status-danger/30 bg-status-danger/5 p-4">
              <p className="font-bold text-status-danger">{bloqueo}</p>
              <Button variant="secondary" size="sm" className="mt-3" asChild>
                <a href={TELEFONO_HREF}>Hablar con un asesor</a>
              </Button>
            </div>
          ) : null}

          {paso === 1 ? <PasoVehiculo catalogo={catalogo} /> : null}
          {paso === 2 ? <PasoUbicacion /> : null}
          {paso === 3 ? <PasoContacto /> : null}

          {/* CTA fijo abajo en móvil (diseño §12); en escritorio, en línea. */}
          <div className="sticky bottom-0 -mx-4 mt-6 flex items-center gap-3 border-t border-line bg-surface px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
            {paso > 1 ? (
              <Button type="button" variant="ghost" size="lg" className="min-w-0 px-4" onClick={() => irAlPaso((paso - 1) as PasoWizard)}>
                <ArrowLeft aria-hidden /> Atrás
              </Button>
            ) : null}
            {paso < 3 ? (
              <Button type="button" size="lg" className="flex-1 md:flex-none" onClick={() => void continuar()}>
                Continuar <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button type="submit" size="lg" className="flex-1 md:flex-none" loading={cotizar.isPending} loadingText="Cotizando…">
                Ver planes y precios
              </Button>
            )}
          </div>
        </form>
      </FormProvider>

      <ResumenLateral values={values} />
    </div>
  );
}

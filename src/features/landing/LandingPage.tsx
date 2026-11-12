import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ambulance,
  ArrowRight,
  Car,
  CheckCircle2,
  FileSignature,
  Headset,
  HeartHandshake,
  PenLine,
  PiggyBank,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Wine,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { cn } from '../../shared/lib/utils';
import { SelectorVehiculoCascada, type ValorVehiculo } from '../cotizacion/components/SelectorVehiculoCascada';
import { useCotizarWizardStore } from '../cotizacion/store/useCotizarWizardStore';

/**
 * Landing (diseño visual §9.1). Conserva la identidad de la web actual
 * (carmesí, azul marino, tarjeta blanca elevada, logos en gris, numerales
 * grandes) y cambia el mensaje: cotizar → probar → elegir → pagar.
 */
export function LandingPage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Beneficios />
      <ComoFunciona />
      <SomosElMayor />
      <Siniestro />
      <Cifras />
    </>
  );
}

/* ───────────── Hero ───────────── */

function Hero() {
  return (
    <section className="bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-6 lg:py-16">
        <div>
          <h1 className="text-display text-navy-800">Cotiza tu seguro vehicular</h1>
          <p className="mt-4 max-w-[34rem] text-lg text-ink-soft">
            Compara las 5 aseguradoras en segundos y mira cuánto pagarías <strong className="text-ink">de verdad</strong> si te
            pasa algo.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-small font-bold text-navy-700">
            {['5 aseguradoras', 'Sin llamadas obligatorias', 'Compra en línea'].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-status-success" aria-hidden /> {t}
              </li>
            ))}
          </ul>
          <PromoBanner />
        </div>
        <HeroCotizador />
      </div>
    </section>
  );
}

/**
 * Tarjeta del hero (diseño §9.1): muestra solo el paso 1 (marca, modelo y año reales del catálogo) y continúa en
 * /cotizar con lo elegido ya cargado en el borrador. No valida: el asistente lo hace paso a paso.
 */
function HeroCotizador() {
  const navigate = useNavigate();
  const { borrador, guardarBorrador, setPaso } = useCotizarWizardStore();
  const [vehiculo, setVehiculo] = useState<ValorVehiculo>(borrador.vehiculo);

  const continuar = () => {
    guardarBorrador({ vehiculo });
    setPaso(1);
    navigate('/cotizar');
  };

  return (
    <Card elevated className="p-6 lg:p-8">
      <h2 className="text-h2 text-brand-500">Cotiza al instante</h2>
      <ol className="mb-5 mt-3 flex items-center gap-2 text-small text-ink-soft" aria-label="Pasos de la cotización">
        <li className="inline-flex items-center gap-1.5 font-bold text-navy-700" aria-current="step">
          <span aria-hidden className="size-2.5 rounded-full bg-brand-500" /> Vehículo
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full border border-line" /> Ubicación
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-full border border-line" /> Contacto
        </li>
      </ol>
      <SelectorVehiculoCascada value={vehiculo} onChange={setVehiculo} />
      <Button size="lg" className="mt-2 w-full" onClick={continuar}>
        Continuar <ArrowRight aria-hidden />
      </Button>
      <p className="mt-3 text-center text-small text-ink-soft">Sin registro. Te mostramos los precios al terminar.</p>
    </Card>
  );
}

/** Slot de promoción (§8.8): se apaga sin tocar el layout. Vacío hasta definir la promo vigente. */
function PromoBanner() {
  const promo: { titulo: string; detalle: string } | null = null;
  if (!promo) return null;
  const p: { titulo: string; detalle: string } = promo;
  return (
    <div className="mt-6 rounded-xl border border-accent-500/40 bg-accent-50 p-4">
      <p className="font-bold text-accent-700">{p.titulo}</p>
      <p className="text-small text-ink-soft">{p.detalle}</p>
    </div>
  );
}

/* ───────────── Franja de confianza ───────────── */

const ASEGURADORAS = ['Pacífico', 'MAPFRE', 'RIMAC', 'Qualitas', 'La Positiva'];

function TrustStrip() {
  return (
    <section aria-label="Aseguradoras con las que comparamos" className="border-y border-line bg-surface">
      <ul className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 lg:px-6">
        {ASEGURADORAS.map((a) => (
          <li key={a} className="font-sans text-xl font-900 uppercase tracking-wide text-status-neutral/70">
            {a}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Beneficios ───────────── */

const BENEFICIOS: { icono: LucideIcon; titulo: string; texto: string; acento?: boolean }[] = [
  { icono: Scale, titulo: 'Compara', texto: 'Cotiza con las 5 aseguradoras del mercado en segundos.' },
  { icono: ShieldAlert, titulo: 'Prueba', texto: 'Mira cuánto pagarías tú en un choque o un robo con cada plan.', acento: true },
  { icono: HeartHandshake, titulo: 'Asegura', texto: 'Compra en línea o habla con un asesor. Tú eliges.' },
  { icono: PiggyBank, titulo: 'Ahorra', texto: 'El mejor precio garantizado (ver condiciones).' },
];

function Beneficios() {
  return (
    <section className="bg-surface">
      <ul className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {BENEFICIOS.map(({ icono: Icono, titulo, texto, acento }) => (
          <li key={titulo} className="flex gap-4">
            <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-full', acento ? 'bg-accent-50' : 'bg-navy-50')}>
              <Icono className={cn('size-7', acento ? 'text-accent-700' : 'text-navy-700')} strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h3 className={cn('text-h3 uppercase', acento ? 'text-accent-700' : 'text-brand-500')}>{titulo}</h3>
              <p className="mt-1 text-ink-soft">{texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── Cómo funciona ───────────── */

const PASOS = [
  { titulo: 'Cotiza', texto: 'Cuéntanos de tu auto y en un minuto tienes el precio de las 5 aseguradoras.' },
  { titulo: 'Prueba de Choque', texto: 'Mira cuánto pagarías tú en 6 situaciones reales con cada plan.' },
  { titulo: 'Elige', texto: 'Compara coberturas, ajusta la suma asegurada y escoge el plan que te conviene.' },
  { titulo: 'Paga', texto: 'Compra en línea, al contado o en cuotas, y descarga tu póliza al instante.' },
];

function ComoFunciona() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-6 lg:py-16">
        <h2 className="text-center text-h1 text-brand-500">¿Cómo funciona SeguroSimple?</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-2">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-4">
              <span className="text-step-number text-brand-500" aria-hidden>
                {i + 1}.
              </span>
              <div className="pt-2">
                <h3 className="text-h3 uppercase text-navy-700">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {p.titulo}
                </h3>
                <p className="mt-1 text-ink-soft">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-center text-ink-soft">
          Compra ahora o habla con un asesor, <strong className="text-ink">tú eliges</strong>.
        </p>
      </div>
    </section>
  );
}

/* ───────────── Somos el mayor corredor ───────────── */

function SomosElMayor() {
  return (
    <section className="bg-navy-800 text-white">
      <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-12 lg:grid-cols-2 lg:px-6 lg:py-16">
        <h2 className="text-display">Somos el mayor corredor de seguros digital del Perú</h2>
        <div className="rounded-[2rem] bg-accent-500 p-6 text-navy-900 lg:p-8">
          <p className="text-lg">
            Encuentra en segundos el seguro vehicular que necesitas. Te asesoramos antes y después de la contratación para
            que compares todas las opciones del mercado y ahorres hasta 35 % <span className="text-small">(ver condiciones)</span>.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ───────────── Siniestro ───────────── */

const SINIESTRO: { icono: LucideIcon; texto: string }[] = [
  { icono: Ambulance, texto: 'En caso alguien esté herido, movilízalo a una clínica u hospital.' },
  { icono: Headset, texto: 'Llama a tu aseguradora para que un especialista te atienda.' },
  { icono: HeartHandshake, texto: 'Abstente de cualquier compromiso con terceros.' },
  { icono: PenLine, texto: 'Efectúa la denuncia inmediatamente.' },
  { icono: Wrench, texto: 'Confirma si necesitas una grúa.' },
  { icono: Wine, texto: 'Debes someterte al dosaje etílico.' },
  { icono: FileSignature, texto: 'Formaliza tus declaraciones por escrito con uno de los asesores.' },
];

function Siniestro() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-6 lg:py-16">
        <h2 className="text-center text-h1 text-brand-500">¿Qué hacer en caso de siniestro?</h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SINIESTRO.map(({ icono: Icono, texto }, i) => (
            <li key={texto} className="flex flex-col items-center gap-3 text-center">
              <Icono className="size-14 text-navy-700" strokeWidth={1.25} aria-hidden />
              <p className="text-ink">
                {i + 1}) {texto}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────── Cifras ───────────── */

function Cifras() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-4 py-12 text-center lg:px-6">
        <p className="text-h1 text-navy-800">
          Más de <strong className="text-brand-500">300,000 personas</strong> han cotizado con nosotros
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link to="/cotizar">
              <Car aria-hidden /> Cotiza en 1 minuto
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <a href="tel:+5116803770">
              <Headset aria-hidden /> Te llamamos
            </a>
          </Button>
        </div>
        <p className="inline-flex items-center gap-2 text-small text-ink-soft">
          <ShieldCheck className="size-4" aria-hidden /> Supervisado por la SBS
        </p>
      </div>
    </section>
  );
}

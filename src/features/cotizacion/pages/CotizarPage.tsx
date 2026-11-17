import { useLocation } from 'react-router-dom';
import { CotizarWizard } from '../components/CotizarWizard';

/** `/cotizar` (público): wizard de 3 pasos. Pública, sin cuenta: se cotiza antes de registrarse. */
export function CotizarPage() {
  // `key`: cada navegación a /cotizar monta el formulario de nuevo y lee el borrador al día. Si ya estabas en
  // /cotizar y el asistente (chatbot) deja ahí el auto de la foto, sin esto el formulario ya montado no lo vería.
  const { key } = useLocation();
  return (
    <section className="px-4 py-6 lg:px-6 lg:py-10">
      <CotizarWizard key={key} />
    </section>
  );
}

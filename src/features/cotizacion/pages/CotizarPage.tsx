import { CotizarWizard } from '../components/CotizarWizard';

/** `/cotizar` (público): wizard de 3 pasos. Pública, sin cuenta: se cotiza antes de registrarse. */
export function CotizarPage() {
  return (
    <section className="px-4 py-6 lg:px-6 lg:py-10">
      <CotizarWizard />
    </section>
  );
}

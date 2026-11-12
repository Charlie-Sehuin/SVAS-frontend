import { Link } from 'react-router-dom';
import { Button } from '../shared/ui/button';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-step-number text-brand-500">404</p>
      <h1 className="text-h1 text-navy-700">No encontramos esa página</h1>
      <p className="text-ink-soft">Puede que el enlace esté mal escrito o que ya no exista.</p>
      <Button asChild>
        <Link to="/">Ir al inicio</Link>
      </Button>
    </section>
  );
}

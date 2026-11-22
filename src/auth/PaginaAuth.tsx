import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../shared/ui/card';
import { DemoLegend } from '../shared/ui/domain/DemoLegend';
import { LogoSeguroSimple } from '../app-shell/LogoSeguroSimple';

/** Marco de las pantallas de acceso fuera del sitio (recuperar y restablecer contraseña): logo, tarjeta y leyenda. */
export function PaginaAuth({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center px-4 lg:px-6">
        <Link to="/" aria-label="Ir al inicio">
          <LogoSeguroSimple />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <Card elevated className="w-full max-w-md p-6 lg:p-8">
          <h1 className="text-h1 text-navy-700">{titulo}</h1>
          {descripcion ? <p className="mb-6 mt-1 text-ink-soft">{descripcion}</p> : <div className="mb-6" />}
          {children}
        </Card>
      </main>
      <DemoLegend />
    </div>
  );
}

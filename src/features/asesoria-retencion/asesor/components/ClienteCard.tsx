import { Mail, Phone } from 'lucide-react';
import type { ClienteEnDetalle } from '../../../../shared/types/api';
import { Card } from '../../../../shared/ui/card';
import { TEXTO_CANAL } from '../textos';

/**
 * Datos de contacto del cliente en el detalle (doc conexión §5): teléfono y correo completos para poder contactarlo; el
 * documento llega completo solo en el caso asignado o para el administrador, y si no, ya enmascarado por el backend.
 */
export function ClienteCard({ cliente: c }: { cliente: ClienteEnDetalle }) {
  return (
    <Card className="p-4">
      <h2 className="text-h3 text-navy-700">Cliente</h2>
      <p className="mt-2 font-bold text-ink">
        {c.nombres} {c.apellidos}
      </p>
      <ul className="mt-2 space-y-1.5 text-small">
        <li className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-ink-soft" aria-hidden />
          <a href={`tel:+51${c.telefono}`} className="font-bold text-brand-600 underline-offset-4 hover:underline">
            {c.telefono}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Mail className="size-4 shrink-0 text-ink-soft" aria-hidden />
          <a href={`mailto:${c.email}`} className="text-brand-600 underline-offset-4 hover:underline">
            {c.email}
          </a>
        </li>
        <li className="text-ink-soft">Prefiere {TEXTO_CANAL[c.canalPreferido]}</li>
        {c.numeroDocumento ? <li className="text-ink-soft">Documento: {c.numeroDocumento}</li> : null}
      </ul>
    </Card>
  );
}

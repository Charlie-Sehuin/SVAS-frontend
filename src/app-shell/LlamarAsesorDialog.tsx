import { Phone } from 'lucide-react';
import { TELEFONO, TELEFONO_HREF } from '../shared/lib/contacto';
import { Button } from '../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../shared/ui/dialog';

/**
 * "Hablar con un asesor" cuando todavía no hay una cotización sobre la cual pedir asesoría (p. ej. al empezar a cotizar).
 * Muestra el número en pantalla en vez de lanzar un enlace `tel:` que en la computadora abre el aviso "Elegir una
 * aplicación" del navegador; quien está en el celular lo marca con un toque en "Llamar ahora".
 */
export function LlamarAsesorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Habla con un asesor</DialogTitle>
          <DialogDescription>Llámanos y te ayudamos con tu cotización. Si prefieres, cotiza primero y pídenos que te contactemos.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="flex items-center gap-2 text-h2 text-navy-700">
            <Phone className="size-6 shrink-0" aria-hidden /> <span className="select-all">{TELEFONO}</span>
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button asChild>
            <a href={TELEFONO_HREF}>
              <Phone aria-hidden /> Llamar ahora
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import type { ReactNode } from 'react';
import { Button } from '../button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../dialog';

/** Confirmación de acciones destructivas (diseño §10.1: `destructive` siempre con confirmación). */
export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  confirmarTexto,
  onConfirm,
  loading,
  destructivo = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  descripcion: ReactNode;
  confirmarTexto: string;
  onConfirm: () => void;
  loading?: boolean;
  destructivo?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outlineNavy" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={destructivo ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmarTexto}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

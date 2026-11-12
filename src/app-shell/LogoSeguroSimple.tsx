import { cn } from '../shared/lib/utils';

/**
 * Logo (diseño visual §6): versión completa "seguro simple.com" con la leyenda
 * del respaldo, y versión "S" cuadrada carmesí para la barra fija.
 * Es tipográfico mientras no exista el SVG oficial de la marca.
 */
export function LogoSeguroSimple({ className, compacto = false }: { className?: string; compacto?: boolean }) {
  if (compacto) return <LogoS className={className} />;
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="font-sans text-[22px] font-900 tracking-tight">
        <span className="text-navy-800">seguro</span>
        <span className="text-brand-500">simple</span>
        <span className="text-navy-800 text-[14px]">.com</span>
      </span>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-800">
        Con el respaldo de Ategia Corredores de Seguros
      </span>
    </span>
  );
}

export function LogoS({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-10 items-center justify-center rounded-lg bg-brand-500 font-sans text-2xl font-900 text-[var(--primary-foreground)]',
        className,
      )}
    >
      S
    </span>
  );
}

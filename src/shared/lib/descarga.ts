/** Entrega un archivo al navegador como descarga (el PDF de la póliza llega como `Blob` con el Bearer ya aplicado). */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Se libera después del clic para no cortar la descarga en navegadores lentos.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

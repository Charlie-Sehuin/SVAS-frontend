const LADO_MAXIMO = 1280;
const CALIDAD = 0.85;

/**
 * Reduce la foto antes de subirla: las del celular pesan varios MB y el backend acepta hasta 5 MB.
 * 1280 px sobran para reconocer un auto. Si el navegador no puede (formato raro, sin canvas), devuelve
 * la original y que el backend decida.
 */
export async function reducirImagen(archivo: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const reducida = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', CALIDAD));
    return reducida && reducida.size < archivo.size ? reducida : archivo;
  } catch {
    return archivo;
  }
}

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * `tokenAcceso` de la cotización anónima (doc conexión §2). Vive en
 * sessionStorage: se pierde al cerrar la pestaña y nunca va a localStorage.
 * Se guarda por cotización para que el cliente pueda tener más de una abierta.
 */
interface CotizacionTokenState {
  tokens: Record<string, string>;
  /** Última cotización creada en esta pestaña (para "volver a mi cotización"). */
  ultimaCotizacionId: string | null;
  guardar: (cotizacionId: string, token: string) => void;
  obtener: (cotizacionId: string) => string | null;
  olvidar: (cotizacionId: string) => void;
  limpiar: () => void;
}

export const useCotizacionTokenStore = create<CotizacionTokenState>()(
  persist(
    (set, get) => ({
      tokens: {},
      ultimaCotizacionId: null,
      guardar: (cotizacionId, token) =>
        set((s) => ({ tokens: { ...s.tokens, [cotizacionId]: token }, ultimaCotizacionId: cotizacionId })),
      obtener: (cotizacionId) => get().tokens[cotizacionId] ?? null,
      olvidar: (cotizacionId) =>
        set((s) => {
          const { [cotizacionId]: _omitido, ...resto } = s.tokens;
          return { tokens: resto, ultimaCotizacionId: s.ultimaCotizacionId === cotizacionId ? null : s.ultimaCotizacionId };
        }),
      limpiar: () => set({ tokens: {}, ultimaCotizacionId: null }),
    }),
    { name: 'svas.cotizacion-token', storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Extrae el id de cotización de una URL de la API (`cotizaciones/:id/...`). */
export function cotizacionIdDesdeUrl(url: string): string | null {
  const m = /\/cotizaciones\/([0-9a-f-]{36})(?:\/|$|\?)/i.exec(url);
  return m?.[1] ?? null;
}

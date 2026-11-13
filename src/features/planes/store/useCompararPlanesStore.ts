import { create } from 'zustand';

export const MAXIMO_COMPARAR = 3;

export interface PlanParaComparar {
  planId: string;
  /** "Rímac · Oro": para mostrarlo en la barra sin pedir nada. */
  etiqueta: string;
}

interface CompararPlanesState {
  planes: PlanParaComparar[];
  /** Agrega o quita el plan. Si ya hay 3 y no estaba, no hace nada (la casilla se deshabilita antes). */
  alternar: (plan: PlanParaComparar) => void;
  quitar: (planId: string) => void;
  limpiar: () => void;
}

/**
 * Planes marcados con "Comparar" en el comparativo (hasta 3, arquitectura §6.11). Solo vive en memoria: es una
 * selección de la pantalla actual y no tiene sentido recordarla entre visitas.
 */
export const useCompararPlanesStore = create<CompararPlanesState>()((set) => ({
  planes: [],
  alternar: (plan) =>
    set((s) => {
      if (s.planes.some((p) => p.planId === plan.planId)) return { planes: s.planes.filter((p) => p.planId !== plan.planId) };
      if (s.planes.length >= MAXIMO_COMPARAR) return s;
      return { planes: [...s.planes, plan] };
    }),
  quitar: (planId) => set((s) => ({ planes: s.planes.filter((p) => p.planId !== planId) })),
  limpiar: () => set({ planes: [] }),
}));

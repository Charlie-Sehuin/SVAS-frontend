import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Estado de interfaz del backoffice (Zustand solo para UI, arquitectura §1). */
interface SidebarState {
  colapsado: boolean;
  abiertoMovil: boolean;
  alternar: () => void;
  abrirMovil: (abierto: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      colapsado: false,
      abiertoMovil: false,
      alternar: () => set((s) => ({ colapsado: !s.colapsado })),
      abrirMovil: (abierto) => set({ abiertoMovil: abierto }),
    }),
    { name: 'svas.sidebar', partialize: (s) => ({ colapsado: s.colapsado }) },
  ),
);

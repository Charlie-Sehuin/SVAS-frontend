import { create } from 'zustand';

/**
 * "Estamos despertando el servidor…" (arquitectura §4.3, diseño §11.1).
 * El api-client marca `despertando = true` si una request lleva más de 4 s sin
 * respuesta y aún no hubo ninguna respuesta exitosa en esta pestaña.
 */
interface WakeUpState {
  despertando: boolean;
  yaRespondio: boolean;
  marcarDespertando: () => void;
  marcarRespondio: () => void;
}

export const useWakeUpStore = create<WakeUpState>()((set, get) => ({
  despertando: false,
  yaRespondio: false,
  marcarDespertando: () => {
    if (!get().yaRespondio) set({ despertando: true });
  },
  marcarRespondio: () => set({ despertando: false, yaRespondio: true }),
}));

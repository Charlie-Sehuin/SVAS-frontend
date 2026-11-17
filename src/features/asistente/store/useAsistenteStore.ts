import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AccionAsistente, PlanRecomendado, RolMensajeChat } from '../../../shared/types/api';

export interface MensajeChat {
  id: string;
  rol: RolMensajeChat;
  texto: string;
  planes?: PlanRecomendado[];
  acciones?: AccionAsistente[];
}

/** Auto reconocido por foto dentro del chat (ids para rellenar el cotizador, nombres para el asistente). */
export interface VehiculoDeFoto {
  marcaId: string;
  modeloId: string;
  marca: string;
  modelo: string;
}

interface AsistenteState {
  abierto: boolean;
  mensajes: MensajeChat[];
  vehiculo: VehiculoDeFoto | null;
  abrir: (abierto: boolean) => void;
  agregar: (mensaje: Omit<MensajeChat, 'id'>) => void;
  fijarVehiculo: (vehiculo: VehiculoDeFoto | null) => void;
  /** Conversación nueva: borra mensajes y el auto de la foto. */
  reiniciar: () => void;
}

let contador = 0;
const nuevoId = () => `m${Date.now().toString(36)}-${contador++}`;

/**
 * Estado de interfaz del chatbot. La conversación vive en sessionStorage (se pierde al cerrar la pestaña):
 * el backend no guarda nada. No hay datos personales: el chat no los pide.
 */
export const useAsistenteStore = create<AsistenteState>()(
  persist(
    (set) => ({
      abierto: false,
      mensajes: [],
      vehiculo: null,
      abrir: (abierto) => set({ abierto }),
      agregar: (mensaje) => set((s) => ({ mensajes: [...s.mensajes, { ...mensaje, id: nuevoId() }] })),
      fijarVehiculo: (vehiculo) => set({ vehiculo }),
      reiniciar: () => set({ mensajes: [], vehiculo: null }),
    }),
    {
      name: 'svas.asistente',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (s) => ({ mensajes: s.mensajes, vehiculo: s.vehiculo }),
    },
  ),
);

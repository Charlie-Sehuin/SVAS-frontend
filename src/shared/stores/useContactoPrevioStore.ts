import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Los datos de contacto que la persona ya escribió al cotizar. El asistente borra su borrador al terminar, pero el
 * registro dentro del embudo (CU-02) no debe pedir otra vez nombre, apellido, celular y correo: solo la contraseña.
 * Vive en sessionStorage (solo esta pestaña) y se borra al crear la cuenta.
 */
export interface ContactoPrevio {
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
}

interface ContactoPrevioState {
  contacto: ContactoPrevio | null;
  guardar: (contacto: ContactoPrevio) => void;
  limpiar: () => void;
}

export const useContactoPrevioStore = create<ContactoPrevioState>()(
  persist(
    (set) => ({
      contacto: null,
      guardar: (contacto) => set({ contacto }),
      limpiar: () => set({ contacto: null }),
    }),
    { name: 'svas.contacto-previo', storage: createJSONStorage(() => sessionStorage), version: 1 },
  ),
);

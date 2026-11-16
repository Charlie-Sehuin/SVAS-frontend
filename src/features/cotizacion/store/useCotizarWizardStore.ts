import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';


/**
 * Borrador del formulario de cotizar. Vive en sessionStorage para que un refresh no borre lo escrito
 * (arquitectura §9.2, diseño §9.2). Es estado de interfaz: nada de esto es un dato del servidor.
 */
export interface BorradorCotizar {
  vehiculo: { marcaId: string; modeloId: string; anio: string };
  uso: string;
  placa: string;
  sinPlaca: boolean;
  clase: string;
  ubicacion: { departamento: string; provincia: string; ubigeo: string };
  contacto: {
    nombres: string;
    apellidos: string;
    telefono: string;
    email: string;
    canal: string;
    acepta: boolean;
  };
}

export type PasoWizard = 1 | 2 | 3;

export const BORRADOR_VACIO: BorradorCotizar = {
  vehiculo: { marcaId: '', modeloId: '', anio: '' },
  uso: 'PARTICULAR',
  placa: '',
  sinPlaca: false,
  clase: '',
  ubicacion: { departamento: '', provincia: '', ubigeo: '' },
  contacto: { nombres: '', apellidos: '', telefono: '', email: '', canal: 'WHATSAPP', acepta: false },
};

interface WizardState {
  paso: PasoWizard;
  borrador: BorradorCotizar;
  /**
   * Cotización que salió de este borrador. El borrador se conserva para poder volver con la flecha del navegador (o con
   * "Editar mis datos") y corregirlo; se borra cuando la persona empieza una cotización nueva. `null` = trámite en curso.
   */
  ultimaCotizacionId: string | null;
  setPaso: (paso: PasoWizard) => void;
  /** Mezcla un borrador parcial (cada sección se reemplaza completa, no campo a campo). */
  guardarBorrador: (parcial: Partial<BorradorCotizar>) => void;
  /** El formulario terminó en esta cotización: el borrador queda guardado, pero ya no es "en curso". */
  marcarTerminado: (cotizacionId: string) => void;
  reiniciar: () => void;
  /** Empieza de cero solo si el borrador ya produjo una cotización (un trámite a medias no se toca). */
  reiniciarSiTerminado: () => void;
}

export const useCotizarWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      paso: 1,
      borrador: BORRADOR_VACIO,
      ultimaCotizacionId: null,
      setPaso: (paso) => set({ paso }),
      guardarBorrador: (parcial) => set((s) => ({ borrador: { ...s.borrador, ...parcial } })),
      marcarTerminado: (cotizacionId) => set({ ultimaCotizacionId: cotizacionId }),
      reiniciar: () => set({ paso: 1, borrador: BORRADOR_VACIO, ultimaCotizacionId: null }),
      reiniciarSiTerminado: () => {
        if (get().ultimaCotizacionId) get().reiniciar();
      },
    }),
    { name: 'svas.cotizar-wizard', storage: createJSONStorage(() => sessionStorage), version: 1 },
  ),
);

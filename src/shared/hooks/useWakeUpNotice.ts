import { useWakeUpStore } from '../stores/useWakeUpStore';

/** `true` mientras la primera request lleve más de 4 s sin respuesta (arquitectura §4.3). */
export function useWakeUpNotice(): boolean {
  return useWakeUpStore((s) => s.despertando);
}

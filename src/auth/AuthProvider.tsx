import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabase, supabaseConfigurado } from '../shared/lib/supabase';
import type { Rol } from '../shared/types/enums';

/**
 * Sesión con Supabase Auth SOLO para login / refresh / logout (doc conexión
 * §2). Los roles de negocio se leen de `app_metadata.roles` (nunca de
 * `user_metadata`). Todo lo demás va a la API con el access_token.
 */
export type EstadoAuth = 'cargando' | 'anonimo' | 'autenticado';

export interface AuthContextValue {
  estado: EstadoAuth;
  session: Session | null;
  user: User | null;
  roles: Rol[];
  /** Nombre para el avatar (de `user_metadata.full_name`; el perfil completo viene de `GET /usuarios/me`). */
  nombre: string | null;
  signIn: (email: string, password: string) => Promise<{ roles: Rol[] }>;
  signOut: () => Promise<void>;
  /**
   * Cambia la contraseña de quien tiene la sesión abierta. Pide la actual y la comprueba con Supabase
   * antes de cambiarla (así una sesión olvidada abierta no basta para quitarle la cuenta a alguien).
   * Lanza `Error` con un mensaje en lenguaje llano.
   */
  cambiarPassword: (actual: string, nueva: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const ROLES_VALIDOS: readonly Rol[] = ['CLIENTE', 'ASESOR', 'ADMINISTRADOR'];

export function rolesDeSesion(session: Session | null): Rol[] {
  const meta = session?.user.app_metadata as { roles?: unknown } | undefined;
  const lista = Array.isArray(meta?.roles) ? meta.roles : [];
  return lista.filter((r): r is Rol => typeof r === 'string' && (ROLES_VALIDOS as readonly string[]).includes(r));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>(supabaseConfigurado ? 'cargando' : 'anonimo');
  const [session, setSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let activo = true;
    let desuscribir: (() => void) | null = null;

    void getSupabase()
      .then(async (supabase) => {
        const { data } = await supabase.auth.getSession();
        if (!activo) return;
        setSession(data.session);
        setEstado(data.session ? 'autenticado' : 'anonimo');

        const { data: sub } = supabase.auth.onAuthStateChange((evento, nueva) => {
          if (!activo) return;
          setSession(nueva);
          setEstado(nueva ? 'autenticado' : 'anonimo');
          if (evento === 'SIGNED_OUT') queryClient.clear();
        });
        desuscribir = () => sub.subscription.unsubscribe();
      })
      .catch(() => {
        if (activo) setEstado('anonimo');
      });

    return () => {
      activo = false;
      desuscribir?.();
    };
  }, [queryClient]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(traducirErrorAuth(error.message));
    return { roles: rolesDeSesion(data.session) };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigurado) return;
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const cambiarPassword = useCallback(async (actual: string, nueva: string) => {
    const supabase = await getSupabase();
    const { data: sesion } = await supabase.auth.getSession();
    const email = sesion.session?.user.email;
    if (!email) throw new Error('Tu sesión venció. Vuelve a iniciar sesión.');

    // 1) Comprobar la contraseña actual. 2) Cambiarla. Los dos errores se explican por separado.
    const { error: errorActual } = await supabase.auth.signInWithPassword({ email, password: actual });
    if (errorActual) throw new Error(traducirErrorPassword(errorActual, 'actual'));
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) throw new Error(traducirErrorPassword(error, 'nueva'));
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const meta = session?.user.user_metadata as { full_name?: unknown } | undefined;
    return {
      estado,
      session,
      user: session?.user ?? null,
      roles: rolesDeSesion(session),
      nombre: typeof meta?.full_name === 'string' ? meta.full_name : null,
      signIn,
      signOut,
      cambiarPassword,
    };
  }, [estado, session, signIn, signOut, cambiarPassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Errores de Supabase al cambiar la contraseña, en lenguaje llano. Se mira el código y, si no hay, el texto. */
export function traducirErrorPassword(error: { message: string; code?: string }, paso: 'actual' | 'nueva'): string {
  const m = error.message.toLowerCase();
  if (paso === 'actual') {
    if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
    return 'La contraseña actual no es correcta.';
  }
  if (error.code === 'same_password' || m.includes('different from the old')) return 'La nueva contraseña debe ser distinta de la actual.';
  if (error.code === 'weak_password' || m.includes('weak') || m.includes('should contain') || m.includes('known to be')) {
    return 'Esa contraseña es demasiado común o débil. Prueba con una frase más larga, como tres palabras y un número.';
  }
  if (m.includes('at least') || m.includes('too short')) return 'La contraseña es demasiado corta.';
  if (m.includes('reauth')) return 'Por seguridad, cierra sesión, vuelve a entrar y repite el cambio.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  return 'No pudimos cambiar la contraseña. Inténtalo de nuevo.';
}

/** Mensajes de Supabase en lenguaje llano (voz y tono §14). */
function traducirErrorAuth(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (m.includes('email not confirmed')) return 'Tu correo aún no está confirmado.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  if (m.includes('banned') || m.includes('disabled')) return 'Tu usuario está desactivado. Contacta al administrador.';
  return 'No pudimos iniciar sesión. Inténtalo de nuevo.';
}

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase SOLO para sesión (login, refresh, logout).
 * Todo lo demás va a la API NestJS (doc conexión §2). El frontend nunca
 * consulta tablas por PostgREST.
 *
 * La librería se carga con `import()` para que el embudo anónimo no pague
 * sus ~45 KB gzip en el JS inicial (meta < 180 KB, arquitectura §6.2).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurado = Boolean(url && anonKey);

let clientePromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigurado) {
    return Promise.reject(
      new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y complétalo.'),
    );
  }
  clientePromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'svas.auth',
      },
    }),
  );
  return clientePromise;
}

/** Access token vigente o `null` si no hay sesión (o Supabase no está configurado). */
export async function getAccessToken(): Promise<string | null> {
  if (!supabaseConfigurado) return null;
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

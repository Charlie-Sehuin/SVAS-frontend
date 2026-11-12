import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Modo oscuro solo en backoffice (diseño visual §10.1). El embudo siempre va
 * en claro. La preferencia se guarda en localStorage (es una comodidad
 * por dispositivo, no estado de negocio).
 */
export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'svas.theme';

function leerPreferencia(): Theme {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    if (guardado === 'dark' || guardado === 'light') return guardado;
  } catch {
    /* localStorage puede no estar disponible */
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(leerPreferencia);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignorar */
    }
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/**
 * Aplica `data-theme` en <html> solo mientras el layout que lo usa está
 * montado (el backoffice). Al desmontar, vuelve al modo claro.
 */
export function useApplyTheme(enabled: boolean) {
  const { theme } = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    if (enabled && theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    return () => root.removeAttribute('data-theme');
  }, [enabled, theme]);
}

/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Se lee con fs y no con `?raw`: la config de Vitest usa `css: false` y devolvería el archivo vacío.
const leer = (ruta: string) => readFileSync(fileURLToPath(new URL(ruta, import.meta.url)), 'utf8');
const colors = leer('./tokens/colors.css');
const indexCss = leer('../index.css');

/**
 * Guardia de contraste WCAG AA (diseño visual §13): los pares de color que usa la interfaz como texto sobre
 * fondo deben llegar a 4.5:1 en modo claro y en modo oscuro. Lee los mismos archivos CSS que la app, así que
 * si alguien cambia un token y rompe la lectura, esta prueba falla.
 */

type Tokens = Record<string, string>;

/** Variables `--nombre: #rrggbb` de un bloque CSS que empieza en `selector {`. */
function variables(css: string, selector: RegExp): Tokens {
  const bloque = new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
  const out: Tokens = {};
  for (const m of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[m[1]!] = m[2]!.toLowerCase();
  return out;
}

const claro: Tokens = {
  ...variables(colors, /@theme/),
  ...variables(indexCss, /:root/),
};
const oscuro: Tokens = {
  ...claro,
  ...variables(colors, /\[data-theme='dark'\]/),
  ...variables(indexCss, /\[data-theme='dark'\]/),
};

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

function contraste(a: string, b: string): number {
  const [claro_, oscuro_] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro_ + 0.05) / (oscuro_ + 0.05);
}

/** [texto, fondo, dónde se usa] */
const PARES: [string, string, string][] = [
  ['color-ink', 'color-canvas', 'texto de lectura sobre el fondo general'],
  ['color-ink', 'color-surface', 'texto de lectura en tarjetas'],
  ['color-ink-soft', 'color-surface', 'texto secundario en tarjetas'],
  ['color-ink-soft', 'color-canvas', 'texto secundario sobre el fondo'],
  ['color-ink-soft', 'color-surface-muted', 'texto secundario en filas de tabla'],
  ['color-navy-700', 'color-surface', 'títulos y cifras en tarjetas'],
  ['color-navy-700', 'color-canvas', 'títulos de pantalla'],
  ['color-navy-700', 'color-surface-muted', 'cabecera de tablas y botón contorno'],
  ['color-navy-700', 'color-navy-50', 'badge y círculos de icono azul marino'],
  ['color-navy-500', 'color-surface', 'enlaces secundarios y botón fantasma'],
  ['color-navy-500', 'color-canvas', 'botón fantasma sobre el fondo'],
  ['color-brand-600', 'color-surface', 'enlaces de acción'],
  ['color-brand-600', 'color-canvas', 'enlaces de acción sobre el fondo'],
  ['color-brand-700', 'color-brand-50', 'badge de marca'],
  ['color-accent-700', 'color-accent-50', 'badge y tarjeta de la Prueba de Choque'],
  ['color-status-pending', 'color-surface', 'estado pendiente'],
  ['color-status-progress', 'color-surface', 'estado en curso'],
  ['color-status-success', 'color-surface', 'estado correcto'],
  ['color-status-danger', 'color-surface', 'estado de error'],
  ['color-status-neutral', 'color-surface', 'estado neutro'],
  ['color-status-info', 'color-surface', 'estado informativo'],
  ['primary-foreground', 'color-brand-500', 'texto del botón principal'],
  ['accent-foreground', 'color-accent-600', 'texto del botón de la Prueba de Choque'],
  ['destructive-foreground', 'color-status-danger', 'texto del botón destructivo'],
];

describe.each([
  ['modo claro', claro],
  ['modo oscuro', oscuro],
])('contraste en %s', (_nombre, tokens) => {
  it.each(PARES)('%s sobre %s (%s) llega a 4.5:1', (texto, fondo) => {
    const t = tokens[texto];
    const f = tokens[fondo];
    expect(t, `no se encontró el token ${texto}`).toBeDefined();
    expect(f, `no se encontró el token ${fondo}`).toBeDefined();
    const ratio = contraste(t!, f!);
    expect(ratio, `${texto} ${t} sobre ${fondo} ${f} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

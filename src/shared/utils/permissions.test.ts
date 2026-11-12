import { describe, expect, it } from 'vitest';
import { accesoPantalla, canAccessScreen, isReadOnly, rutaInicial } from './permissions';
import { navegacionPara } from '../../app-shell/RoleNavigationConfig';

describe('permissions (doc de dominio §14)', () => {
  it('el anónimo cotiza y compara pero no compra', () => {
    expect(canAccessScreen('cotizar', [])).toBe(true);
    expect(canAccessScreen('pruebaChoque', [])).toBe(true);
    expect(canAccessScreen('compra', [])).toBe(false);
  });

  it('el ADMINISTRADOR ve la cola solo en lectura; el ASESOR no ve tarifas', () => {
    expect(accesoPantalla('colaAsesoria', ['ADMINISTRADOR'])).toBe('lectura');
    expect(isReadOnly('colaAsesoria', ['ADMINISTRADOR'])).toBe(true);
    expect(isReadOnly('colaAsesoria', ['ASESOR'])).toBe(false);
    expect(canAccessScreen('tarifas', ['ASESOR'])).toBe(false);
  });

  it('cada rol aterriza en su inicio', () => {
    expect(rutaInicial(['CLIENTE'])).toBe('/mi-cuenta');
    expect(rutaInicial(['ASESOR'])).toBe('/app');
    expect(rutaInicial([])).toBe('/');
  });

  it('el menú oculta grupos sin ítems para el rol', () => {
    const asesor = navegacionPara(['ASESOR']);
    expect(asesor.map((g) => g.id)).toEqual(['inicio', 'atencion', 'reportes']);
    expect(asesor.find((g) => g.id === 'reportes')?.items.map((i) => i.label)).toEqual(['Mi desempeño']);
    const admin = navegacionPara(['ADMINISTRADOR']);
    expect(admin.map((g) => g.id)).toEqual(['inicio', 'atencion', 'catalogo', 'prueba-choque', 'reportes', 'sistema']);
  });
});

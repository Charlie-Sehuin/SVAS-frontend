import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderConProviders } from '../../../test/render';
import { MoneyValue } from './MoneyValue';
import { StatusBadge } from './StatusBadge';
import { RoleGate } from './RoleGate';
import { DemoLegend, TEXTO_DEMO } from './DemoLegend';

describe('componentes de dominio', () => {
  it('MoneyValue muestra símbolo y cifra, y lo lee en palabras', () => {
    renderConProviders(<MoneyValue value="53.37" size="xl" sufijo="/ mes" sufijoAria="al mes" />);
    const el = screen.getByLabelText('53 dólares con 37 centavos al mes');
    expect(el).toHaveTextContent('USD');
    expect(el).toHaveTextContent('53.37');
    expect(el).toHaveTextContent('/ mes');
  });

  it('StatusBadge siempre lleva texto, nunca solo color', () => {
    renderConProviders(
      <>
        <StatusBadge entity="solicitud" value="EN_ATENCION" />
        <StatusBadge entity="pago" value="RECHAZADO" />
        <StatusBadge entity="cotizacion" value="ESTADO_RARO" />
      </>,
    );
    expect(screen.getByText('En atención')).toBeInTheDocument();
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
    expect(screen.getByText('estado raro')).toBeInTheDocument();
  });

  it('RoleGate oculta por rol (oculto, no deshabilitado)', () => {
    renderConProviders(
      <RoleGate roles={['ASESOR']} fallback={<span>sin permiso</span>}>
        <button>Negociar descuento</button>
      </RoleGate>,
      { roles: ['ADMINISTRADOR'] },
    );
    expect(screen.queryByRole('button', { name: 'Negociar descuento' })).not.toBeInTheDocument();
    expect(screen.getByText('sin permiso')).toBeInTheDocument();
  });

  it('DemoLegend muestra la leyenda RNF-20', () => {
    renderConProviders(<DemoLegend />);
    expect(screen.getByRole('note')).toHaveTextContent(TEXTO_DEMO);
  });
});

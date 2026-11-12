import { Headset } from 'lucide-react';
import { TELEFONO_HREF } from '../../../shared/lib/contacto';
import { TEXTO_USO, type UsoVehiculo } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { useDistritos, useMarcas, useModelos } from '../hooks/useCatalogo';
import type { BorradorCotizar } from '../store/useCotizarWizardStore';

/**
 * Resumen lateral de escritorio (diseño §9.2): "Toyota Corolla 2022 · Particular · Miraflores" con lo ya elegido,
 * y el recuadro "¿Necesitas ayuda? Te llamamos". En móvil no se muestra (una decisión por pantalla).
 */
export function ResumenLateral({ values }: { values: BorradorCotizar }) {
  const marcas = useMarcas();
  const modelos = useModelos(values.vehiculo.marcaId || null);
  const distritos = useDistritos(values.ubicacion.departamento || null, values.ubicacion.provincia || null);

  const marca = marcas.data?.find((m) => m.id === values.vehiculo.marcaId)?.nombre;
  const modelo = modelos.data?.find((m) => m.id === values.vehiculo.modeloId)?.nombre;
  const distrito = distritos.data?.find((d) => d.ubigeo === values.ubicacion.ubigeo)?.distrito;
  const vehiculo = [marca, modelo, values.vehiculo.anio].filter(Boolean).join(' ');
  const uso = values.uso in TEXTO_USO ? TEXTO_USO[values.uso as UsoVehiculo] : '';
  const lineas = [vehiculo, vehiculo ? uso : '', distrito].filter((l): l is string => !!l);

  return (
    <aside aria-label="Resumen de tu cotización" className="hidden space-y-4 lg:block">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Tu cotización</CardTitle>
        </CardHeader>
        <CardContent>
          {lineas.length > 0 ? (
            <ul className="space-y-1 text-ink">
              {lineas.map((l) => (
                <li key={l} className="font-bold first:text-navy-700">
                  {l}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-ink-soft">Aquí verás lo que vas eligiendo.</p>
          )}
        </CardContent>
      </Card>
      <Card className="bg-navy-50">
        <CardContent className="p-4 pt-4 lg:p-5 lg:pt-5">
          <p className="font-bold text-navy-700">¿Necesitas ayuda?</p>
          <p className="mb-3 mt-1 text-small text-ink-soft">Un asesor te acompaña, sin compromiso.</p>
          <Button variant="secondary" size="sm" asChild>
            <a href={TELEFONO_HREF}>
              <Headset aria-hidden /> Te llamamos
            </a>
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}

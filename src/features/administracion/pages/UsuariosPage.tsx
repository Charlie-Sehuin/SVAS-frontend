import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, KeyRound, Plus, UserCheck, UserX } from 'lucide-react';
import { usePerfil } from '../../../auth/useAuth';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { aplicarErroresBackend } from '../../../shared/lib/forms';
import type { FiltroUsuarios } from '../../../shared/types/api';
import type { Usuario } from '../../../shared/types/api/seguridad.types';
import { TEXTO_ROL, type Rol, type RolInterno } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { ConfirmDialog } from '../../../shared/ui/domain/ConfirmDialog';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { Paginacion } from '../../../shared/ui/domain/Paginacion';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useCambiarEstadoUsuario, useCambiarRolUsuario, useCrearUsuario, useUsuarios } from '../hooks/useAdmin';

const TAMANO = 20;
const ROLES_INTERNOS: readonly RolInterno[] = ['ASESOR', 'ADMINISTRADOR'];

/** Usuarios y roles (RF-31, RF-32). Solo ADMINISTRADOR. Crea ASESOR o ADMINISTRADOR; el CLIENTE nace del registro en el embudo. */
export function UsuariosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState<Rol | ''>('');
  const [estado, setEstado] = useState<'' | 'true' | 'false'>('');
  const [pagina, setPagina] = useState(1);
  const [crearAbierto, setCrearAbierto] = useState(false);
  const [cambioRol, setCambioRol] = useState<{ usuario: Usuario; rol: RolInterno } | null>(null);
  const [cambioEstado, setCambioEstado] = useState<Usuario | null>(null);

  const busquedaDiferida = useDebouncedValue(busqueda.trim(), 400);
  const filtros: FiltroUsuarios = {
    pagina,
    tamano: TAMANO,
    ...(busquedaDiferida ? { busqueda: busquedaDiferida } : {}),
    ...(rol ? { rol } : {}),
    ...(estado ? { activo: estado === 'true' } : {}),
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useUsuarios(filtros);
  const { data: yo } = usePerfil();
  const rolMutation = useCambiarRolUsuario();
  const estadoMutation = useCambiarEstadoUsuario();

  const reiniciarPagina = () => setPagina(1);

  return (
    <>
      <PageHeader
        titulo="Usuarios y roles"
        descripcion="Crea asesores y administradores, cambia su rol o desactiva una cuenta. Los clientes se registran solos al comprar."
        accion={
          <Button onClick={() => setCrearAbierto(true)}>
            <Plus aria-hidden /> Crear usuario
          </Button>
        }
      />

      <FiltrosBar>
        <Filtro label="Buscar" className="min-w-56 flex-1">
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              reiniciarPagina();
            }}
            placeholder="Nombre o correo"
            className="h-10"
          />
        </Filtro>
        <Filtro label="Rol">
          <Select
            compact
            value={rol}
            onChange={(e) => {
              setRol(e.target.value as Rol | '');
              reiniciarPagina();
            }}
          >
            <option value="">Todos</option>
            {(Object.keys(TEXTO_ROL) as Rol[]).map((r) => (
              <option key={r} value={r}>
                {TEXTO_ROL[r]}
              </option>
            ))}
          </Select>
        </Filtro>
        <Filtro label="Estado">
          <Select
            compact
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as '' | 'true' | 'false');
              reiniciarPagina();
            }}
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </Select>
        </Filtro>
      </FiltrosBar>

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando usuarios">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <EstadoVacio titulo="No hay usuarios con esos filtros." />
      ) : data ? (
        <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <Table caption="Usuarios">
            <THead>
              <TR>
                <TH>Nombre</TH>
                <TH>Correo</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {data.items.map((u) => {
                const esYo = u.id === yo?.id;
                const esInterno = u.rol !== 'CLIENTE';
                return (
                  <TR key={u.id}>
                    <TD className="font-bold text-ink">
                      {u.nombreCompleto}
                      {esYo ? <span className="ml-2 font-normal text-ink-soft">(tú)</span> : null}
                    </TD>
                    <TD>{u.email}</TD>
                    <TD>
                      {esInterno && !esYo ? (
                        <Select
                          compact
                          aria-label={`Rol de ${u.nombreCompleto}`}
                          value={u.rol}
                          className="min-w-40"
                          onChange={(e) => setCambioRol({ usuario: u, rol: e.target.value as RolInterno })}
                        >
                          {ROLES_INTERNOS.map((r) => (
                            <option key={r} value={r}>
                              {TEXTO_ROL[r]}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        TEXTO_ROL[u.rol]
                      )}
                    </TD>
                    <TD>
                      <StatusBadge entity="usuario" value={u.activo ? 'ACTIVO' : 'INACTIVO'} />
                    </TD>
                    <TD className="text-right">
                      {esYo ? (
                        <span className="text-ink-soft">—</span>
                      ) : (
                        <Button
                          variant={u.activo ? 'outlineNavy' : 'secondary'}
                          size="sm"
                          onClick={() => setCambioEstado(u)}
                        >
                          {u.activo ? <UserX aria-hidden /> : <UserCheck aria-hidden />}
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Paginacion pagina={data.pagina} tamano={data.tamano} total={data.total} onChange={setPagina} />
        </div>
      ) : null}

      <CrearUsuarioDialog open={crearAbierto} onOpenChange={setCrearAbierto} />

      <ConfirmDialog
        open={!!cambioRol}
        onOpenChange={(o) => !o && setCambioRol(null)}
        destructivo={false}
        titulo="Cambiar rol"
        descripcion={
          cambioRol ? (
            <>
              <strong>{cambioRol.usuario.nombreCompleto}</strong> pasará a ser {TEXTO_ROL[cambioRol.rol].toLowerCase()}. El cambio
              rige desde su siguiente petición.
            </>
          ) : null
        }
        confirmarTexto="Cambiar rol"
        loading={rolMutation.isPending}
        onConfirm={() => {
          if (!cambioRol) return;
          rolMutation.mutate(
            { id: cambioRol.usuario.id, rol: cambioRol.rol },
            {
              onSuccess: () => {
                SuccessToast('Rol actualizado');
                setCambioRol(null);
              },
              onError: (e) => {
                ErrorToast(e);
                setCambioRol(null);
              },
            },
          );
        }}
      />

      <ConfirmDialog
        open={!!cambioEstado}
        onOpenChange={(o) => !o && setCambioEstado(null)}
        destructivo={!!cambioEstado?.activo}
        titulo={cambioEstado?.activo ? 'Desactivar usuario' : 'Activar usuario'}
        descripcion={
          cambioEstado ? (
            cambioEstado.activo ? (
              <>
                <strong>{cambioEstado.nombreCompleto}</strong> no podrá iniciar sesión ni usar su sesión actual. Puedes volver a
                activarlo cuando quieras.
              </>
            ) : (
              <>
                <strong>{cambioEstado.nombreCompleto}</strong> podrá iniciar sesión de nuevo.
              </>
            )
          ) : null
        }
        confirmarTexto={cambioEstado?.activo ? 'Desactivar' : 'Activar'}
        loading={estadoMutation.isPending}
        onConfirm={() => {
          if (!cambioEstado) return;
          estadoMutation.mutate(
            { id: cambioEstado.id, activo: !cambioEstado.activo },
            {
              onSuccess: () => {
                SuccessToast(cambioEstado.activo ? 'Usuario desactivado' : 'Usuario activado');
                setCambioEstado(null);
              },
              onError: (e) => {
                ErrorToast(e);
                setCambioEstado(null);
              },
            },
          );
        }}
      />
    </>
  );
}

/* ───────────── Crear usuario ───────────── */

const esquema = z.object({
  email: z.string().trim().min(1, 'Escribe el correo').email('Ese correo no parece válido').max(254, 'El correo es demasiado largo'),
  nombreCompleto: z.string().trim().min(3, 'Escribe el nombre completo').max(160, 'El nombre no puede pasar de 160 caracteres'),
  rol: z.enum(['ASESOR', 'ADMINISTRADOR']),
});
type Valores = z.infer<typeof esquema>;

function CrearUsuarioDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const crear = useCrearUsuario();
  const [creado, setCreado] = useState<{ usuario: Usuario; contrasena: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const form = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { email: '', nombreCompleto: '', rol: 'ASESOR' } });

  const cerrar = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      form.reset();
      setCreado(null);
      setCopiado(false);
    }
  };

  const onSubmit = form.handleSubmit((v) =>
    crear.mutate(v, {
      onSuccess: (r) => setCreado({ usuario: r.usuario, contrasena: r.contrasenaTemporal }),
      onError: (e) => {
        if (!aplicarErroresBackend(e, form.setError, ['email', 'nombreCompleto', 'rol'])) ErrorToast(e);
      },
    }),
  );

  const copiar = async () => {
    if (!creado) return;
    try {
      await navigator.clipboard.writeText(creado.contrasena);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el navegador pudo negar el portapapeles: la contraseña sigue visible para copiarla a mano */
    }
  };

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent size="sm">
        {creado ? (
          <>
            <DialogHeader>
              <DialogTitle>Usuario creado</DialogTitle>
              <DialogDescription>
                {creado.usuario.nombreCompleto} ya puede iniciar sesión con {creado.usuario.email}.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div role="alert" className="mb-3 rounded-lg bg-status-warning/15 p-3 text-small text-ink">
                Esta contraseña temporal se muestra <strong>una sola vez</strong>. Cópiala y envíasela por un canal privado. No la
                guardamos. La persona debe cambiarla al entrar, desde su menú de cuenta → <strong>Cambiar contraseña</strong>.
              </div>
              <p className="mb-1 flex items-center gap-1.5 text-small font-bold text-navy-700">
                <KeyRound className="size-4" aria-hidden /> Contraseña temporal
              </p>
              <div className="flex items-center gap-2">
                <code className="flex h-12 flex-1 select-all items-center rounded-lg border border-line bg-surface-muted px-3 font-mono text-base">
                  {creado.contrasena}
                </code>
                <Button variant="outlineNavy" size="icon" onClick={() => void copiar()} aria-label="Copiar contraseña">
                  {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
                </Button>
              </div>
              <p aria-live="polite" className="mt-1 h-5 text-small text-status-success">
                {copiado ? 'Copiada' : ''}
              </p>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => cerrar(false)}>Listo, ya la copié</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription>Se crea con una contraseña temporal que verás al terminar.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Field label="Nombre completo" error={form.formState.errors.nombreCompleto?.message} required>
                {(p) => <Input {...p} autoComplete="off" {...form.register('nombreCompleto')} />}
              </Field>
              <Field label="Correo" error={form.formState.errors.email?.message} required>
                {(p) => <Input {...p} type="email" inputMode="email" autoComplete="off" {...form.register('email')} />}
              </Field>
              <Field label="Rol" error={form.formState.errors.rol?.message} required>
                {(p) => (
                  <Select {...p} {...form.register('rol')}>
                    {ROLES_INTERNOS.map((r) => (
                      <option key={r} value={r}>
                        {TEXTO_ROL[r]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outlineNavy" onClick={() => cerrar(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={crear.isPending}>
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

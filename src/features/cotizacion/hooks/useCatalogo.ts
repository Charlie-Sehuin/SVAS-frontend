import { useQuery } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import { STALE } from '../../../shared/lib/query-client';
import * as catalogo from '../api/catalogo.api';

/** `GET /catalogo/campos`: el catálogo manda la UI (RF-02). staleTime 10 min. */
export const useCamposCatalogo = () =>
  useQuery({ queryKey: qk.catalogo.campos, queryFn: catalogo.obtenerCampos, staleTime: STALE.catalogo });

/* Vehículo en cascada: marca → modelo → año. staleTime 1 h (cambian por seed/admin). */
export const useMarcas = () =>
  useQuery({ queryKey: qk.catalogo.marcas, queryFn: catalogo.listarMarcas, staleTime: STALE.catalogoVehiculos });

export const useModelos = (marcaId: string | null) =>
  useQuery({
    queryKey: qk.catalogo.modelos(marcaId ?? ''),
    queryFn: () => catalogo.listarModelos(marcaId!),
    enabled: !!marcaId,
    staleTime: STALE.catalogoVehiculos,
  });

export const useAnios = (modeloId: string | null) =>
  useQuery({
    queryKey: qk.catalogo.anios(modeloId ?? ''),
    queryFn: () => catalogo.listarAnios(modeloId!),
    enabled: !!modeloId,
    staleTime: STALE.catalogoVehiculos,
  });

/* Ubicación en cascada: departamento → provincia → distrito (ubigeo de 6 dígitos). */
export const useDepartamentos = () =>
  useQuery({ queryKey: qk.catalogo.departamentos, queryFn: catalogo.listarDepartamentos, staleTime: STALE.catalogoVehiculos });

export const useProvincias = (departamento: string | null) =>
  useQuery({
    queryKey: qk.catalogo.provincias(departamento ?? ''),
    queryFn: () => catalogo.listarProvincias(departamento!),
    enabled: !!departamento,
    staleTime: STALE.catalogoVehiculos,
  });

export const useDistritos = (departamento: string | null, provincia: string | null) =>
  useQuery({
    queryKey: qk.catalogo.distritos(departamento ?? '', provincia ?? ''),
    queryFn: () => catalogo.listarDistritos(departamento!, provincia!),
    enabled: !!departamento && !!provincia,
    staleTime: STALE.catalogoVehiculos,
  });

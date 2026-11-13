# svas-frontend — SeguroSimple

SPA del Sistema de Venta Autónoma de Seguros. React 18 + TypeScript + Vite + Tailwind 4 +
TanStack Query 5 + Zustand + React Router 6.

> **Repos.** Este repo es solo el frontend. El backend y la documentación del proyecto están en
> [SVAS](https://github.com/Charlie-Sehuin/SVAS). Los docs que guían este código viven en su carpeta `docs/`:
> [arquitectura del frontend](https://github.com/Charlie-Sehuin/SVAS/blob/main/docs/arquitectura-frontend-seguro-simple.md),
> [diseño visual](https://github.com/Charlie-Sehuin/SVAS/blob/main/docs/diseno-visual-seguro-simple.md),
> [contrato frontend ↔ backend](https://github.com/Charlie-Sehuin/SVAS/blob/main/docs/contexto-frontend-backend-conexion-seguro-simple.md) y
> [guía de tarifas y pesos](https://github.com/Charlie-Sehuin/SVAS/blob/main/docs/guia-tarifas-pesos.md).

## Levantar en local

```powershell
git clone https://github.com/Charlie-Sehuin/SVAS-frontend.git svas-frontend
cd svas-frontend
npm ci
Copy-Item .env.example .env     # y completa VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev                     # http://localhost:5173
```

El backend local corre en `http://localhost:3000/api/v1` (`VITE_API_URL`). Para apuntar a
Railway: `VITE_API_URL=https://svas-production.up.railway.app/api/v1`.

Sin backend: `VITE_MSW=true` en `.env` activa los mocks de `src/test/msw/handlers.ts`
(primero `npx msw init public --save`, una sola vez).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | oxlint |
| `npm test` | Vitest + Testing Library + MSW |
| `npm run build` | Build de producción en `dist/` |

## Estructura

```
src/
├── app-shell/       PublicLayout (embudo) · BackofficeLayout (sidebar por rol) · RoleNavigationConfig
├── auth/            AuthProvider (Supabase solo sesión) · RoleGuard · LoginPage
├── design-system/   tokens (colors.css, typography.css) · ThemeProvider (oscuro solo backoffice)
├── shared/
│   ├── lib/         api-client (ky + Bearer / X-Cotizacion-Token + ApiError) · query-client · query-keys · format · supabase
│   ├── stores/      useCotizacionTokenStore (sessionStorage) · useWakeUpStore
│   ├── types/       enums · api/* (espejo 1:1 de los DTOs; montos como string)
│   ├── ui/          componentes base estilo shadcn · ui/domain (MoneyValue, StatusBadge, toasts, RoleGate, DemoLegend…)
│   └── utils/       permissions (matriz rol × pantalla)
├── features/        landing · administracion (Ola 0) · cotizacion (catálogo y selectores) · (planes, prueba-choque, compra, … por olas)
├── router.tsx       todas las rutas del doc §6.2; las no construidas muestran <PantallaPendiente>
└── test/            setup de Vitest, handlers MSW, renderConProviders
```

## Reglas que no se negocian

- **El frontend no calcula dinero**: ni prima mensual, ni recargo, ni efecto de la suma asegurada. Solo formatea (`<MoneyValue>`).
- **Ningún hex directo** en componentes: solo tokens (`bg-brand-500`, `text-navy-700`, `bg-canvas`…).
- **Un solo botón `primary` por pantalla**; turquesa (`accent`) solo para la Prueba de Choque.
- **Color nunca solo**: todo estado o nivel lleva texto (`<StatusBadge>`).
- **Mensajes del backend tal cual**, con el `correlationId` copiable (`ErrorToast`). `warning` = toast ámbar, la operación sí se ejecutó.
- **Token de cotización** solo en sessionStorage.
- Tipos en `shared/types/api` copiados de los DTOs del backend; prohibido `any`.

## Despliegue en Render

Sitio estático de Render, configurado en `render.yaml` (Blueprint). Las cabeceras de seguridad y la política CSP
(solo permite `connect-src` a la API de Railway y a Supabase) están ahí; `vercel.json` queda como alternativa.

1. En Render: **New → Blueprint** → elegir este repo (`SVAS-frontend`, rama `main`). Render lee `render.yaml`.
2. Pide dos valores (los demás ya vienen en el archivo). Cópialos de tu `.env` local:
   `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. No son secretos (la anon key es pública por diseño).
3. Cuando termine el primer despliegue, Render da la URL (`https://svas-frontend.onrender.com` o similar).
4. En Railway (servicio del backend → Variables) pon `FRONTEND_URL` con esa URL **sin barra final** y deja que se
   redespliegue: el backend solo acepta (CORS) ese origen y la usa para armar los enlaces de retoma y de compra.
5. Abre la URL de Render y prueba: la portada, iniciar sesión y cotizar un vehículo.

Las variables `VITE_*` se leen al **construir**: si las cambias, hay que volver a desplegar (Manual Deploy).
Si cambia el dominio del backend, también hay que cambiarlo en `connect-src` dentro de `render.yaml`.

import { Outlet } from 'react-router-dom';
import { useApplyTheme } from '../design-system/ThemeProvider';
import { DemoLegend } from '../shared/ui/domain/DemoLegend';
import { WakeUpBanner } from '../shared/ui/domain/WakeUpBanner';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Layout del asesor y el administrador (arquitectura §6.3): sidebar por rol + topbar; modo oscuro disponible. */
export function BackofficeLayout() {
  useApplyTheme(true);
  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <WakeUpBanner />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
        <DemoLegend />
      </div>
    </div>
  );
}

import { NavSidebar } from '@/components/NavSidebar';
import { ProtectedRouteGuard } from '@/components/ProtectedRouteGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRouteGuard>
      <div className="shell">
        <NavSidebar />
        <main id="main-content" className="main">
          {children}
        </main>
      </div>
    </ProtectedRouteGuard>
  );
}
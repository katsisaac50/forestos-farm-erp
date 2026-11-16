import { NavSidebar } from '@/components/NavSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <NavSidebar />
      <main id="main-content" className="main">
        {children}
      </main>
    </div>
  );
}
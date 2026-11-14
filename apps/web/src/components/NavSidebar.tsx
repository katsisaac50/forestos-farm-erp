'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  Compass,
  Database,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Target,
  Trees,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getData } from '@/lib/api';

type User = { id: string; email: string; role: string };
type NavItem = { href: string; label: string };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/executive', label: 'Executive intelligence' },
      { href: '/command-centre', label: 'Farm command centre' },
      { href: '/insights', label: 'Insights' },
      { href: '/management-intelligence', label: 'Management intelligence' },
      { href: '/operations-intelligence', label: 'Operations intelligence' },
    ],
  },
  {
    id: 'field',
    label: 'Plantations & field',
    icon: Sprout,
    items: [
      { href: '/plantations', label: 'Plantations' },
      { href: '/plantation-intelligence', label: 'Plantation intelligence' },
      { href: '/growth', label: 'Growth samples' },
      { href: '/harvest-planning', label: 'Harvest planning' },
      { href: '/regeneration', label: 'Replanting & regeneration' },
      { href: '/nursery', label: 'Nursery & seedlings' },
      { href: '/field-logs', label: 'Field logs' },
      { href: '/field-work', label: 'Field work' },
      { href: '/field-inspections', label: 'Field inspections' },
      { href: '/inspections', label: 'Inspections' },
      { href: '/farm-map', label: 'Farm map' },
      { href: '/field-navigation', label: 'Field navigation' },
      { href: '/field-verification', label: 'Field verification' },
      { href: '/photo-evidence', label: 'Photo evidence' },
    ],
  },
  {
    id: 'apiary',
    label: 'Apiary',
    icon: Compass,
    items: [{ href: '/apiary', label: 'Apiary' }],
  },
  {
    id: 'workforce',
    label: 'Workforce',
    icon: Users,
    items: [
      { href: '/workforce', label: 'Workforce & labour' },
      { href: '/worker-accountability', label: 'Worker accountability' },
      { href: '/tasks', label: 'Tasks' },
      { href: '/corrective-actions', label: 'Corrective actions' },
      { href: '/sops', label: 'SOPs & verification' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Wrench,
    items: [
      { href: '/inventory', label: 'Inventory' },
      { href: '/inventory-control', label: 'Central inventory' },
      { href: '/procurement', label: 'Procurement' },
      { href: '/maintenance', label: 'Maintenance & assets' },
      { href: '/sales', label: 'Sales' },
      { href: '/integration-workflows', label: 'Integration workflows' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Wallet,
    items: [
      { href: '/finance', label: 'Finance ledger' },
      { href: '/cashflow', label: 'Cash flow & capital' },
      { href: '/cost-intelligence', label: 'Cost intelligence' },
      { href: '/monthly-financial-report', label: 'Monthly financial report' },
      { href: '/monthly-financial-close', label: 'Monthly financial close' },
      { href: '/budget-execution', label: 'Budget execution' },
      { href: '/resource-planning', label: 'Resource planning' },
      { href: '/investment', label: 'Investment analysis' },
      { href: '/capital-allocation', label: 'Capital allocation' },
      { href: '/capital-spend-verification', label: 'Capital spend verification' },
      { href: '/reinvestment-intelligence', label: 'Reinvestment intelligence' },
      { href: '/reinvestment-decision-engine', label: 'Reinvestment decision engine' },
    ],
  },
  {
    id: 'governance',
    label: 'Financial governance',
    icon: ShieldCheck,
    items: [
      { href: '/financial-governance', label: 'Governance scorecard' },
      { href: '/financial-exceptions', label: 'Financial exceptions' },
      { href: '/financial-discrepancies', label: 'Financial discrepancies' },
      { href: '/financial-investigations', label: 'Investigations' },
      { href: '/financial-investigation-cases', label: 'Investigation cases' },
      { href: '/financial-action-centre', label: 'Action centre' },
      { href: '/financial-evidence', label: 'Evidence register' },
      { href: '/case-evidence', label: 'Case evidence' },
      { href: '/financial-audit-trail', label: 'Audit trail' },
      { href: '/financial-escalations', label: 'Escalation centre' },
      { href: '/financial-control-report', label: 'Control management report' },
      { href: '/financial-control-performance', label: 'Control performance' },
      { href: '/financial-reconciliation', label: 'Reconciliation' },
      { href: '/statement-matching', label: 'Statement matching' },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: Target,
    items: [
      { href: '/performance-strategy', label: 'Performance strategy' },
      { href: '/performance-intelligence', label: 'Automated KPI integration' },
    ],
  },
  {
    id: 'risk',
    label: 'Risk & alerts',
    icon: ShieldAlert,
    items: [
      { href: '/risk-management', label: 'Risk management' },
      { href: '/alert-center', label: 'Alerts & escalation' },
    ],
  },
  {
    id: 'recovery',
    label: 'Recovery & governance',
    icon: RefreshCw,
    items: [
      { href: '/recovery-alerts', label: 'Recovery alerts' },
      { href: '/recovery-escalations', label: 'Reminders & escalation' },
      { href: '/recovery-scheduler', label: 'Scheduler status' },
      { href: '/recovery-delivery', label: 'Recovery delivery' },
      { href: '/recovery-provider-health', label: 'Provider health' },
      { href: '/recovery-governance', label: 'Recovery governance' },
      { href: '/evidence-recovery-governance', label: 'Evidence recovery governance' },
      { href: '/evidence-storage-operations', label: 'Evidence storage ops' },
      { href: '/notification-policies', label: 'Notification policies' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: Database,
    items: [
      { href: '/audit', label: 'Audit trail' },
      { href: '/data-integrity', label: 'Data integrity' },
      { href: '/backup-continuity', label: 'Backup continuity' },
      { href: '/organizations', label: 'Organizations' },
    ],
  },
];

const DESKTOP_QUERY = '(min-width: 1025px)';
const STORAGE_KEY = 'forestos_nav_open_groups';
const MOBILE_DEFAULT_GROUPS = ['overview'];
const DESKTOP_DEFAULT_GROUPS = NAV_GROUPS.map(g => g.id);

function matchGroupForPath(pathname: string): string | undefined {
  let best: { id: string; len: number } | undefined;
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      const matched =
        item.href === '/'
          ? pathname === '/'
          : pathname === item.href || pathname.startsWith(item.href + '/');
      if (matched && (!best || item.href.length > best.len)) {
        best = { id: g.id, len: item.href.length };
      }
    }
  }
  return best?.id;
}

export function NavSidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(DESKTOP_DEFAULT_GROUPS);
  const [hydrated, setHydrated] = useState(false);
  const [hasUserToggled, setHasUserToggled] = useState(false);

  const drawerRef = useRef<HTMLElement | null>(null);
  const lastFocusedBeforeOpen = useRef<Element | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  /* ---------- Auth: fetch once on mount ---------- */
  useEffect(() => {
    const hasToken = !!localStorage.getItem('forestos_token');
    setAuthed(hasToken);
    if (!hasToken) return;
    getData<User>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  /* ---------- Hydrate: read stored groups + track desktop/mobile ---------- */
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onMqChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    mq.addEventListener('change', onMqChange);

    let initial: string[] = mq.matches ? DESKTOP_DEFAULT_GROUPS : MOBILE_DEFAULT_GROUPS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (id): id is string =>
              typeof id === 'string' && NAV_GROUPS.some(g => g.id === id),
          );
          if (valid.length) initial = valid;
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setOpenGroups(initial);
    setHydrated(true);

    return () => mq.removeEventListener('change', onMqChange);
  }, []);

  useEffect(() => {
    if (!hasUserToggled || !hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      /* quota */
    }
  }, [openGroups, hasUserToggled, hydrated]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const activeId = matchGroupForPath(pathnameRef.current);
    if (!activeId) return;
    setOpenGroups(prev => (prev.includes(activeId) ? prev : [...prev, activeId]));
  }, [mobileOpen]);

  /* ---------- Scroll lock + focus trap ---------- */
  useEffect(() => {
    if (!mobileOpen) return;

    lastFocusedBeforeOpen.current = document.activeElement;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const raf = requestAnimationFrame(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const root = drawerRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => el.offsetParent !== null);
      if (!focusables.length) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      html.style.overflow = '';
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
      if (lastFocusedBeforeOpen.current instanceof HTMLElement) {
        lastFocusedBeforeOpen.current.focus();
      }
    };
  }, [mobileOpen]);

  const isActive = useCallback(
    (href: string) =>
      href === '/'
        ? pathname === '/'
        : pathname === href || pathname.startsWith(href + '/'),
    [pathname],
  );

  const toggleGroup = useCallback((id: string) => {
    setHasUserToggled(true);
    setOpenGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }, []);

  function signOut() {
    localStorage.removeItem('forestos_token');
    localStorage.removeItem('forestos_user');
    localStorage.removeItem('forestos_organization_id');
    localStorage.removeItem('forestos_active_organization');
    window.location.href = '/login';
  }

  return (
    <>
      <a href="#main-content" className="skipLink">Skip to main content</a>

      <header className="mobileBar">
        <button
          type="button"
          className="hamburger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="nav-drawer"
          onClick={() => setMobileOpen(v => !v)}
        >
          <span className={`hamburgerIcon ${mobileOpen ? 'open' : ''}`} />
        </button>
        <Link href="/" className="mobileBrand" onClick={() => setMobileOpen(false)}>
          <Trees className="brandMark" size={18} strokeWidth={2} aria-hidden />
          <span>ForestOS</span>
        </Link>
      </header>

      {mobileOpen && (
        <div className="navOverlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        id="nav-drawer"
        ref={drawerRef}
        className={`sidebar ${mobileOpen ? 'open' : ''}`}
        aria-label="Primary navigation"
      >
        <Link href="/" className="brand" onClick={() => setMobileOpen(false)}>
          <Trees className="brandMark" size={22} strokeWidth={2} aria-hidden />
          <span>ForestOS</span>
        </Link>
        <div className="sub">Masulita Green Farms</div>

        <nav className="nav" aria-label="Main">
          {NAV_GROUPS.map(group => {
            const open = openGroups.includes(group.id);
            const hasActive = group.items.some(i => isActive(i.href));
            return (
              <div key={group.id} className={`navGroup ${open ? 'open' : ''}`}>
                <button
                  type="button"
                  className={`navGroupHeader ${hasActive ? 'hasActive' : ''}`}
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  aria-controls={`navgroup-${group.id}`}
                >
                  <span className="navGroupLabel">
                    <group.icon className="navIcon" size={16} strokeWidth={1.75} aria-hidden />
                    <span className="navGroupText">{group.label}</span>
                  </span>
                  <span className="navGroupMeta">
                    {hasActive && !open && (
                      <span className="navActiveDot" aria-label="Contains current page" />
                    )}
                    <ChevronDown className="navChevron" size={14} strokeWidth={2} aria-hidden />
                  </span>
                </button>
                <div
                  id={`navgroup-${group.id}`}
                  className="navGroupBody"
                  role="group"
                  aria-label={group.label}
                >
                  {group.items.map(item => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`navLink ${active ? 'active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="navFooter">
          {authed && user && (
            <div className="navUser" title={user.email}>
              <span className="navUserEmail">{user.email}</span>
              {user.role && <span className="navUserRole">{user.role}</span>}
            </div>
          )}
          {authed ? (
            <button type="button" className="btn navSignOut" onClick={signOut}>
              Sign out
            </button>
          ) : (
            <Link href="/login" className="btn navSignOut">Sign in</Link>
          )}
        </div>
      </aside>
    </>
  );
}



// 'use client';

// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import {
//   AlertTriangle,
//   Archive,
//   BarChart3,
//   Bell,
//   Briefcase,
//   ChevronDown,
//   ClipboardCheck,
//   Compass,
//   CreditCard,
//   Database,
//   FileSearch,
//   FileText,
//   Gauge,
//   Hammer,
//   Home,
//   LayoutDashboard,
//   MapPin,
//   Package,
//   PieChart,
//   RefreshCw,
//   ShieldAlert,
//   ShieldCheck,
//   ShoppingCart,
//   Sprout,
//   Target,
//   Trees,
//   Truck,
//   Users,
//   Wallet,
//   Wrench,
//   type LucideIcon,
// } from 'lucide-react';
// import { useCallback, useEffect, useRef, useState } from 'react';
// import { getData } from '@/lib/api';

// type User = { id: string; email: string; role: string };
// type NavItem = { href: string; label: string };
// type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

// const NAV_GROUPS: NavGroup[] = [
//   {
//     id: 'overview',
//     label: 'Overview',
//     icon: LayoutDashboard,
//     items: [
//       { href: '/', label: 'Dashboard' },
//       { href: '/executive', label: 'Executive intelligence' },
//       { href: '/command-centre', label: 'Farm command centre' },
//       { href: '/insights', label: 'Insights' },
//       { href: '/management-intelligence', label: 'Management intelligence' },
//       { href: '/operations-intelligence', label: 'Operations intelligence' },
//     ],
//   },
//   {
//     id: 'field',
//     label: 'Plantations & field',
//     icon: Sprout,
//     items: [
//       { href: '/plantations', label: 'Plantations' },
//       { href: '/plantation-intelligence', label: 'Plantation intelligence' },
//       { href: '/growth', label: 'Growth samples' },
//       { href: '/harvest-planning', label: 'Harvest planning' },
//       { href: '/regeneration', label: 'Replanting & regeneration' },
//       { href: '/nursery', label: 'Nursery & seedlings' },
//       { href: '/field-logs', label: 'Field logs' },
//       { href: '/field-work', label: 'Field work' },
//       { href: '/field-inspections', label: 'Field inspections' },
//       { href: '/inspections', label: 'Inspections' },
//       { href: '/farm-map', label: 'Farm map' },
//       { href: '/field-navigation', label: 'Field navigation' },
//       { href: '/field-verification', label: 'Field verification' },
//       { href: '/photo-evidence', label: 'Photo evidence' },
//     ],
//   },
//   {
//     id: 'apiary',
//     label: 'Apiary',
//     icon: Compass,
//     items: [{ href: '/apiary', label: 'Apiary' }],
//   },
//   {
//     id: 'workforce',
//     label: 'Workforce',
//     icon: Users,
//     items: [
//       { href: '/workforce', label: 'Workforce & labour' },
//       { href: '/worker-accountability', label: 'Worker accountability' },
//       { href: '/tasks', label: 'Tasks' },
//       { href: '/corrective-actions', label: 'Corrective actions' },
//       { href: '/sops', label: 'SOPs & verification' },
//     ],
//   },
//   {
//     id: 'operations',
//     label: 'Operations',
//     icon: Wrench,
//     items: [
//       { href: '/inventory', label: 'Inventory' },
//       { href: '/inventory-control', label: 'Central inventory' },
//       { href: '/procurement', label: 'Procurement' },
//       { href: '/maintenance', label: 'Maintenance & assets' },
//       { href: '/sales', label: 'Sales' },
//       { href: '/integration-workflows', label: 'Integration workflows' },
//     ],
//   },
//   {
//     id: 'finance',
//     label: 'Finance',
//     icon: Wallet,
//     items: [
//       { href: '/finance', label: 'Finance ledger' },
//       { href: '/cashflow', label: 'Cash flow & capital' },
//       { href: '/cost-intelligence', label: 'Cost intelligence' },
//       { href: '/monthly-financial-report', label: 'Monthly financial report' },
//       { href: '/monthly-financial-close', label: 'Monthly financial close' },
//       { href: '/budget-execution', label: 'Budget execution' },
//       { href: '/resource-planning', label: 'Resource planning' },
//       { href: '/investment', label: 'Investment analysis' },
//       { href: '/capital-allocation', label: 'Capital allocation' },
//       { href: '/capital-spend-verification', label: 'Capital spend verification' },
//       { href: '/reinvestment-intelligence', label: 'Reinvestment intelligence' },
//       { href: '/reinvestment-decision-engine', label: 'Reinvestment decision engine' },
//     ],
//   },
//   {
//     id: 'governance',
//     label: 'Financial governance',
//     icon: ShieldCheck,
//     items: [
//       { href: '/financial-governance', label: 'Governance scorecard' },
//       { href: '/financial-exceptions', label: 'Financial exceptions' },
//       { href: '/financial-discrepancies', label: 'Financial discrepancies' },
//       { href: '/financial-investigations', label: 'Investigations' },
//       { href: '/financial-investigation-cases', label: 'Investigation cases' },
//       { href: '/financial-action-centre', label: 'Action centre' },
//       { href: '/financial-evidence', label: 'Evidence register' },
//       { href: '/case-evidence', label: 'Case evidence' },
//       { href: '/financial-audit-trail', label: 'Audit trail' },
//       { href: '/financial-escalations', label: 'Escalation centre' },
//       { href: '/financial-control-report', label: 'Control management report' },
//       { href: '/financial-control-performance', label: 'Control performance' },
//       { href: '/financial-reconciliation', label: 'Reconciliation' },
//       { href: '/statement-matching', label: 'Statement matching' },
//     ],
//   },
//   {
//     id: 'performance',
//     label: 'Performance',
//     icon: Target,
//     items: [
//       { href: '/performance-strategy', label: 'Performance strategy' },
//       { href: '/performance-intelligence', label: 'Automated KPI integration' },
//     ],
//   },
//   {
//     id: 'risk',
//     label: 'Risk & alerts',
//     icon: ShieldAlert,
//     items: [
//       { href: '/risk-management', label: 'Risk management' },
//       { href: '/alert-center', label: 'Alerts & escalation' },
//     ],
//   },
//   {
//     id: 'recovery',
//     label: 'Recovery & governance',
//     icon: RefreshCw,
//     items: [
//       { href: '/recovery-alerts', label: 'Recovery alerts' },
//       { href: '/recovery-escalations', label: 'Reminders & escalation' },
//       { href: '/recovery-scheduler', label: 'Scheduler status' },
//       { href: '/recovery-delivery', label: 'Recovery delivery' },
//       { href: '/recovery-provider-health', label: 'Provider health' },
//       { href: '/recovery-governance', label: 'Recovery governance' },
//       { href: '/evidence-recovery-governance', label: 'Evidence recovery governance' },
//       { href: '/evidence-storage-operations', label: 'Evidence storage ops' },
//       { href: '/notification-policies', label: 'Notification policies' },
//     ],
//   },
//   {
//     id: 'platform',
//     label: 'Platform',
//     icon: Database,
//     items: [
//       { href: '/audit', label: 'Audit trail' },
//       { href: '/data-integrity', label: 'Data integrity' },
//       { href: '/backup-continuity', label: 'Backup continuity' },
//       { href: '/organizations', label: 'Organizations' },
//     ],
//   },
// ];

// const DESKTOP_QUERY = '(min-width: 1025px)';
// const STORAGE_KEY = 'forestos_nav_open_groups';
// const MOBILE_DEFAULT_GROUPS = ['overview'];
// const DESKTOP_DEFAULT_GROUPS = NAV_GROUPS.map(g => g.id);

// function matchGroupForPath(pathname: string): string | undefined {
//   let best: { id: string; len: number } | undefined;
//   for (const g of NAV_GROUPS) {
//     for (const item of g.items) {
//       const matched =
//         item.href === '/'
//           ? pathname === '/'
//           : pathname === item.href || pathname.startsWith(item.href + '/');
//       if (matched && (!best || item.href.length > best.len)) {
//         best = { id: g.id, len: item.href.length };
//       }
//     }
//   }
//   return best?.id;
// }

// export function NavSidebar({ variant = 'on' }: { variant?: 'on' | 'off' }) {
//   const pathname = usePathname();
//   const [user, setUser] = useState<User | null>(null);
//   const [authed, setAuthed] = useState(false);
//   const [mobileOpen, setMobileOpen] = useState(false);
//   const [openGroups, setOpenGroups] = useState<string[]>(DESKTOP_DEFAULT_GROUPS);
//   const [hydrated, setHydrated] = useState(false);
//   const [hasUserToggled, setHasUserToggled] = useState(false);

//   const drawerRef = useRef<HTMLElement | null>(null);
//   const lastFocusedBeforeOpen = useRef<Element | null>(null);
//   const pathnameRef = useRef(pathname);

//   useEffect(() => {
//     pathnameRef.current = pathname;
//   }, [pathname]);

//   /* ---------- Auth: read token, then confirm via /auth/me ---------- */
//   useEffect(() => {
//     const hasToken = !!localStorage.getItem('forestos_token');
//     setAuthed(hasToken);
//     if (!hasToken) return;
//     getData<User>('/auth/me').then(setUser).catch(() => setUser(null));
//   }, [pathname]);

//   /* ---------- Hydrate: read stored groups + track desktop/mobile ---------- */
//   useEffect(() => {
//     const mq = window.matchMedia(DESKTOP_QUERY);
//     const onMqChange = (e: MediaQueryListEvent) => {
//       if (e.matches) setMobileOpen(false);
//     };
//     mq.addEventListener('change', onMqChange);

//     let initial: string[] = mq.matches ? DESKTOP_DEFAULT_GROUPS : MOBILE_DEFAULT_GROUPS;
//     try {
//       const raw = localStorage.getItem(STORAGE_KEY);
//       if (raw) {
//         const parsed: unknown = JSON.parse(raw);
//         if (Array.isArray(parsed)) {
//           const valid = parsed.filter(
//             (id): id is string =>
//               typeof id === 'string' && NAV_GROUPS.some(g => g.id === id),
//           );
//           if (valid.length) initial = valid;
//         }
//       }
//     } catch {
//       /* ignore corrupt storage */
//     }
//     setOpenGroups(initial);
//     setHydrated(true);

//     return () => mq.removeEventListener('change', onMqChange);
//   }, []);

//   useEffect(() => {
//     if (!hasUserToggled || !hydrated) return;
//     try {
//       localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
//     } catch {
//       /* quota */
//     }
//   }, [openGroups, hasUserToggled, hydrated]);

//   useEffect(() => {
//     setMobileOpen(false);
//   }, [pathname]);

//   useEffect(() => {
//     if (!mobileOpen) return;
//     const activeId = matchGroupForPath(pathnameRef.current);
//     if (!activeId) return;
//     setOpenGroups(prev => (prev.includes(activeId) ? prev : [...prev, activeId]));
//   }, [mobileOpen]);

//   /* ---------- Scroll lock + focus trap ---------- */
//   useEffect(() => {
//     if (!mobileOpen) return;

//     lastFocusedBeforeOpen.current = document.activeElement;
//     const scrollY = window.scrollY;
//     const html = document.documentElement;
//     const body = document.body;

//     html.style.overflow = 'hidden';
//     body.style.position = 'fixed';
//     body.style.top = `-${scrollY}px`;
//     body.style.left = '0';
//     body.style.right = '0';
//     body.style.width = '100%';

//     const raf = requestAnimationFrame(() => {
//       const first = drawerRef.current?.querySelector<HTMLElement>(
//         'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
//       );
//       first?.focus();
//     });

//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') {
//         e.preventDefault();
//         setMobileOpen(false);
//         return;
//       }
//       if (e.key !== 'Tab') return;
//       const root = drawerRef.current;
//       if (!root) return;
//       const focusables = Array.from(
//         root.querySelectorAll<HTMLElement>(
//           'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
//         ),
//       ).filter(el => el.offsetParent !== null);
//       if (!focusables.length) return;
//       const firstEl = focusables[0];
//       const lastEl = focusables[focusables.length - 1];
//       if (e.shiftKey && document.activeElement === firstEl) {
//         e.preventDefault();
//         lastEl.focus();
//       } else if (!e.shiftKey && document.activeElement === lastEl) {
//         e.preventDefault();
//         firstEl.focus();
//       }
//     };

//     window.addEventListener('keydown', onKey);

//     return () => {
//       cancelAnimationFrame(raf);
//       window.removeEventListener('keydown', onKey);
//       html.style.overflow = '';
//       body.style.position = '';
//       body.style.top = '';
//       body.style.left = '';
//       body.style.right = '';
//       body.style.width = '';
//       window.scrollTo(0, scrollY);
//       if (lastFocusedBeforeOpen.current instanceof HTMLElement) {
//         lastFocusedBeforeOpen.current.focus();
//       }
//     };
//   }, [mobileOpen]);

//   const isActive = useCallback(
//     (href: string) =>
//       href === '/'
//         ? pathname === '/'
//         : pathname === href || pathname.startsWith(href + '/'),
//     [pathname],
//   );

//   const toggleGroup = useCallback((id: string) => {
//     setHasUserToggled(true);
//     setOpenGroups(prev =>
//       prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
//     );
//   }, []);

//   function signOut() {
//     localStorage.removeItem('forestos_token');
//     localStorage.removeItem('forestos_user');
//     localStorage.removeItem('forestos_organization_id');
//     localStorage.removeItem('forestos_active_organization');
//     window.location.href = '/login';
//   }

//   if (variant === 'off') return null;

//   return (
//     <>
//       <a href="#main-content" className="skipLink">Skip to main content</a>

//       <header className="mobileBar">
//         <button
//           type="button"
//           className="hamburger"
//           aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
//           aria-expanded={mobileOpen}
//           aria-controls="nav-drawer"
//           onClick={() => setMobileOpen(v => !v)}
//         >
//           <span className={`hamburgerIcon ${mobileOpen ? 'open' : ''}`} />
//         </button>
//         <Link href="/" className="mobileBrand" onClick={() => setMobileOpen(false)}>
//           <Trees className="brandMark" size={18} strokeWidth={2} aria-hidden />
//           <span>ForestOS</span>
//         </Link>
//       </header>

//       {mobileOpen && (
//         <div className="navOverlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
//       )}

//       <aside
//         id="nav-drawer"
//         ref={drawerRef}
//         className={`sidebar ${mobileOpen ? 'open' : ''}`}
//         aria-label="Primary navigation"
//       >
//         <Link href="/" className="brand" onClick={() => setMobileOpen(false)}>
//           <Trees className="brandMark" size={22} strokeWidth={2} aria-hidden />
//           <span>ForestOS</span>
//         </Link>
//         <div className="sub">Masulita Green Farms</div>

//         <nav className="nav" aria-label="Main">
//           {NAV_GROUPS.map(group => {
//             const open = openGroups.includes(group.id);
//             const hasActive = group.items.some(i => isActive(i.href));
//             return (
//               <div key={group.id} className={`navGroup ${open ? 'open' : ''}`}>
//                 <button
//                   type="button"
//                   className={`navGroupHeader ${hasActive ? 'hasActive' : ''}`}
//                   onClick={() => toggleGroup(group.id)}
//                   aria-expanded={open}
//                   aria-controls={`navgroup-${group.id}`}
//                 >
//                   <span className="navGroupLabel">
//                     <group.icon className="navIcon" size={16} strokeWidth={1.75} aria-hidden />
//                     <span className="navGroupText">{group.label}</span>
//                   </span>
//                   <span className="navGroupMeta">
//                     {hasActive && !open && (
//                       <span className="navActiveDot" aria-label="Contains current page" />
//                     )}
//                     <ChevronDown className="navChevron" size={14} strokeWidth={2} aria-hidden />
//                   </span>
//                 </button>
//                 <div
//                   id={`navgroup-${group.id}`}
//                   className="navGroupBody"
//                   role="group"
//                   aria-label={group.label}
//                 >
//                   {group.items.map(item => {
//                     const active = isActive(item.href);
//                     return (
//                       <Link
//                         key={item.href}
//                         href={item.href}
//                         className={`navLink ${active ? 'active' : ''}`}
//                         aria-current={active ? 'page' : undefined}
//                         onClick={() => setMobileOpen(false)}
//                       >
//                         {item.label}
//                       </Link>
//                     );
//                   })}
//                 </div>
//               </div>
//             );
//           })}
//         </nav>

//         <div className="navFooter">
//           {authed && user && (
//             <div className="navUser" title={user.email}>
//               <span className="navUserEmail">{user.email}</span>
//               {user.role && <span className="navUserRole">{user.role}</span>}
//             </div>
//           )}
//           {authed ? (
//             <button type="button" className="btn navSignOut" onClick={signOut}>Sign out</button>
//           ) : (
//             <Link href="/login" className="btn navSignOut">Sign in</Link>
//           )}
//         </div>
//       </aside>
//     </>
//   );
// }
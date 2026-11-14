import type { Metadata, Viewport } from 'next';
// @ts-ignore -- Next.js handles this stylesheet import.
import './globals.css';
import PwaRegister from './pwa-register';

export const metadata: Metadata = {
  title: 'ForestOS | Masulita Green Farms',
  description: 'Eucalyptus and beekeeping management',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#244b35',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}








// import type { Metadata, Viewport } from 'next';
// // @ts-ignore -- Next.js handles this stylesheet import.
// import './globals.css';
// import PwaRegister from './pwa-register';
// import { NavSidebar } from '@/components/NavSidebar';

// export const metadata: Metadata = {
//   title: 'ForestOS | Masulita Green Farms',
//   description: 'Eucalyptus and beekeeping management',
//   manifest: '/manifest.webmanifest',
// };

// export const viewport: Viewport = {
//   themeColor: '#244b35',
// };

// // Flip to 'on' once every page has had its <aside> removed.
// // While 'off', pages keep their own hard-coded <aside>.
// const SHELL_VARIANT: 'on' | 'off' = 'off';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body suppressHydrationWarning>
//         <PwaRegister />
//         {SHELL_VARIANT === 'on' ? (
//           <div className="shell">
//             <NavSidebar />
//             <main id="main-content" className="main">{children}</main>
//           </div>
//         ) : (
//           children
//         )}
//       </body>
//     </html>
//   );
// }
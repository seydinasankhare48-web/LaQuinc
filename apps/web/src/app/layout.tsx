import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { t } from '@laquinc/i18n';
import { Providers } from '../components/providers';
import './globals.css';

// Caisse, espace gérant : jamais indexés (docs/seo.md).
export const metadata: Metadata = {
  title: t('app.name'),
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { t } from '@laquinc/i18n';

export const metadata: Metadata = {
  title: t('app.name'),
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

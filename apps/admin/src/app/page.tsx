import { t } from '@laquinc/i18n';

export default function HomePage() {
  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.comingSoon')}</p>
    </main>
  );
}

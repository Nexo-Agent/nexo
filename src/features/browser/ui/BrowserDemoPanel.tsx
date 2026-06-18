import { useTranslation } from 'react-i18next';
import { BrowserView } from './BrowserView';

export function BrowserDemoPanel() {
  const { t } = useTranslation('browser');

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('demoTitle')}</h3>
      <BrowserView className="min-h-[420px]" streamClassName="min-h-[320px]" />
    </div>
  );
}

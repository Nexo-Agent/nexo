import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BrowserStreamSkeletonProps {
  className?: string;
}

export function BrowserStreamSkeleton({
  className,
}: BrowserStreamSkeletonProps) {
  const { t } = useTranslation('browser');
  return (
    <div
      className={cn(
        'flex h-64 w-full items-center justify-center rounded-lg border bg-muted/40',
        className
      )}
    >
      <span className="text-sm text-muted-foreground">{t('loading')}</span>
    </div>
  );
}

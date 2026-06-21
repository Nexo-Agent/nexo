import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppUpdate } from '../UpdateProvider';

const updateLabelClass =
  'flex w-full items-center justify-center gap-2 px-2 py-1 text-sm';

export function SidebarUpdateButton() {
  const { t } = useTranslation(['common', 'settings']);
  const { status, update, installUpdate, downloadProgress } = useAppUpdate();

  const isUpdating =
    status === 'downloading' ||
    status === 'installing' ||
    status === 'ready-to-restart';
  const showButton = status === 'available' || isUpdating;

  if (!showButton) {
    return null;
  }

  const progressLabel =
    status === 'installing' || status === 'ready-to-restart'
      ? t('installing', 'Đang cài đặt...')
      : t('downloading', 'Đang tải xuống...');

  const progress =
    status === 'installing' || status === 'ready-to-restart'
      ? 100
      : Math.round(downloadProgress);

  const updateText = (
    <>
      <span className="truncate">{progressLabel}</span>
      <span className="shrink-0 tabular-nums">{progress}%</span>
    </>
  );

  return (
    <button
      type="button"
      onClick={installUpdate}
      disabled={isUpdating}
      aria-busy={isUpdating}
      className={cn(
        'relative w-full overflow-hidden rounded-md transition-colors',
        'disabled:pointer-events-none',
        isUpdating
          ? 'bg-muted ring-1 ring-primary/20'
          : 'bg-primary font-medium text-primary-foreground hover:bg-primary/90'
      )}
    >
      {isUpdating ? (
        <>
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />

          {/* Text on unfilled track */}
          <span
            className={cn(
              updateLabelClass,
              'relative z-10 text-sidebar-foreground'
            )}
          >
            {updateText}
          </span>

          {/* Text on filled portion — clipped to progress width */}
          <span
            aria-hidden
            className={cn(
              updateLabelClass,
              'absolute inset-0 z-20 text-primary-foreground pointer-events-none'
            )}
            style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
          >
            {updateText}
          </span>
        </>
      ) : (
        <span className={updateLabelClass}>
          <Download className="size-3.5 shrink-0" />
          <span className="truncate">
            {t('updateToVersion', {
              defaultValue: 'Cập nhật v{{version}}',
              version: update?.version,
            })}
          </span>
        </span>
      )}
    </button>
  );
}

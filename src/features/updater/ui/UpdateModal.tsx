import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, ChevronRight, Info } from 'lucide-react';
import { Update } from '@tauri-apps/plugin-updater';
import { FormDialog } from '@/ui/molecules/FormDialog';
import { Button } from '@/ui/atoms/button';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { MarkdownContent } from '@/ui/organisms/markdown/MarkdownContent';
import { UpdateStatus } from '../lib/useUpdate';

interface UpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: UpdateStatus;
  update: Update | null;
  installUpdate: () => Promise<void>;
  downloadProgress: number;
}

export function UpdateModal({
  open,
  onOpenChange,
  status,
  update,
  installUpdate,
  downloadProgress,
}: UpdateModalProps) {
  const { t } = useTranslation(['common', 'settings']);
  const [showNotes, setShowNotes] = useState(false);

  // If status becomes ready-to-restart, we might want to close the modal or show a message
  // But installUpdate already does relaunch()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('updateAvailable', 'Cập nhật mới đã sẵn sàng')}
      description={t('newVersionAvailable', {
        defaultValue: 'Phiên bản {{version}} đã sẵn sàng để cài đặt',
        version: update?.version,
      })}
      scrollable={true}
      footer={
        <div className="flex w-full gap-3 sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={
              status === 'downloading' ||
              status === 'installing' ||
              status === 'ready-to-restart'
            }
            className="flex-1 sm:flex-none border-none hover:bg-muted/50 font-medium"
          >
            {t('remindMeLater', 'Để sau')}
          </Button>
          <Button
            onClick={installUpdate}
            disabled={
              status === 'downloading' ||
              status === 'installing' ||
              status === 'ready-to-restart'
            }
            className="flex-1 sm:px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 font-bold tracking-wide"
          >
            {status === 'checking' ? (
              <RefreshCw className="mr-2 size-4 animate-spin" />
            ) : (
              <Download className="mr-2 size-4" />
            )}
            {t('updateNow', 'Cập nhật ngay')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Version Info Card */}
        <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 relative overflow-hidden group">
          <div className="flex items-center justify-between relative z-10">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('newVersion', 'Phiên bản mới')}
              </p>
              <p className="text-lg font-bold text-foreground">
                v{update?.version}
              </p>
            </div>
            <div className="h-10 w-px bg-border/50 mx-4" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('releaseDate', 'Ngày phát hành')}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {update?.date
                  ? new Date(update.date).toLocaleDateString()
                  : t('recently', 'Gần đây')}
              </p>
            </div>
          </div>
        </div>

        {/* Release Notes Toggle */}
        {update?.body && (
          <div className="space-y-2">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
            >
              <ChevronRight
                className={`size-4 transition-transform duration-200 ${showNotes ? 'rotate-90' : ''}`}
              />
              {t('viewReleaseNotes', 'Xem thông tin bản cập nhật')}
            </button>

            {showNotes && (
              <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <ScrollArea className="h-[300px] w-full">
                  <div className="p-4">
                    <MarkdownContent
                      content={update.body}
                      className="text-sm text-muted-foreground"
                    />
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar (Visible during download) */}
        {(status === 'downloading' || status === 'installing') && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground capitalize">
                {status === 'downloading'
                  ? t('downloading', 'Đang tải xuống...')
                  : t('installing', 'Đang cài đặt...')}
              </span>
              <span className="text-primary font-bold">
                {Math.round(downloadProgress)}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden ring-1 ring-border/50">
              <div
                className="h-full bg-primary transition-[width] duration-300 relative"
                style={{ width: `${downloadProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {status === 'ready-to-restart' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-sm font-medium animate-in zoom-in-95 duration-200">
            <Info className="size-4 shrink-0" />
            {t(
              'updateReadyRestart',
              'Cập nhật đã tải xong. Ứng dụng sẽ tự động khởi động lại.'
            )}
          </div>
        )}
      </div>
    </FormDialog>
  );
}

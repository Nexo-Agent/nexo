import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/index';
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import { Package, Loader2 } from 'lucide-react';

interface PythonPackageManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (packages: string[]) => Promise<void>;
  pythonVersion?: string;
}

export function PythonPackageManagerDialog({
  open,
  onOpenChange,
  onInstall,
  pythonVersion,
}: PythonPackageManagerDialogProps) {
  const { t } = useTranslation('settings');
  const [packages, setPackages] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    // Parse packages from textarea (comma or newline separated)
    const packageList = packages
      .split(/[,\n]/)
      .map((pkg) => pkg.trim())
      .filter((pkg) => pkg.length > 0);

    if (packageList.length === 0) return;

    setIsInstalling(true);
    try {
      await onInstall(packageList);
      setPackages(''); // Clear input on success
      onOpenChange(false); // Close dialog on success
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCancel = () => {
    if (!isInstalling) {
      setPackages('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-border/40 bg-background/95 backdrop-blur-lg shadow-xl">
        <DialogHeader
          showBorder
          className="flex-row items-center gap-4 px-6 py-4 bg-muted/20 space-y-0 w-full"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-python/10 border border-brand-python/20">
            <Package className="size-5 text-brand-python" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <DialogTitle className="text-base font-bold truncate">
              {t('managePythonPackages')}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground font-medium truncate">
              {pythonVersion
                ? t('managePythonPackagesDescription', {
                    version: pythonVersion,
                  })
                : t('managePythonPackagesDescriptionNoVersion')}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="px-2 py-2 space-y-4 w-full">
          <div className="space-y-2">
            <label
              htmlFor="packages"
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50"
            >
              {t('packageNames')}
            </label>

            <Textarea
              id="packages"
              placeholder={t('packageNamesPlaceholder')}
              value={packages}
              onChange={(e) => setPackages(e.target.value)}
              disabled={isInstalling}
              className="min-h-[120px] font-mono text-sm leading-relaxed bg-background shadow-inner border-border/60 focus:border-brand-python/40 focus:ring-1 focus:ring-brand-python/20 transition-all resize-none"
            />

            <p className="text-[11px] text-muted-foreground/40 italic px-1">
              {t('packageNamesHint')}
            </p>
          </div>
        </DialogBody>

        <DialogFooter className="px-6 pb-6 pt-2 flex flex-row items-center gap-3 space-y-0 w-full sm:justify-stretch">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isInstalling}
            className="flex-1 h-10 text-xs font-semibold rounded border border-border/40 hover:bg-muted/50 transition-colors"
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleInstall}
            disabled={isInstalling || packages.trim().length === 0}
            className="flex-1 h-10 text-xs font-bold bg-brand-python hover:bg-brand-python/90 text-white rounded shadow-lg shadow-brand-python/10 transition-all active:scale-[0.98]"
          >
            {isInstalling ? (
              <div className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>{t('installing')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Package className="size-3.5" />
                <span>{t('installPackages')}</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

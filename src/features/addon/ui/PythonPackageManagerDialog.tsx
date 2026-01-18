import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/ui/atoms/dialog';
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
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-python/10 border border-brand-python/20">
            <Package className="size-5 text-brand-python" />
          </div>
          <div className="flex-1 min-w-0">
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
        </header>

        <div className="px-6 py-5 space-y-4">
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
              className="min-h-[120px] font-mono text-sm leading-relaxed p-3.5 bg-background shadow-inner border-border/60 focus:border-brand-python/40 focus:ring-1 focus:ring-brand-python/20 transition-all resize-none rounded-xl"
            />

            <p className="text-[11px] text-muted-foreground/40 italic px-1">
              {t('packageNamesHint')}
            </p>
          </div>
        </div>

        <footer className="px-6 pb-5 pt-1 flex items-center justify-end gap-2.5">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isInstalling}
            className="h-9 px-4 text-xs font-semibold rounded-lg"
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleInstall}
            disabled={isInstalling || packages.trim().length === 0}
            className="h-9 px-6 text-xs font-bold bg-brand-python hover:bg-brand-python/90 text-white rounded-lg shadow-sm transition-all active:scale-[0.98]"
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
        </footer>
      </DialogContent>
    </Dialog>
  );
}

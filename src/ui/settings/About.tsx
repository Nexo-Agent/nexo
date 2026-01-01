import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Separator } from '@/ui/atoms/separator';

interface AboutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const APP_VERSION = '0.1.0';
const APP_NAME = 'Nexo';

export function About({ open, onOpenChange }: AboutProps) {
  const { t } = useTranslation('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Info className="size-5 text-primary" />
            </div>
            <DialogTitle className="text-xl">{t('aboutTitle')}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{APP_NAME}</h3>
              <p className="text-sm text-muted-foreground">
                {t('version')}: <span className="font-mono">{APP_VERSION}</span>
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t('description')}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('appDescription')}
              </p>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

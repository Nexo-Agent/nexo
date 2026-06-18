import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Globe, BookOpen, Heart } from 'lucide-react';
import { getVersion } from '@tauri-apps/api/app';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Separator } from '@/ui/atoms/separator';
import { Button } from '@/ui/atoms/button/button';

interface AboutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { APP_NAME, GITHUB_URL, WEBSITE_URL, DOCS_URL } from '../lib/constants';

export function About({ open, onOpenChange }: AboutProps) {
  const { t } = useTranslation('common');
  const [appVersion, setAppVersion] = useState<string>('');

  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch((err) => {
        logger.error('Failed to get app version in About:', err);
      });
  }, []);

  const openExternalLink = async (url: string) => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch (error) {
      logger.error('Failed to open external link in About:', { url, error });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-background shadow-md ring-1 ring-border/50">
              <img
                src="/icon.svg"
                alt="Nexo Logo"
                className="size-8 drop-shadow-sm"
              />
            </div>
            <div>
              <DialogTitle className="text-xl">{APP_NAME}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('version')}{' '}
                <span className="font-mono font-medium">
                  {appVersion || '...'}
                </span>
              </p>
            </div>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-foreground">
                {t('description')}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('appDescription')}
              </p>
            </div>

            <Separator />

            {/* Features Grid */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                {t('keyFeatures', { defaultValue: 'Key Features' })}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="text-xs font-medium text-foreground">
                    Multi-LLM Support
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Connect to multiple AI providers
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="text-xs font-medium text-foreground">
                    MCP Integration
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Model Context Protocol support
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="text-xs font-medium text-foreground">
                    Agent Skills
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Install skills from folder or GitHub
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="text-xs font-medium text-foreground">
                    Privacy First
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Local data storage
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Links */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">
                {t('resources', { defaultValue: 'Resources' })}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-auto flex-col gap-2 py-3"
                  onClick={() => openExternalLink(GITHUB_URL)}
                >
                  <Github className="size-4" />
                  <span className="text-xs">GitHub</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-auto flex-col gap-2 py-3"
                  onClick={() => openExternalLink(WEBSITE_URL)}
                >
                  <Globe className="size-4" />
                  <span className="text-xs">Website</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-auto flex-col gap-2 py-3"
                  onClick={() => openExternalLink(DOCS_URL)}
                >
                  <BookOpen className="size-4" />
                  <span className="text-xs">Docs</span>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Footer */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <span>{t('madeWith', { defaultValue: 'Made with' })}</span>
              <Heart className="size-3 fill-error text-error" />
              <span>{t('byTeam', { defaultValue: 'by the Nexo team' })}</span>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

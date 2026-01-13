import { useTranslation } from 'react-i18next';
import { Info, Github, Globe, BookOpen, Heart } from 'lucide-react';
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

const APP_VERSION = '0.1.0';
const APP_NAME = 'Nexo';
const GITHUB_URL = 'https://github.com/Nexo-Agent/nexo';
const WEBSITE_URL = 'https://nexo.nkthanh.dev';
const DOCS_URL = 'https://nexo-docs.nkthanh.dev';

export function About({ open, onOpenChange }: AboutProps) {
  const { t } = useTranslation('common');

  const openExternalLink = async (url: string) => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch (error) {
      console.error('Failed to open external link:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Info className="size-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{APP_NAME}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('version')}{' '}
                <span className="font-mono font-medium">{APP_VERSION}</span>
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
                    Custom Prompts
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Manage prompt templates
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

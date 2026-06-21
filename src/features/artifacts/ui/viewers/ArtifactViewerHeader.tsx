import { Check, Copy, ExternalLink, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as opener from '@tauri-apps/plugin-opener';
import { Button } from '@/ui/atoms/button/button';
import { logger } from '@/lib/logger';
import type { Artifact } from '../../types';

interface ArtifactViewerHeaderProps {
  artifact: Artifact;
  onReload?: () => void;
  reloading?: boolean;
  copyContent?: string | null;
}

export function ArtifactViewerHeader({
  artifact,
  onReload,
  reloading = false,
  copyContent,
}: ArtifactViewerHeaderProps) {
  const { t } = useTranslation('artifacts');
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number>();

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    },
    []
  );

  const handleOpenInSystem = async () => {
    try {
      await opener.openPath(artifact.path);
    } catch (error) {
      logger.error('[ArtifactViewerHeader] Failed to open in system:', error);
    }
  };

  const handleCopyContent = async () => {
    if (!copyContent || !navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(copyContent);
      setCopied(true);
      copiedTimeoutRef.current = window.setTimeout(
        () => setCopied(false),
        2000
      );
    } catch (error) {
      logger.error('[ArtifactViewerHeader] Failed to copy content:', error);
    }
  };

  const canCopy = Boolean(copyContent);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {artifact.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {artifact.filename}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onReload ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={reloading}
            onClick={onReload}
            aria-label={t('viewerReload')}
          >
            <RotateCw className={cnIcon(reloading)} aria-hidden />
          </Button>
        ) : null}
        {canCopy ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => void handleCopyContent()}
            aria-label={copied ? t('copyContentDone') : t('copyContent')}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => void handleOpenInSystem()}
        >
          <ExternalLink className="size-3.5" aria-hidden />
          {t('openInSystem')}
        </Button>
      </div>
    </div>
  );
}

function cnIcon(spinning: boolean) {
  return spinning ? 'size-3.5 animate-spin' : 'size-3.5';
}

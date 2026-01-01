import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Network,
  FolderKanban,
  FileText,
  Code,
  Zap,
  GitBranch,
  Database,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Button } from '@/ui/atoms/button/button';
import { useAppDispatch } from '@/store/hooks';
import {
  setWelcomeOpen,
  setSettingsOpen,
  setSettingsSection,
  setWorkspaceSettingsOpen,
} from '@/store/slices/uiSlice';
import { invokeCommand, TauriCommands } from '@/lib/tauri';

interface WelcomeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  {
    icon: Code,
    key: 'featureInteractive',
    navigateTo: 'general' as const,
    comingSoon: false,
  },
  {
    icon: FileText,
    key: 'featurePrompts',
    navigateTo: 'prompts' as const,
    comingSoon: false,
  },
  {
    icon: Zap,
    key: 'featureMCP',
    navigateTo: 'mcp' as const,
    comingSoon: false,
  },
  {
    icon: Network,
    key: 'featureLLMProviders',
    navigateTo: 'llm' as const,
    comingSoon: false,
  },
  {
    icon: FolderKanban,
    key: 'featureWorkspaces',
    navigateTo: 'workspace' as const,
    comingSoon: false,
  },
  {
    icon: GitBranch,
    key: 'featureWorkflow',
    navigateTo: null,
    comingSoon: true,
  },
  {
    icon: Database,
    key: 'featureDataConnector',
    navigateTo: null,
    comingSoon: true,
  },
];

export function Welcome({ open, onOpenChange }: WelcomeProps) {
  const { t } = useTranslation('common');
  const dispatch = useAppDispatch();

  const handleGetStarted = async () => {
    // Always save that user has seen welcome screen
    await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
      key: 'hasSeenWelcome',
      value: 'true',
    });
    dispatch(setWelcomeOpen(false));
    onOpenChange(false);
  };

  const handleFeatureClick = async (
    navigateTo: string | null,
    comingSoon: boolean
  ) => {
    if (comingSoon || !navigateTo) {
      // Feature is coming soon, don't navigate
      return;
    }

    // Save that user has seen welcome screen
    await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
      key: 'hasSeenWelcome',
      value: 'true',
    });

    // Close welcome dialog
    dispatch(setWelcomeOpen(false));
    onOpenChange(false);

    // Navigate to the appropriate screen
    if (navigateTo === 'workspace') {
      dispatch(setWorkspaceSettingsOpen(true));
    } else {
      dispatch(
        setSettingsSection(
          navigateTo as 'general' | 'llm' | 'mcp' | 'prompts' | 'about'
        )
      );
      dispatch(setSettingsOpen(true));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl lg:max-w-6xl max-h-[95vh] overflow-y-auto p-6 sm:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        showCloseButton={false}
      >
        <DialogHeader className="text-center px-0">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="size-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl">{t('welcomeTitle')}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {t('welcomeDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <h3 className="text-base font-semibold mb-4 text-center">
            {t('welcomeFeaturesTitle')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isComingSoon = feature.comingSoon;
              return (
                <button
                  key={feature.key}
                  onClick={() =>
                    handleFeatureClick(feature.navigateTo, isComingSoon)
                  }
                  disabled={isComingSoon}
                  className={`flex flex-col items-start gap-2 p-3 rounded-lg border bg-card transition-colors text-left w-full relative ${
                    isComingSoon
                      ? 'opacity-60 cursor-not-allowed'
                      : 'hover:bg-accent/50 cursor-pointer'
                  }`}
                >
                  {isComingSoon && (
                    <span className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">
                      {t('comingSoon')}
                    </span>
                  )}
                  <div className="rounded-md bg-primary/10 p-2 flex-shrink-0">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 w-full">
                    <p className="text-sm font-semibold leading-tight">
                      {t(`${feature.key}Title`)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {t(`${feature.key}Description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-6">
          <Button onClick={handleGetStarted} className="w-full" size="lg">
            {t('getStarted')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  PlayCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Button } from '@/ui/atoms/button/button';
import { useAppDispatch } from '@/app/hooks';
import {
  setWelcomeOpen,
  navigateToSettings,
  setSettingsSection,
  navigateToWorkspaceSettings,
} from '@/features/ui/state/uiSlice';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useOnboarding } from '@/features/onboarding/hooks/useOnboarding';

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
    navigateTo: 'workspaceSettings' as const,
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

export function WelcomeScreen({ open, onOpenChange }: WelcomeProps) {
  const { t } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { startTour } = useOnboarding();

  const handleGetStarted = async () => {
    // Always save that user has seen welcome screen
    await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
      key: 'hasSeenWelcome',
      value: 'true',
    });
    dispatch(setWelcomeOpen(false));
    onOpenChange(false);
  };

  const handleStartTour = async () => {
    await handleGetStarted();
    // Small delay to allow modal to close completely
    setTimeout(() => {
      startTour('welcomeFlow');
    }, 300);
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
    if (navigateTo === 'workspaceSettings') {
      dispatch(navigateToWorkspaceSettings());
    } else {
      dispatch(
        setSettingsSection(
          navigateTo as
            | 'general'
            | 'llm'
            | 'mcp'
            | 'prompts'
            | 'addon'
            | 'usage'
            | 'about'
        )
      );
      dispatch(navigateToSettings());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl bg-card"
        showCloseButton={false}
      >
        {/* Header Section */}
        <div className="bg-muted/30 p-6 pb-4 border-b text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Sparkles className="w-32 h-32 text-primary" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-3 mb-3 ring-1 ring-primary/20">
              <Sparkles className="size-6 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight mb-1">
              {t('welcomeTitle')}
            </DialogTitle>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('welcomeDescription')}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  className={`group flex items-start gap-3 p-3 rounded-lg border bg-background/50 transition-all text-left w-full relative ${
                    isComingSoon
                      ? 'opacity-60 cursor-not-allowed border-dashed'
                      : 'hover:bg-accent/50 hover:border-primary/20 cursor-pointer shadow-sm hover:shadow-md'
                  }`}
                >
                  <div
                    className={`rounded-md p-2 flex-shrink-0 transition-colors ${isComingSoon ? 'bg-muted' : 'bg-primary/5 group-hover:bg-primary/10'}`}
                  >
                    <Icon
                      className={`size-4 ${isComingSoon ? 'text-muted-foreground' : 'text-primary'}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold leading-none">
                        {t(`${feature.key}Title`)}
                      </p>
                      {isComingSoon && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                          Soon
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {t(`${feature.key}Description`)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-muted/30 border-t mt-auto flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {t('readyToStart', {
              defaultValue: 'Ready to boost your productivity?',
            })}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              onClick={handleStartTour}
              variant="outline"
              className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/5 text-primary"
            >
              <PlayCircle className="mr-2 size-4" />
              {t('takeTheTour', { defaultValue: 'Take a Tour' })}
            </Button>
            <Button
              onClick={handleGetStarted}
              className="flex-1 sm:flex-none min-w-[120px]"
            >
              {t('getStarted')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

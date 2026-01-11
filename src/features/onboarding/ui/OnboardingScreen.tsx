import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Rocket,
  FolderPlus,
  Network,
  CheckCircle2,
  ArrowRight,
  Plus,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
import { Card } from '@/ui/atoms/card';
import { useWorkspaces } from '@/features/workspace';
import {
  useGetLLMConnectionsQuery,
  useCreateLLMConnectionMutation,
} from '@/features/llm';
import { useAppDispatch } from '@/app/hooks';
import { setWelcomeOpen } from '@/features/ui/state/uiSlice';
import { LLMConnectionForm } from '@/features/llm/ui/LLMConnections';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import type { LLMConnection } from '@/features/llm/types';

export function OnboardingScreen() {
  const { t } = useTranslation(['common', 'settings']);
  const dispatch = useAppDispatch();
  const { workspaces, handleAddWorkspace } = useWorkspaces();
  const { data: connections = [], isLoading: isLoadingConnections } =
    useGetLLMConnectionsQuery();
  const [createConnection] = useCreateLLMConnectionMutation();

  const [step, setStep] = useState(1);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [showLLMForm, setShowLLMForm] = useState(false);

  const hasWorkspaces = workspaces.length > 0;
  const hasConnections = connections.length > 0;

  // Auto-advance step based on data
  useEffect(() => {
    if (!hasWorkspaces) {
      setStep(1);
    } else if (!hasConnections) {
      setStep(2);
    } else {
      setStep(3);
    }
  }, [hasWorkspaces, hasConnections]);

  const handleCreateInitialWorkspace = async () => {
    setIsCreatingWorkspace(true);
    try {
      await handleAddWorkspace(
        t('onboarding.myFirstWorkspace', {
          defaultValue: 'My First Workspace',
        })
      );
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleSaveConnection = useCallback(
    async (connection: Omit<LLMConnection, 'id'>) => {
      try {
        await createConnection(connection).unwrap();
        setShowLLMForm(false);
      } catch (error) {
        console.error('Failed to save connection during onboarding:', error);
      }
    },
    [createConnection]
  );

  const handleFinishOnboarding = () => {
    dispatch(setWelcomeOpen(true));
  };

  if (isLoadingConnections) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 overflow-auto">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/90 to-primary/5 pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-4 ring-1 ring-primary/20">
            <Rocket className="size-8 text-primary animate-bounce shadow-primary/20" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            {t('onboarding.welcomeTitle', {
              defaultValue: 'Welcome to Nexomind',
            })}
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {t('onboarding.welcomeSubtitle', {
              defaultValue:
                "Let's get you set up with your workspace and AI connections in just a few clicks.",
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 relative">
          <div className="absolute left-[39px] top-12 bottom-12 w-0.5 bg-border hidden md:block" />

          {/* Step 1: Workspace */}
          <Card
            className={`p-6 border-2 transition-all duration-300 ${
              step === 1
                ? 'border-primary shadow-lg shadow-primary/10'
                : 'border-border/50 opacity-80'
            }`}
          >
            <div className="flex gap-5">
              <div
                className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  hasWorkspaces
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {hasWorkspaces ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <FolderPlus className="size-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">
                    {t('onboarding.step1Title', {
                      defaultValue: 'Create Workspace',
                    })}
                  </h3>
                  {hasWorkspaces && (
                    <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                      {t('onboarding.completed', {
                        defaultValue: 'Completed',
                      })}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('onboarding.step1Desc', {
                    defaultValue:
                      'Workspaces help you organize your chats, prompts, and settings separately.',
                  })}
                </p>
                {!hasWorkspaces ? (
                  <Button
                    onClick={handleCreateInitialWorkspace}
                    disabled={isCreatingWorkspace}
                    className="w-full sm:w-auto"
                  >
                    {isCreatingWorkspace ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    {t('onboarding.createWorkspace', {
                      defaultValue: 'Create My First Workspace',
                    })}
                  </Button>
                ) : (
                  <div className="flex items-center text-sm font-medium text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <FolderPlus className="size-4 mr-2" />
                    {workspaces[0]?.name}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Step 2: LLM Connection */}
          <Card
            className={`p-6 border-2 transition-all duration-300 ${
              step === 2
                ? 'border-primary shadow-lg shadow-primary/10'
                : 'border-border/50 opacity-80'
            } ${!hasWorkspaces ? 'pointer-events-none grayscale' : ''}`}
          >
            <div className="flex gap-5">
              <div
                className={`size-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  hasConnections
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {hasConnections ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Network className="size-5" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">
                    {t('onboarding.step2Title', {
                      defaultValue: 'Connect LLM',
                    })}
                  </h3>
                  {hasConnections && (
                    <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                      {t('onboarding.connected', {
                        defaultValue: 'Connected',
                      })}
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('onboarding.step2Desc', {
                    defaultValue:
                      'Nexo supports OpenAI, Anthropic, Gemini and more. Connect your favorite provider to start chatting.',
                  })}
                </p>
                {!hasConnections ? (
                  <Button
                    onClick={() => setShowLLMForm(true)}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-2 size-4" />
                    {t('onboarding.addConnection', {
                      defaultValue: 'Add LLM Connection',
                    })}
                  </Button>
                ) : (
                  <div className="flex items-center text-sm font-medium text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <Network className="size-4 mr-2" />
                    {connections[0]?.name}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Step 3: Launch */}
          <div
            className={`transition-all duration-500 transform ${
              step === 3
                ? 'scale-105 opacity-100'
                : 'scale-100 opacity-60 pointer-events-none'
            }`}
          >
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold shadow-xl shadow-primary/20 bg-gradient-to-r from-primary to-primary/80 hover:to-primary"
              onClick={handleFinishOnboarding}
            >
              <Sparkles className="mr-3 size-6" />
              {t('onboarding.launchApp', { defaultValue: "Let's Go!" })}
              <ArrowRight className="ml-3 size-5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showLLMForm} onOpenChange={setShowLLMForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl font-bold">
              {t('onboarding.setupConnection', {
                defaultValue: 'Set Up LLM Connection',
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <LLMConnectionForm
              connection={null}
              onSave={handleSaveConnection}
              onClose={() => setShowLLMForm(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

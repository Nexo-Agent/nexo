import { useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Network,
  Server,
  FileText,
  Info,
  Package,
  BarChart,
  Bot,
  Github,
  Globe,
  BookOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  setSettingsSection,
  navigateToChat,
} from '@/features/ui/state/uiSlice';
import { Separator } from '@/ui/atoms/separator';
import { Button } from '@/ui/atoms/button/button';
import { ScrollArea } from '@/ui/atoms/scroll-area';

// Section Components
import { LLMConnections } from '@/features/llm';
import { MCPServerConnections } from '@/features/mcp';
import { AppSettings, PromptManagement } from '@/features/settings';
import { AddonSettings } from '@/features/addon';
import { UsagePage } from '@/features/usage';
import { AgentSettings } from '@/features/agent';
import { UpdateSection } from '@/features/updater/ui/UpdateSection';

export function SettingsScreen() {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const selectedSection = useAppSelector((state) => state.ui.settingsSection);

  // Handle ESC key to navigate back to chat
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(navigateToChat());
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [dispatch]);

  // Section Navigation
  const sections = [
    {
      id: 'general',
      label: t('generalSetting'),
      icon: <SettingsIcon className="size-4" />,
    },
    {
      id: 'llm',
      label: t('llmConnections'),
      icon: <Network className="size-4" />,
    },
    {
      id: 'mcp',
      label: t('mcpServerConnections'),
      icon: <Server className="size-4" />,
    },
    {
      id: 'prompts',
      label: t('promptManagement'),
      icon: <FileText className="size-4" />,
    },
    {
      id: 'agent',
      label: 'Agent',
      icon: <Bot className="size-4" />,
    },
    {
      id: 'addon',
      label: 'Addon',
      icon: <Package className="size-4" />,
    },
    {
      id: 'usage',
      label: 'Usage',
      icon: <BarChart className="size-4" />,
    },
    {
      id: 'about',
      label: t('about'),
      icon: <Info className="size-4" />,
    },
  ] as const;

  const renderContent = () => {
    switch (selectedSection) {
      case 'general':
        return <AppSettings />;
      case 'llm':
        return <LLMConnections />;
      case 'mcp':
        return <MCPServerConnections />;
      case 'prompts':
        return <PromptManagement />;
      case 'agent':
        return <AgentSettings />;
      case 'addon':
        return <AddonSettings />;
      case 'usage':
        return <UsagePage />;
      case 'about':
        return <AboutContent />;
      default:
        return <AppSettings />;
    }
  };

  function AboutContent() {
    const { t: tCommon } = useTranslation('common');
    const { t: tSettings } = useTranslation('settings');

    const openExternalLink = async (url: string) => {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
      } catch (error) {
        console.error('Failed to open external link:', error);
      }
    };

    const GITHUB_URL = 'https://github.com/Nexo-Agent/nexo';
    const WEBSITE_URL = 'https://nexo.nkthanh.dev';
    const DOCS_URL = 'https://nexo-docs.nkthanh.dev';

    return (
      <div className="space-y-6">
        <UpdateSection />

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{tCommon('aboutTitle')}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tSettings('aboutDescription') || tCommon('appDescription')}
          </p>
        </div>

        <Separator />

        {/* Features Grid */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-foreground">
            {tCommon('keyFeatures', { defaultValue: 'Key Features' })}
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
            {tCommon('resources', { defaultValue: 'Resources' })}
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
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 lg:w-72 xl:w-80 border-r border-sidebar-border bg-sidebar flex flex-col shrink-0">
        <ScrollArea className="flex-1">
          <div className="p-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => dispatch(setSettingsSection(section.id))}
                data-tour={
                  section.id === 'llm' ? 'settings-llm-tab' : undefined
                }
                className={cn(
                  'mb-2 w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  selectedSection === section.id
                    ? 'bg-accent text-accent-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'transition-transform',
                    selectedSection === section.id && 'scale-110'
                  )}
                >
                  {section.icon}
                </span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto w-full space-y-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">
                {sections.find((s) => s.id === selectedSection)?.label}
              </h1>
            </div>
            {renderContent()}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

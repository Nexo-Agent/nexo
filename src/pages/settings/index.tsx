import {
  Settings as SettingsIcon,
  Network,
  Server,
  FileText,
  Info,
  Package,
  BarChart,
  ArrowLeft,
  Bot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/atoms/button/button';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { navigateToChat, setSettingsSection } from '@/store/slices/uiSlice';

// Section Components
import { LLMConnections } from '@/ui/settings/LLMConnections';
import { MCPServerConnections } from '@/ui/settings/MCPServerConnections';
import { AppSettings } from '@/ui/settings/AppSettings';
import { PromptManagement } from '@/ui/settings/PromptManagement';
import AddonSettings from '@/ui/settings/AddonSettings';
import { UsagePage } from '@/ui/settings/usage/UsagePage';
import { AgentSettings } from '@/ui/settings/AgentSettings';

export function SettingsPage() {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const selectedSection = useAppSelector((state) => state.ui.settingsSection);

  // Section Navigation
  const sections = [
    {
      id: 'general',
      label: t('title'),
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
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">
            {tCommon('aboutTitle')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tSettings('aboutDescription') || tCommon('appDescription')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{tCommon('version')}</h4>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{tCommon('appVersion')}</span>
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{tCommon('description')}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tCommon('appDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(navigateToChat())}
            className="h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">{t('title')}</h2>
        </div>
        <ScrollArea className="flex-1 [&_[data-slot='scroll-area-scrollbar']]:hidden">
          <div className="p-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => dispatch(setSettingsSection(section.id))}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 [&_[data-slot='scroll-area-scrollbar']]:hidden">
          <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
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

import {
  Settings as SettingsIcon,
  Network,
  Server,
  FileText,
  Info,
  Package,
  BarChart,
  Bot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setSettingsSection } from '@/features/ui/state/uiSlice';
import { SettingsLayout } from '@/features/settings/ui/SettingsLayout';

// Section Components
import { LLMConnections } from '@/features/llm';
import { MCPServerConnections } from '@/features/mcp';
import { AppSettings, PromptManagement } from '@/features/settings';
import { AddonSettings } from '@/features/addon';
import { UsagePage } from '@/features/usage';
import { AgentSettings } from '@/features/agent';

export function SettingsScreen() {
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

  const sidebar = (
    <div className="p-3">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => dispatch(setSettingsSection(section.id))}
          data-tour={section.id === 'llm' ? 'settings-llm-tab' : undefined}
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
  );

  const content = (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {sections.find((s) => s.id === selectedSection)?.label}
        </h1>
      </div>
      {renderContent()}
    </div>
  );

  return (
    <SettingsLayout sidebar={sidebar} title={t('title')}>
      {content}
    </SettingsLayout>
  );
}

import { Suspense, lazy } from 'react';
import {
  Network,
  Server,
  Wand2,
  Github,
  Globe,
  BookOpen,
  Shield,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { useAppSelector } from '@/app/hooks';
import { ScrollArea } from '@/ui/atoms/scroll-area';

const LLMConnections = lazy(() =>
  import('@/features/llm').then((module) => ({
    default: module.LLMConnections,
  }))
);
const MCPServerConnections = lazy(() =>
  import('@/features/mcp').then((module) => ({
    default: module.MCPServerConnections,
  }))
);
const UsagePage = lazy(() =>
  import('@/features/usage/ui/UsagePage').then((module) => ({
    default: module.UsagePage,
  }))
);
const SkillsManager = lazy(() =>
  import('@/features/skill/ui/SkillsManager').then((module) => ({
    default: module.SkillsManager,
  }))
);

import { AppSettings } from './AppSettings';
import { FeatureCard } from './components/FeatureCard';
import { ResourceButton } from './components/ResourceButton';
import { SettingsSidebar } from './components/SettingsSidebar';
import { GITHUB_URL, WEBSITE_URL, DOCS_URL } from '../lib/constants';

const SectionLoader = () => (
  <div className="flex h-full w-full items-center justify-center p-12">
    <Loader2 className="size-8 animate-spin text-muted-foreground" />
  </div>
);

export function SettingsScreen() {
  const { t } = useTranslation(['settings', 'common']);
  const selectedSection = useAppSelector((state) => state.ui.settingsSection);

  const renderContent = () => {
    switch (selectedSection) {
      case 'general':
        return <AppSettings />;
      case 'llm':
        return <LLMConnections />;
      case 'mcp':
        return <MCPServerConnections />;
      case 'usage':
        return <UsagePage />;
      case 'skills':
        return <SkillsManager />;
      case 'about':
        return <AboutContent />;
      default:
        return <AppSettings />;
    }
  };

  const sections = [
    { id: 'general', label: t('generalSetting') },
    { id: 'llm', label: t('llmConnections') },
    { id: 'mcp', label: t('mcpServerConnections') },
    { id: 'skills', label: t('skills') },
    { id: 'usage', label: 'Usage' },
    { id: 'about', label: t('about') },
  ];

  function AboutContent() {
    const { t: tCommon } = useTranslation('common');
    const { t: tSettings } = useTranslation('settings');

    const openExternalLink = async (url: string) => {
      try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
      } catch (error) {
        logger.error('Failed to open external link in Settings:', {
          url,
          error,
        });
      }
    };

    return (
      <div className="mx-auto max-w-3xl space-y-8 pb-8 animate-in fade-in duration-500">
        <div className="flex flex-col items-center space-y-4 pt-2 text-center">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-background">
            <img
              src="/icon.svg"
              alt="Cogito Studio Logo"
              className="size-12 drop-shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">
              {tCommon('aboutTitle', { defaultValue: 'Cogito Studio' })}
            </h3>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
              {tSettings('aboutDescription') || tCommon('appDescription')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground/80">
            {tCommon('keyFeatures', { defaultValue: 'Core Capabilities' })}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FeatureCard
              icon={<Network className="size-5" />}
              title="Multi-LLM Support"
              description="Connect seamlessly to OpenAI, Anthropic, Gemini, and Local LLMs."
            />
            <FeatureCard
              icon={<Server className="size-5" />}
              title="MCP Integration"
              description="Full support for Model Context Protocol servers and tools."
            />
            <FeatureCard
              icon={<Wand2 className="size-5" />}
              title="Agent Skills"
              description="Install and use Agent Skills from your filesystem or GitHub."
            />
            <FeatureCard
              icon={<Shield className="size-5" />}
              title="Privacy First"
              description="Your data stays locally on your device. No cloud collection."
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground/80">
            {tCommon('resources', { defaultValue: 'Resources' })}
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ResourceButton
              icon={<Github className="size-4" />}
              label="GitHub"
              onClick={() => openExternalLink(GITHUB_URL)}
            />
            <ResourceButton
              icon={<Globe className="size-4" />}
              label="Website"
              onClick={() => openExternalLink(WEBSITE_URL)}
            />
            <ResourceButton
              icon={<BookOpen className="size-4" />}
              label="Documentation"
              onClick={() => openExternalLink(DOCS_URL)}
            />
          </div>
        </div>

        <div className="space-y-1 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Built with Tauri, React & Rust
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            © {new Date().getFullYear()} Cogito Studio. Open Source Software.
          </p>
        </div>
      </div>
    );
  }

  const sectionLabel = sections.find((s) => s.id === selectedSection)?.label;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <SettingsSidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6">
            {selectedSection !== 'about' && sectionLabel ? (
              <h1 className="mb-5 text-lg font-semibold tracking-tight">
                {sectionLabel}
              </h1>
            ) : null}
            <Suspense fallback={<SectionLoader />}>{renderContent()}</Suspense>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

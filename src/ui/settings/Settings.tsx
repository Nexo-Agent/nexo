import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Network,
  Server,
  FileText,
  Info,
  Package,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { cn } from '@/lib/utils';
import { LLMConnections } from '@/ui/settings/LLMConnections';
import { MCPServerConnections } from '@/ui/settings/MCPServerConnections';
import { AppSettings } from '@/ui/settings/AppSettings';
import { PromptManagement } from '@/ui/settings/PromptManagement';
import AddonSettings from '@/ui/settings/AddonSettings';

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: 'general' | 'llm' | 'mcp' | 'prompts' | 'addon' | 'about';
}

type SettingsSection =
  | 'general'
  | 'llm'
  | 'mcp'
  | 'prompts'
  | 'addon'
  | 'about';

export function Settings({
  open,
  onOpenChange,
  initialSection = 'general',
}: SettingsProps) {
  const { t } = useTranslation('settings');
  const [selectedSection, setSelectedSection] =
    useState<SettingsSection>(initialSection);

  // Update section when initialSection prop changes or dialog opens
  useEffect(() => {
    if (open && initialSection) {
      setSelectedSection(initialSection);
    }
  }, [open, initialSection]);

  const sections: Array<{
    id: SettingsSection;
    label: string;
    icon: React.ReactNode;
  }> = [
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
      id: 'addon',
      label: 'Addon',
      icon: <Package className="size-4" />,
    },
    {
      id: 'about',
      label: t('about'),
      icon: <Info className="size-4" />,
    },
  ];

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
      case 'addon':
        return <AddonSettings />;
      case 'about':
        return <AboutContent />;
      default:
        return <AppSettings />;
    }
  };

  // About content component to render inside Settings
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[95vh] h-[90vh] p-0 flex flex-col"
        style={{
          maxWidth: '1000px',
          width: '95vw',
          minWidth: '800px',
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4" showBorder>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <SettingsIcon className="size-5" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
            <ScrollArea className="flex-1 [&_[data-slot='scroll-area-scrollbar']]:hidden">
              <div className="p-3">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
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

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <ScrollArea className="flex-1 [&_[data-slot='scroll-area-scrollbar']]:hidden">
              <div className="p-6 space-y-6">{renderContent()}</div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

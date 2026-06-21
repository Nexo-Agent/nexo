import {
  Settings as SettingsIcon,
  Network,
  Server,
  Info,
  BarChart,
  Wand2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import {
  setSettingsSection,
  type SettingsSection,
} from '@/features/ui/state/uiSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { SidebarColumnRow } from '@/features/ui/ui/SidebarColumnRow';
import {
  SIDEBAR_ICON,
  SIDEBAR_LIST,
  sidebarItemClass,
} from '@/features/ui/lib/sidebarStyles';
import { SETTINGS_SIDEBAR_WIDTH } from '@/features/ui/hooks/useLayoutWidths';

export function SettingsSidebar() {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const selectedSection = useAppSelector((state) => state.ui.settingsSection);

  const sections = [
    {
      id: 'general' as const,
      label: t('generalSetting'),
      icon: SettingsIcon,
    },
    {
      id: 'llm' as const,
      label: t('llmConnections'),
      icon: Network,
    },
    {
      id: 'mcp' as const,
      label: t('mcpServerConnections'),
      icon: Server,
    },
    {
      id: 'skills' as const,
      label: t('skills'),
      icon: Wand2,
    },
    {
      id: 'usage' as const,
      label: 'Usage',
      icon: BarChart,
    },
    {
      id: 'about' as const,
      label: t('about'),
      icon: Info,
    },
  ];

  return (
    <div
      className="flex h-full shrink-0 flex-col overflow-hidden bg-sidebar select-none"
      style={{ width: SETTINGS_SIDEBAR_WIDTH }}
    >
      <ScrollArea className="min-h-0 flex-1">
        <SidebarColumnRow className="pt-1 pb-2">
          <nav className={SIDEBAR_LIST} aria-label={t('title')}>
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = selectedSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() =>
                    dispatch(setSettingsSection(section.id as SettingsSection))
                  }
                  data-tour={
                    section.id === 'llm' ? 'settings-llm-tab' : undefined
                  }
                  className={sidebarItemClass(isActive)}
                >
                  <Icon className={SIDEBAR_ICON} />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </SidebarColumnRow>
      </ScrollArea>
    </div>
  );
}

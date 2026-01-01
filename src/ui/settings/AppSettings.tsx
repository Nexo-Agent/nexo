import { useTranslation } from 'react-i18next';
import { Label } from '@/ui/atoms/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { useAppSettings } from '@/hooks/useAppSettings';
import i18n from '@/i18n/config';

export function AppSettings() {
  const { t } = useTranslation('settings');
  const {
    language: currentLanguage,
    userMode: currentUserMode,
    theme: currentTheme,
    updateLanguage,
    updateUserMode,
    updateTheme,
  } = useAppSettings();

  const handleLanguageChange = (lang: 'vi' | 'en') => {
    updateLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const handleUserModeChange = (mode: 'normal' | 'developer') => {
    updateUserMode(mode);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    updateTheme(newTheme);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">
          {t('generalSettings') || t('title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('generalSettingsDescription') || t('configureGeneralSettings')}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="language-select">{t('language')}</Label>
          <Select
            value={currentLanguage}
            onValueChange={(value: 'vi' | 'en') => handleLanguageChange(value)}
          >
            <SelectTrigger id="language-select" className="w-full">
              <SelectValue placeholder={t('selectLanguage')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">{t('vietnamese')}</SelectItem>
              <SelectItem value="en">{t('english')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme-select">{t('theme')}</Label>
          <Select
            value={currentTheme}
            onValueChange={(value: 'light' | 'dark' | 'system') =>
              handleThemeChange(value)
            }
          >
            <SelectTrigger id="theme-select" className="w-full">
              <SelectValue placeholder={t('selectTheme')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t('lightTheme')}</SelectItem>
              <SelectItem value="dark">{t('darkTheme')}</SelectItem>
              <SelectItem value="system">{t('systemTheme')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-mode-select">{t('userMode')}</Label>
          <Select
            value={currentUserMode}
            onValueChange={(value: 'normal' | 'developer') =>
              handleUserModeChange(value)
            }
          >
            <SelectTrigger id="user-mode-select" className="w-full">
              <SelectValue placeholder={t('selectUserMode')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">{t('normalUser')}</SelectItem>
              <SelectItem value="developer">{t('developerUser')}</SelectItem>
            </SelectContent>
          </Select>
          {currentUserMode === 'developer' && (
            <p className="text-xs text-muted-foreground">
              {t('developerModeDescription')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

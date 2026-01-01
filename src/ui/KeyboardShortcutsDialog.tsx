import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Separator } from '@/ui/atoms/separator';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setKeyboardShortcutsOpen } from '@/store/slices/uiSlice';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcutsDialog() {
  const { t } = useTranslation(['common']);
  const dispatch = useAppDispatch();
  const keyboardShortcutsOpen = useAppSelector(
    (state) => state.ui.keyboardShortcutsOpen
  );

  // Detect platform for modifier key display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      category: t('navigation', { ns: 'common' }),
      items: [
        {
          keys: `${modifierKey} + K`,
          description: t('searchChats', { ns: 'common' }),
        },
        {
          keys: `${modifierKey} + N`,
          description: t('newConversation', { ns: 'common' }),
        },
        {
          keys: `${modifierKey} + W`,
          description: t('closeCurrentChat', { ns: 'common' }),
        },
      ],
    },
    {
      category: t('actions', { ns: 'common' }),
      items: [
        {
          keys: `${modifierKey} + ,`,
          description: t('openSettings', { ns: 'common' }),
        },
        {
          keys: `${modifierKey} + /`,
          description: t('showKeyboardShortcuts', { ns: 'common' }),
        },
      ],
    },
    {
      category: t('general', { ns: 'common' }),
      items: [
        {
          keys: 'Esc',
          description: t('closeDialog', { ns: 'common' }),
        },
      ],
    },
  ];

  return (
    <Dialog
      open={keyboardShortcutsOpen}
      onOpenChange={(open) => dispatch(setKeyboardShortcutsOpen(open))}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Keyboard className="size-5" />
            {t('keyboardShortcuts', { ns: 'common' })}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
            <div className="space-y-6 pr-4">
              {shortcuts.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {category.category}
                  </h3>
                  <div className="space-y-1.5">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors"
                      >
                        <span className="text-sm text-foreground">
                          {item.description}
                        </span>
                        <kbd className="px-2.5 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm">
                          {item.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                  {categoryIndex < shortcuts.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

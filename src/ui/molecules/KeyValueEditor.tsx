import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../atoms/scroll-area';

interface KeyValueItem {
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  value?: string; // JSON string
  onChange: (value: string | undefined) => void;
  label?: string;
  placeholderKey?: string;
  placeholderValue?: string;
  helperText?: string;
  className?: string;
}

function parseJson(value: string): KeyValueItem[] {
  try {
    const parsed = JSON.parse(value);
    return Object.entries(parsed).map(([key, value]) => ({
      key,
      value: String(value),
    }));
  } catch {
    return [];
  }
}

/**
 * A generic key-value editor component for configurations, headers, env vars, etc.
 */
export function KeyValueEditor({
  value,
  onChange,
  label,
  placeholderKey,
  placeholderValue,
  helperText,
  className,
}: KeyValueEditorProps) {
  const { t } = useTranslation(['common', 'settings']);
  const [items, setItems] = useState<KeyValueItem[]>(parseJson(value ?? ''));

  const updateItems = (newItems: KeyValueItem[]) => {
    setItems(newItems);
    const validItems = newItems.filter((h) => h.key.trim() && h.value.trim());
    if (validItems.length > 0) {
      const resultObj = validItems.reduce(
        (acc, { key, value }) => {
          acc[key.trim()] = value.trim();
          return acc;
        },
        {} as Record<string, string>
      );
      onChange(JSON.stringify(resultObj));
    } else {
      onChange(undefined);
    }
  };

  const handleAdd = () => {
    updateItems([...items, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateItems(newItems);
  };

  const handleKeyChange = (index: number, key: string) => {
    const newItems = [...items];
    newItems[index].key = key;
    updateItems(newItems);
  };

  const handleValueChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index].value = value;
    updateItems(newItems);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label || t('settings:headersOptional')}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          className="h-8 px-2.5 text-xs hover:bg-muted"
        >
          <Plus className="mr-1.5 size-3.5" />
          {t('common:add')}
        </Button>
      </div>

      {items.length > 0 && (
        <ScrollArea className="h-[150px]">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 group animate-in fade-in slide-in-from-top-1 duration-200 my-2"
            >
              <div className="flex-1 grid grid-cols-2 gap-1">
                <Input
                  value={item.key}
                  onChange={(e) => handleKeyChange(index, e.target.value)}
                  placeholder={
                    placeholderKey || t('settings:headerKeyPlaceholder')
                  }
                  className="h-9 text-sm bg-background/50"
                  aria-label="key"
                />
                <Input
                  value={item.value}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  placeholder={
                    placeholderValue || t('settings:headerValuePlaceholder')
                  }
                  className="h-9 text-sm bg-background/50"
                  aria-label="value"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="h-9 w-9 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-destructive/5 hover:bg-destructive/10"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      )}

      {helperText && (
        <p className="text-[11px] text-muted-foreground italic px-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
}

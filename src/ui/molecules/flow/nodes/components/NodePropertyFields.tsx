import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Switch } from '@/ui/atoms/switch';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { Button } from '@/ui/atoms/button';
import { Plus, X } from 'lucide-react';
import { type PropertyType } from '../utils';

// --- Tags Field Component ---
export interface TagsFieldProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
}

export const TagsField = ({
  label,
  tags = [],
  onChange,
  readOnly,
}: TagsFieldProps) => {
  const { t } = useTranslation(['flow']);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim()) {
      onChange([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
            {tags.map((tag, index) => (
              <div
                key={`${tag}-${index}`}
                className="flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
              >
                <span>{tag}</span>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onChange(tags.filter((_, i) => i !== index))}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!readOnly && (
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={t('addTagPlaceholder')}
              className="h-8 text-xs"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Schema Field Component ---
export interface SchemaFieldProps {
  label: string;
  schema: { title: string; type: string }[];
  onChange: (schema: { title: string; type: string }[]) => void;
  readOnly?: boolean;
}

export const SchemaField = ({
  label,
  schema = [],
  onChange,
  readOnly,
}: SchemaFieldProps) => {
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('string');

  const handleAddEntry = () => {
    if (newTitle.trim() && newType.trim()) {
      onChange([...schema, { title: newTitle.trim(), type: newType.trim() }]);
      setNewTitle('');
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-[13px] font-semibold text-foreground/80 ml-1">
        {label}
      </Label>
      <div className="border border-border/60 rounded-lg overflow-hidden bg-background/50 shadow-sm">
        <div className="p-3 space-y-3">
          {schema.length > 0 && (
            <div className="space-y-2">
              {schema.map((entry, index) => (
                <div
                  key={`${entry.title}-${index}`}
                  className="flex items-center gap-2 group animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  <Input
                    value={entry.title}
                    readOnly={readOnly}
                    onChange={(e) => {
                      const newSchema = [...schema];
                      newSchema[index] = { ...entry, title: e.target.value };
                      onChange(newSchema);
                    }}
                    placeholder="Field name"
                    className="h-9 text-xs flex-1 bg-background border-border/40 focus:border-primary/50 transition-[border-color] rounded-md"
                  />
                  <Input
                    value={entry.type}
                    readOnly={readOnly}
                    onChange={(e) => {
                      const newSchema = [...schema];
                      newSchema[index] = { ...entry, type: e.target.value };
                      onChange(newSchema);
                    }}
                    placeholder="Type"
                    className="h-9 text-xs w-28 bg-background border-border/40 focus:border-primary/50 transition-[border-color] rounded-md"
                  />
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() =>
                        onChange(schema.filter((_, i) => i !== index))
                      }
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-[background-color,color] shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly && (
            <>
              {schema.length > 0 && (
                <div className="border-t border-border/40 my-3" />
              )}
              <div className="flex gap-2 items-center">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                  className="h-9 text-xs flex-1 border-border/40 bg-muted/20 focus:bg-background transition-[background-color,border-color] rounded-md"
                />
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-9 text-xs w-28 border-border/40 bg-muted/20 focus:bg-background transition-[background-color,border-color] rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="uuid">UUID</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0 shadow-sm hover:shadow transition-[background-color,box-shadow] bg-secondary/80 hover:bg-secondary"
                  onClick={handleAddEntry}
                  disabled={!newTitle.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {schema.length === 0 && readOnly && (
            <div className="text-xs text-muted-foreground text-center py-4 italic">
              No schema defined
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Property Field Component ---
export interface PropertyFieldProps {
  propertyKey: string;
  value: unknown;
  type: PropertyType;
  onChange: (key: string, value: unknown) => void;
  readOnly?: boolean;
}

export const PropertyField = ({
  propertyKey,
  value,
  type,
  onChange,
  readOnly,
}: PropertyFieldProps) => {
  const { t } = useTranslation(['flow', 'common']);

  const translatedLabel = t(`propertyLabels.${propertyKey}`, {
    defaultValue: '',
  });

  const label =
    translatedLabel ||
    propertyKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();

  // Special handling for common property keys
  if (
    propertyKey === 'backgroundColor' ||
    propertyKey === 'textColor' ||
    propertyKey === 'borderColor'
  ) {
    const defaultColor =
      propertyKey === 'backgroundColor' ? '#ffffff' : '#000000';
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={`prop-${propertyKey}`}
            type="color"
            value={(value as string) || defaultColor}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            className="h-9 w-12 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            placeholder={defaultColor}
            className="flex-1 font-mono text-xs h-9"
          />
        </div>
      </div>
    );
  }

  if (propertyKey === 'variant') {
    const variants = ['default', 'primary', 'danger', 'success', 'warning'];
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <Select
          value={(value as string) || 'default'}
          onValueChange={(newValue) => onChange(propertyKey, newValue)}
          disabled={readOnly}
        >
          <SelectTrigger id={`prop-${propertyKey}`} className="w-full h-9">
            <SelectValue placeholder={t('selectVariant')} />
          </SelectTrigger>
          <SelectContent>
            {variants.map((v) => (
              <SelectItem key={v} value={v}>
                <span className="capitalize">{v}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (propertyKey === 'status') {
    const statuses = ['idle', 'running', 'error', 'success'];
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <Select
          value={(value as string) || 'idle'}
          onValueChange={(newValue) => onChange(propertyKey, newValue)}
          disabled={readOnly}
        >
          <SelectTrigger id={`prop-${propertyKey}`} className="w-full h-9">
            <SelectValue placeholder={t('selectStatus')} />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="capitalize">{s}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (propertyKey === 'handlePosition') {
    const positions = ['horizontal', 'vertical'];
    return (
      <div className="space-y-2">
        <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
        <Select
          value={(value as string) || 'horizontal'}
          onValueChange={(newValue) => onChange(propertyKey, newValue)}
          disabled={readOnly}
        >
          <SelectTrigger id={`prop-${propertyKey}`} className="w-full h-9">
            <SelectValue placeholder={t('selectPosition')} />
          </SelectTrigger>
          <SelectContent>
            {positions.map((p) => (
              <SelectItem key={p} value={p}>
                <span className="capitalize">{p}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (propertyKey === 'handles' && type === 'object') {
    const handles = (value as Record<string, unknown>) || {};
    const handleKeys = ['target', 'source', 'targetLabel', 'sourceLabel'];

    return (
      <div className="space-y-3">
        <Label>{label}</Label>
        <div className="space-y-3 border rounded-md p-3 bg-muted/30">
          {handleKeys.map((key) => {
            const handleValue = handles[key];
            const isBooleanField = key === 'target' || key === 'source';

            if (isBooleanField) {
              return (
                <div
                  key={key}
                  className="flex items-center justify-between space-x-2"
                >
                  <Label
                    htmlFor={`handle-${key}`}
                    className="text-xs cursor-pointer capitalize"
                  >
                    {t(`propertyLabels.${key}`, { defaultValue: key })}
                  </Label>
                  <Switch
                    id={`handle-${key}`}
                    checked={(handleValue as boolean) ?? true}
                    onCheckedChange={(checked) =>
                      onChange(propertyKey, { ...handles, [key]: checked })
                    }
                    disabled={readOnly}
                  />
                </div>
              );
            } else {
              return (
                <div key={key} className="space-y-1">
                  <Label
                    htmlFor={`handle-${key}`}
                    className="text-[10px] capitalize text-muted-foreground"
                  >
                    {t(`propertyLabels.${key}`, { defaultValue: key })}
                  </Label>
                  <Input
                    id={`handle-${key}`}
                    value={(handleValue as string) || ''}
                    onChange={(e) =>
                      onChange(propertyKey, {
                        ...handles,
                        [key]: e.target.value,
                      })
                    }
                    disabled={readOnly}
                    placeholder={t('enterHandle', { key })}
                    className="h-7 text-[10px]"
                  />
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }

  if (propertyKey === 'opacity') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor={`prop-${propertyKey}`}>{t('backgroundAlpha')}</Label>
          <span className="text-xs text-muted-foreground">
            {Math.round(((value as number) || 1) * 100)}%
          </span>
        </div>
        <input
          id={`prop-${propertyKey}`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={(value as number) ?? 1}
          onChange={(e) => onChange(propertyKey, parseFloat(e.target.value))}
          disabled={readOnly}
          className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
        />
      </div>
    );
  }

  // Generic fallback based on type
  switch (type) {
    case 'string':
      return (
        <div className="space-y-2">
          <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
          <Input
            id={`prop-${propertyKey}`}
            value={(value as string) || ''}
            onChange={(e) => onChange(propertyKey, e.target.value)}
            disabled={readOnly}
            placeholder={label}
            className="h-9"
          />
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
          <Input
            id={`prop-${propertyKey}`}
            type="number"
            value={(value as number) || 0}
            onChange={(e) => onChange(propertyKey, parseFloat(e.target.value))}
            disabled={readOnly}
            placeholder={label}
            className="h-9"
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between space-x-2">
          <Label
            htmlFor={`prop-${propertyKey}`}
            className="cursor-pointer text-sm"
          >
            {label}
          </Label>
          <Switch
            id={`prop-${propertyKey}`}
            checked={!!value}
            onCheckedChange={(checked) => onChange(propertyKey, checked)}
            disabled={readOnly}
          />
        </div>
      );

    case 'object':
      return (
        <div className="space-y-2">
          <Label htmlFor={`prop-${propertyKey}`}>{label}</Label>
          <Textarea
            id={`prop-${propertyKey}`}
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(propertyKey, parsed);
              } catch {
                // Ignore invalid JSON while typing
              }
            }}
            disabled={readOnly}
            placeholder={label}
            className="font-mono text-xs min-h-[100px]"
          />
          <p className="text-[10px] text-muted-foreground">
            {t('editJsonTip')}
          </p>
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <div className="text-sm text-muted-foreground italic">
            Unsupported: {String(value)}
          </div>
        </div>
      );
  }
};

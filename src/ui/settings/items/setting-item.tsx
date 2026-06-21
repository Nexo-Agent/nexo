import * as React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/ui/atoms/switch';

interface SettingItemBaseProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SettingLinkItem({
  label,
  value,
  icon,
  onClick,
  className,
  disabled,
}: SettingItemBaseProps & { value?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors',
        'hover:bg-accent/50 active:bg-accent',
        'border-b last:border-b-0 border-border/40',
        disabled && 'opacity-50',
        className
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <span className="font-medium truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground shrink-0 ml-4">
        {value && <span className="text-xs">{value}</span>}
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

export function SettingToggleItem({
  label,
  description,
  icon,
  checked,
  onCheckedChange,
  className,
  disabled,
}: SettingItemBaseProps & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3.5 py-2 text-sm',
        'border-b last:border-b-0 border-border/40',
        className
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden mr-4">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="font-medium truncate">{label}</span>
          {description && (
            <span className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </span>
          )}
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function SettingActionItem({
  label,
  icon,
  onClick,
  className,
  variant = 'default',
  disabled,
}: SettingItemBaseProps & {
  onClick?: () => void;
  variant?: 'default' | 'destructive';
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors text-left',
        'hover:bg-accent/50 active:bg-accent',
        'border-b last:border-b-0 border-border/40',
        variant === 'destructive' && 'text-destructive hover:bg-destructive/10',
        disabled && 'opacity-50',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'shrink-0',
            variant === 'destructive'
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}
        >
          {icon}
        </div>
      )}
      <span className="font-medium truncate">{label}</span>
    </button>
  );
}

export function SettingValueItem({
  label,
  value,
  icon,
  className,
}: SettingItemBaseProps & { value?: string }) {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between px-3.5 py-2.5 text-sm',
        'border-b last:border-b-0 border-border/40',
        className
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <span className="font-medium truncate text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-foreground font-medium shrink-0 ml-4 truncate max-w-[50%]">
        {value}
      </div>
    </div>
  );
}
export function SettingCheckItem({
  label,
  value,
  checked,
  onClick,
  className,
  disabled,
}: SettingItemBaseProps & {
  value?: string;
  checked?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3.5 py-2.5 text-sm transition-colors',
        'hover:bg-accent/50 active:bg-accent',
        'border-b last:border-b-0 border-border/40',
        disabled && 'opacity-50',
        className
      )}
    >
      <div className="flex flex-col gap-0.5 text-left overflow-hidden min-w-0 flex-1 mr-4">
        <span className={cn('font-medium truncate', checked && 'text-primary')}>
          {label}
        </span>
        {value && (
          <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {value}
          </span>
        )}
      </div>
      <div className="shrink-0 w-5 flex justify-end">
        {checked && <Check className="h-4 w-4 text-primary" />}
      </div>
    </button>
  );
}

export function SettingSelectItem({
  label,
  icon,
  children,
  className,
}: SettingItemBaseProps & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between px-3.5 py-2 text-sm',
        'border-b last:border-b-0 border-border/40',
        className
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden mr-4">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <span className="font-medium truncate">{label}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingInputItem({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  className,
  min,
  max,
}: SettingItemBaseProps & {
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div
      className={cn(
        'w-full flex items-center justify-between px-3.5 py-2 text-sm',
        'border-b last:border-b-0 border-border/40',
        className
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden mr-4">
        {icon && <div className="text-muted-foreground shrink-0">{icon}</div>}
        <span className="font-medium truncate">{label}</span>
      </div>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 h-7 text-right text-xs bg-accent/30 border border-border/40 rounded-md px-2 outline-none focus:ring-1 focus:ring-primary/30 transition-shadow"
      />
    </div>
  );
}

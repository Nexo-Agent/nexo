import { cn } from '../utils';

export type CodeBlockView = 'code' | 'preview';

type CodeBlockViewTabsProps = {
 value: CodeBlockView;
 onChange: (value: CodeBlockView) => void;
 previewDisabled?: boolean;
 codeLabel?: string;
 previewLabel?: string;
};

export function CodeBlockViewTabs({
 value,
 onChange,
 previewDisabled = false,
 codeLabel = 'Code',
 previewLabel = 'Preview',
}: CodeBlockViewTabsProps) {
 return (
 <div
 className="flex rounded-md bg-muted/35 p-0.5"
 data-streamdown="code-block-view-tabs"
 role="tablist"
 aria-label="Code block view"
 >
 <button
 type="button"
 role="tab"
 aria-selected={value === 'code'}
 className={cn(
 'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
 value === 'code'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground'
 )}
 onClick={() => onChange('code')}
 >
 {codeLabel}
 </button>
 <button
 type="button"
 role="tab"
 aria-selected={value === 'preview'}
 disabled={previewDisabled}
 className={cn(
 'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
 value === 'preview'
 ? 'bg-background text-foreground shadow-sm'
 : 'text-muted-foreground hover:text-foreground',
          previewDisabled && 'opacity-40'
 )}
 onClick={() => {
 if (!previewDisabled) onChange('preview');
 }}
 >
 {previewLabel}
 </button>
 </div>
 );
}

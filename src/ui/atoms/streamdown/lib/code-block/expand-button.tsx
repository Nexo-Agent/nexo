type CodeBlockExpandButtonProps = {
  expanded: boolean;
  hiddenLineCount: number;
  onToggle: () => void;
};

export function CodeBlockExpandButton({
  expanded,
  hiddenLineCount,
  onToggle,
}: CodeBlockExpandButtonProps) {
  return (
    <div className="border-t border-border/35 px-3 py-2">
      <button
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={onToggle}
        type="button"
      >
        {expanded
          ? 'View less'
          : `View more${hiddenLineCount > 0 ? ` (${hiddenLineCount} more lines)` : ''}`}
      </button>
    </div>
  );
}

const DEFAULT_VISIBLE_LINE_COUNT = 10;

export type TruncatedCodeState = {
  collapsedCode: string;
  hasOverflow: boolean;
  lineCount: number;
  visibleLineCount: number;
};

export function getTruncatedCodeState(
  code: string,
  visibleLineCount = DEFAULT_VISIBLE_LINE_COUNT
): TruncatedCodeState {
  const lines = code.split('\n');
  const lineCount = lines.length;
  const hasOverflow = lineCount > visibleLineCount;

  return {
    collapsedCode: hasOverflow
      ? lines.slice(0, visibleLineCount).join('\n')
      : code,
    hasOverflow,
    lineCount,
    visibleLineCount,
  };
}

export { DEFAULT_VISIBLE_LINE_COUNT };

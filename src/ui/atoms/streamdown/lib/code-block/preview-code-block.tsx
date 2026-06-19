// @ts-nocheck
import { useState, type ReactNode } from 'react';
import { CodeBlockBody } from './body';
import { CodeBlockContainer } from './container';
import { CodeBlockContext } from './context';
import { CodeBlockHeader } from './header';
import { CodeBlockCopyButton } from './copy-button';
import { useHighlightedCode } from './use-highlighted-code';
import { CodeBlockViewTabs, type CodeBlockView } from './view-tabs';

type PreviewCodeBlockProps = {
  code: string;
  language: string;
  preview: ReactNode;
  previewAvailable?: boolean;
  previewLoading?: ReactNode;
  previewHeaderActions?: ReactNode;
  headerActions?: ReactNode;
  codeLabel?: string;
  previewLabel?: string;
  defaultView?: CodeBlockView;
};

export function PreviewCodeBlock({
  code,
  language,
  preview,
  previewAvailable = true,
  previewLoading,
  previewHeaderActions,
  headerActions,
  codeLabel,
  previewLabel,
  defaultView = 'code',
}: PreviewCodeBlockProps) {
  const [view, setView] = useState<CodeBlockView>(defaultView);
  const result = useHighlightedCode(code, language);
  const showPreview = view === 'preview';

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <CodeBlockContainer language={language}>
        <CodeBlockHeader
          language={language}
          leading={
            <CodeBlockViewTabs
              value={view}
              onChange={setView}
              previewDisabled={!previewAvailable}
              codeLabel={codeLabel}
              previewLabel={previewLabel}
            />
          }
        >
          {showPreview ? previewHeaderActions : null}
          <CodeBlockCopyButton />
          {headerActions}
        </CodeBlockHeader>

        {showPreview ? (
          <div
            className="border-t border-border/35 bg-background"
            data-streamdown="code-block-preview-pane"
          >
            {previewAvailable ? preview : previewLoading}
          </div>
        ) : (
          <CodeBlockBody language={language} result={result} />
        )}
      </CodeBlockContainer>
    </CodeBlockContext.Provider>
  );
}

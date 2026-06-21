// @ts-nocheck
import type { ComponentProps } from 'react';
import { cn } from '../utils';

type CodeBlockContainerProps = ComponentProps<'div'> & {
 language: string;
};

export const CodeBlockContainer = ({
 className,
 language,
 style,
 ...props
}: CodeBlockContainerProps) => (
 <div
 className={cn(
 'my-2 w-full overflow-hidden rounded-lg',
 'border border-border/60 bg-card/70 shadow-xs',
 'ring-1 ring-black/3 dark:border-border/50 dark:bg-card/30 dark:ring-white/5',
 className
 )}
 data-language={language}
 data-streamdown="code-block"
 style={{
 contentVisibility: 'auto',
 containIntrinsicSize: 'auto 200px',
 ...style,
 }}
 {...props}
 />
);

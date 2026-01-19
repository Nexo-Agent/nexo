import { useAppDispatch } from '@/app/hooks';
import { setImagePreviewOpen } from '@/features/ui/state/uiSlice';
import { cn } from '@/lib/utils';

import type { DetailedHTMLProps, ImgHTMLAttributes } from 'react';

type MarkdownImageProps = DetailedHTMLProps<
  ImgHTMLAttributes<HTMLImageElement>,
  HTMLImageElement
>;

export function MarkdownImage({
  src,
  alt,
  className,
  ...props
}: MarkdownImageProps) {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    if (src) {
      dispatch(
        setImagePreviewOpen({
          open: true,
          url: src,
        })
      );
    }
  };

  if (!src) return null;

  return (
    <span className="inline-block my-2">
      <img
        src={src}
        alt={alt || ''}
        className={cn(
          'max-w-full rounded-lg cursor-zoom-in hover:opacity-90 transition-opacity shadow-sm border border-border/40',
          className
        )}
        onClick={handleClick}
        loading="lazy"
        {...props}
      />
    </span>
  );
}

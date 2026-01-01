// @ts-nocheck
import type { ComponentProps } from 'react';
import { cn } from '../utils';
import { TableCopyDropdown } from './copy-dropdown';
import { TableDownloadDropdown } from './download-dropdown';

type TableProps = ComponentProps<'table'> & {
  showControls?: boolean;
};

export const Table = ({
  children,
  className,
  showControls,
  ...props
}: TableProps) => (
  <div className="my-4 flex flex-col space-y-2" data-streamdown="table-wrapper">
    {showControls ? (
      <div className="flex items-center justify-end gap-1">
        <TableCopyDropdown />
        <TableDownloadDropdown />
      </div>
    ) : null}
    <div
      className="overflow-x-auto scroll-smooth -mx-1 px-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      <table
        className={cn(
          'min-w-full border-collapse border border-border',
          className
        )}
        style={{ tableLayout: 'auto' }} // Auto layout for better column distribution
        data-streamdown="table"
        {...props}
      >
        {children}
      </table>
    </div>
  </div>
);

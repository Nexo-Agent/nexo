import React, { useState } from 'react';
import { RefreshCw, Search, LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/ui/atoms/card';
import { EmptyState } from '@/ui/atoms/empty-state';
import { ScrollArea } from '@/ui/atoms/scroll-area';

interface HubCommunitySectionProps<T> {
  data: T[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  onRetry: () => void;
  searchPlaceholder: string;
  renderItem: (item: T) => React.ReactNode;
  filterFn: (item: T, query: string) => boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  noResultsText: string;
}

function HubCommunitySectionInner<T>({
  data,
  loading,
  refreshing,
  error,
  onRefresh,
  onRetry,
  searchPlaceholder,
  renderItem,
  filterFn,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  noResultsText,
}: HubCommunitySectionProps<T>) {
  const { t } = useTranslation('settings');
  const [searchQuery, setSearchQuery] = useState('');

  // Rule: js-early-exit - Defer value update to prioritize input responsiveness
  const deferredQuery = React.useDeferredValue(searchQuery);

  // Rule: rerender-memo - Memoize expensive filter operation
  const filteredData = React.useMemo(() => {
    return data.filter((item) => filterFn(item, deferredQuery));
  }, [data, filterFn, deferredQuery]);

  if (loading && data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={searchPlaceholder} className="pl-9" disabled />
          </div>
          <Button disabled size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            {t('refresh', { defaultValue: 'Refresh' })}
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6"
            style={{ contentVisibility: 'auto' }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="flex flex-col h-full animate-pulse">
                <CardHeader className="flex-row items-center gap-3 pb-3 space-y-0">
                  <div className="size-10 rounded-md bg-muted" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="h-9 bg-muted rounded w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={onRetry} size="sm" variant="outline">
          {t('retry', { ns: 'common', defaultValue: 'Retry' })}
        </Button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={onRefresh}
          disabled={refreshing || loading}
          size="sm"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          {t('refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">{noResultsText}</p>
          </div>
        ) : (
          <div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6"
            style={{ contentVisibility: 'auto' }}
          >
            {filteredData.map(renderItem)}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export const HubCommunitySection = React.memo(
  HubCommunitySectionInner
) as typeof HubCommunitySectionInner;

import { UsageStat } from '@/models/usage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/atoms/table';
import { Button } from '@/ui/atoms/button';
import { ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/atoms/card';

interface UsageLogsProps {
  logs: UsageStat[];
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  hasMore: boolean;
  loading?: boolean;
}

const SkeletonRow = () => (
  <TableRow>
    <TableCell>
      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-28 bg-muted animate-pulse rounded" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
    </TableCell>
    <TableCell>
      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
    </TableCell>
  </TableRow>
);

export function UsageLogs({
  logs,
  page,
  limit,
  onPageChange,
  hasMore,
  loading,
}: UsageLogsProps) {
  return (
    <Card className="relative overflow-hidden border-none ring-1 ring-border shadow-md bg-gradient-to-br from-background via-background to-muted/20">
      <div className="absolute top-0 right-0 w-64 h-64 bg-chart-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      <CardHeader className="relative z-10 pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-chart-blue to-chart-cyan shadow-sm shadow-chart-blue/20">
            <Database className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Request Logs
            </span>
            <span className="text-xs font-medium text-muted-foreground/80">
              Detailed history of all API requests
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-lg overflow-hidden border-t">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Timestamp</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(
                        new Date(log.timestamp * 1000),
                        'MMM d, HH:mm:ss'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{log.model}</span>
                        <span className="text-xs text-muted-foreground">
                          {log.provider}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5 font-mono text-xs tabular-nums">
                        <span className="text-chart-emerald font-medium">
                          ↓ {log.input_tokens.toLocaleString()}
                        </span>
                        <span className="text-chart-indigo font-medium">
                          ↑ {log.output_tokens.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      {log.latency_ms}
                      <span className="text-xs text-muted-foreground ml-0.5">
                        {' '}
                        ms
                      </span>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums">
                      ${log.cost.toFixed(5)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${
                          log.status === 'success'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 rounded-full bg-muted/50">
                        <Database className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        No logs found
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
          <p className="text-sm text-muted-foreground">
            Page {page} • {logs.length} {logs.length === 1 ? 'item' : 'items'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={(!hasMore && logs.length < limit) || loading}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

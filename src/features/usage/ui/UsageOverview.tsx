import { UsageSummary } from '@/models/usage';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/atoms/card';
import { Activity, Coins, MessageSquare, Zap } from 'lucide-react';

interface UsageOverviewProps {
  summary: UsageSummary;
  loading?: boolean;
}

const SkeletonCard = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      <div className="h-4 w-4 bg-muted animate-pulse rounded" />
    </CardHeader>
    <CardContent>
      <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
      <div className="h-3 w-20 bg-muted animate-pulse rounded" />
    </CardContent>
  </Card>
);

export function UsageOverview({ summary, loading }: UsageOverviewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="relative overflow-hidden border-none ring-1 ring-border shadow-md bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-chart-amber/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-chart-amber/20 transition-colors" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cost
          </CardTitle>
          <div className="p-2 rounded-lg bg-chart-amber/10 text-chart-amber group-hover:scale-110 transition-transform duration-300">
            <Coins className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 4,
            }).format(summary.total_cost)}
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-none ring-1 ring-border shadow-md bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-chart-violet/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-chart-violet/20 transition-colors" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Tokens
          </CardTitle>
          <div className="p-2 rounded-lg bg-chart-violet/10 text-chart-violet group-hover:scale-110 transition-transform duration-300">
            <Zap className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {(
              summary.total_input_tokens + summary.total_output_tokens
            ).toLocaleString()}
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-2 flex gap-3">
            <span className="flex items-center gap-1 text-chart-emerald font-medium">
              <span className="text-[10px]">IN</span>
              {summary.total_input_tokens.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-chart-indigo font-medium">
              <span className="text-[10px]">OUT</span>
              {summary.total_output_tokens.toLocaleString()}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-none ring-1 ring-border shadow-md bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-chart-blue/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-chart-blue/20 transition-colors" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Requests
          </CardTitle>
          <div className="p-2 rounded-lg bg-chart-blue/10 text-chart-blue group-hover:scale-110 transition-transform duration-300">
            <MessageSquare className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {summary.total_requests.toLocaleString()}
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-none ring-1 ring-border shadow-md bg-gradient-to-br from-background to-muted/20 hover:shadow-lg transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-chart-emerald/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-chart-emerald/20 transition-colors" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg Latency
          </CardTitle>
          <div className="p-2 rounded-lg bg-chart-emerald/10 text-chart-emerald group-hover:scale-110 transition-transform duration-300">
            <Activity className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {summary.average_latency.toFixed(0)}
            <span className="text-sm font-medium text-muted-foreground ml-1">
              ms
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

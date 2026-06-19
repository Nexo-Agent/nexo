import { UsageSummary } from '@/models/usage';
import { Card, CardContent } from '@/ui/atoms/card';
import { Activity, MessageSquare, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

interface UsageOverviewProps {
  summary: UsageSummary | null;
  loading?: boolean;
}

const SkeletonCard = () => (
  <Card className="border border-border shadow-sm">
    <CardContent className="pt-5 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3.5 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
      </div>
      <div className="h-8 w-28 bg-muted animate-pulse rounded mb-2" />
      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
    </CardContent>
  </Card>
);

const EMPTY_SUMMARY: UsageSummary = {
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_cost: 0,
  total_requests: 0,
  average_latency: 0,
};

function StatCard({
  label,
  icon,
  value,
  sub,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  sub?: ReactNode;
}) {
  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          {icon}
        </div>
        <div className="text-3xl tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        {sub && <div className="mt-2">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function UsageOverview({ summary, loading }: UsageOverviewProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const data = summary ?? EMPTY_SUMMARY;
  const totalTokens = data.total_input_tokens + data.total_output_tokens;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Total Tokens"
        icon={<Zap className="h-4 w-4 text-muted-foreground" />}
        value={totalTokens.toLocaleString()}
        sub={
          <p className="text-xs text-muted-foreground flex gap-3">
            <span className="flex items-center gap-1 text-chart-emerald font-medium">
              <span className="text-[10px] uppercase">In</span>
              {data.total_input_tokens.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-chart-violet font-medium">
              <span className="text-[10px] uppercase">Out</span>
              {data.total_output_tokens.toLocaleString()}
            </span>
          </p>
        }
      />

      <StatCard
        label="Total Requests"
        icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
        value={data.total_requests.toLocaleString()}
      />

      <StatCard
        label="Avg Latency"
        icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        value={`${data.average_latency.toFixed(0)}ms`}
      />
    </div>
  );
}
